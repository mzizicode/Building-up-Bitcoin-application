-- V7__Add_single_photo_constraints.sql (FIXED VERSION)
-- Migration to enforce single photo per user policy with cleanup

-- STEP 1: Clean up existing duplicates first
DO $$
DECLARE
duplicate_count INTEGER;
    updated_count INTEGER;
BEGIN
    -- Check for duplicates
SELECT COUNT(*) INTO duplicate_count
FROM (
         SELECT user_id, COUNT(*) as photo_count
         FROM photos
         WHERE status IN ('SUBMITTED', 'WINNER')
         GROUP BY user_id
         HAVING COUNT(*) > 1
     ) duplicates;

RAISE NOTICE 'Found % users with multiple active submissions', duplicate_count;

    -- Clean up duplicates: Keep newest, change older ones to APPROVED
UPDATE photos
SET status = 'APPROVED'
WHERE id IN (
    SELECT p1.id
    FROM photos p1
             INNER JOIN photos p2 ON p1.user_id = p2.user_id
    WHERE p1.status IN ('SUBMITTED', 'WINNER')
      AND p2.status IN ('SUBMITTED', 'WINNER')
      AND p1.id != p2.id
  AND p1.upload_date < p2.upload_date
    );

GET DIAGNOSTICS updated_count = ROW_COUNT;
RAISE NOTICE 'Updated % photos to APPROVED status', updated_count;
END $$;

-- STEP 2: Create indexes (skip if exists)
CREATE INDEX IF NOT EXISTS idx_photos_user_status ON photos(user_id, status);
CREATE INDEX IF NOT EXISTS idx_photos_user_upload_date ON photos(user_id, upload_date DESC);

-- STEP 3: Add check constraint (skip if exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_photo_status'
        AND table_name = 'photos'
    ) THEN
ALTER TABLE photos
    ADD CONSTRAINT chk_photo_status
        CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'WINNER'));
RAISE NOTICE 'Added check constraint';
END IF;
END $$;

-- STEP 4: Create unique index (after cleanup)
DROP INDEX IF EXISTS unique_active_submission_per_user;
CREATE UNIQUE INDEX unique_active_submission_per_user
    ON photos (user_id)
    WHERE status IN ('SUBMITTED', 'WINNER');

-- STEP 5: Create audit table (skip if exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'photo_audit') THEN
CREATE TABLE photo_audit (
                             id BIGSERIAL PRIMARY KEY,
                             photo_id BIGINT NOT NULL,
                             user_id BIGINT NOT NULL,
                             action VARCHAR(50) NOT NULL,
                             old_status VARCHAR(50),
                             new_status VARCHAR(50),
                             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                             notes TEXT,

                             FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
                             FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_photo_user ON photo_audit (photo_id, user_id);
CREATE INDEX idx_audit_created_at ON photo_audit (created_at);
RAISE NOTICE 'Created photo_audit table';
END IF;
END $$;

-- STEP 6: Create enforcement functions
CREATE OR REPLACE FUNCTION enforce_single_photo_per_user_insert()
RETURNS TRIGGER AS $$
DECLARE
active_count INTEGER;
BEGIN
    IF NEW.status IN ('SUBMITTED', 'WINNER') THEN
SELECT COUNT(*) INTO active_count
FROM photos
WHERE user_id = NEW.user_id
  AND status IN ('SUBMITTED', 'WINNER');

IF active_count > 0 THEN
            RAISE EXCEPTION 'User can only have one active photo submission';
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_single_photo_per_user_update()
RETURNS TRIGGER AS $$
DECLARE
active_count INTEGER;
BEGIN
    IF NEW.status IN ('SUBMITTED', 'WINNER') AND OLD.status NOT IN ('SUBMITTED', 'WINNER') THEN
SELECT COUNT(*) INTO active_count
FROM photos
WHERE user_id = NEW.user_id
  AND id != NEW.id
        AND status IN ('SUBMITTED', 'WINNER');

IF active_count > 0 THEN
            RAISE EXCEPTION 'User can only have one active photo submission';
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 7: Create triggers (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS enforce_single_photo_per_user_insert ON photos;
DROP TRIGGER IF EXISTS enforce_single_photo_per_user_update ON photos;

CREATE TRIGGER enforce_single_photo_per_user_insert
    BEFORE INSERT ON photos
    FOR EACH ROW
    EXECUTE FUNCTION enforce_single_photo_per_user_insert();

CREATE TRIGGER enforce_single_photo_per_user_update
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION enforce_single_photo_per_user_update();

-- STEP 8: Create audit functions
CREATE OR REPLACE FUNCTION photo_audit_insert()
RETURNS TRIGGER AS $$
BEGIN
INSERT INTO photo_audit (photo_id, user_id, action, new_status, notes)
VALUES (NEW.id, NEW.user_id, 'INSERT', NEW.status,
        CONCAT('Photo uploaded: ', COALESCE(NEW.description, 'No description')));
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION photo_audit_update()
RETURNS TRIGGER AS $$
BEGIN
INSERT INTO photo_audit (photo_id, user_id, action, old_status, new_status, notes)
VALUES (NEW.id, NEW.user_id, 'UPDATE', OLD.status, NEW.status,
        CONCAT('Status changed from ', OLD.status, ' to ', NEW.status));
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION photo_audit_delete()
RETURNS TRIGGER AS $$
BEGIN
INSERT INTO photo_audit (photo_id, user_id, action, old_status, notes)
VALUES (OLD.id, OLD.user_id, 'DELETE', OLD.status,
        CONCAT('Photo deleted: ', COALESCE(OLD.description, 'No description')));
RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- STEP 9: Create audit triggers
DROP TRIGGER IF EXISTS photo_audit_insert ON photos;
DROP TRIGGER IF EXISTS photo_audit_update ON photos;
DROP TRIGGER IF EXISTS photo_audit_delete ON photos;

CREATE TRIGGER photo_audit_insert
    AFTER INSERT ON photos
    FOR EACH ROW
    EXECUTE FUNCTION photo_audit_insert();

CREATE TRIGGER photo_audit_update
    AFTER UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION photo_audit_update();

CREATE TRIGGER photo_audit_delete
    BEFORE DELETE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION photo_audit_delete();

-- STEP 10: Create views (FIXED: use full_name not name)
DROP VIEW IF EXISTS active_photo_submissions;
CREATE VIEW active_photo_submissions AS
SELECT
    p.id,
    p.user_id,
    u.full_name as user_name,  -- FIXED: was u.name
    u.email as user_email,
    p.file_name,
    p.s3url,
    p.description,
    p.upload_date,
    p.status,
    p.size,
    CASE
        WHEN p.status = 'WINNER' THEN 1
        ELSE 0
        END as is_current_winner
FROM photos p
         JOIN users u ON p.user_id = u.id
WHERE p.status IN ('SUBMITTED', 'WINNER')
ORDER BY p.upload_date DESC;

-- STEP 11: Create utility function
CREATE OR REPLACE FUNCTION can_user_submit_photo(user_id_param BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
active_count INTEGER;
BEGIN
SELECT COUNT(*) INTO active_count
FROM photos
WHERE user_id = user_id_param
  AND status IN ('SUBMITTED', 'WINNER');

RETURN active_count = 0;
END;
$$ LANGUAGE plpgsql;

-- STEP 12: Create user stats view (FIXED: use full_name not name)
DROP VIEW IF EXISTS user_submission_stats;
CREATE VIEW user_submission_stats AS
SELECT
    u.id as user_id,
    u.full_name as user_name,  -- FIXED: was u.name
    u.email as user_email,
    COUNT(p.id) as total_photos,
    COUNT(CASE WHEN p.status IN ('SUBMITTED', 'WINNER') THEN 1 END) as active_photos,
    COUNT(CASE WHEN p.status = 'WINNER' THEN 1 END) as winning_photos,
    MAX(p.upload_date) as last_upload_date,
    CASE
        WHEN COUNT(CASE WHEN p.status IN ('SUBMITTED', 'WINNER') THEN 1 END) > 0 THEN TRUE
        ELSE FALSE
        END as has_active_submission,
    CASE
        WHEN COUNT(CASE WHEN p.status IN ('SUBMITTED', 'WINNER') THEN 1 END) = 0 THEN TRUE
        ELSE FALSE
        END as can_submit_new
FROM users u
         LEFT JOIN photos p ON u.id = p.user_id
GROUP BY u.id, u.full_name, u.email  -- FIXED: was u.name
ORDER BY u.full_name;  -- FIXED: was u.name

-- STEP 13: Final verification
DO $$
DECLARE
remaining_duplicates INTEGER;
BEGIN
SELECT COUNT(*) INTO remaining_duplicates
FROM (
         SELECT user_id, COUNT(*) as photo_count
         FROM photos
         WHERE status IN ('SUBMITTED', 'WINNER')
         GROUP BY user_id
         HAVING COUNT(*) > 1
     ) duplicates;

IF remaining_duplicates > 0 THEN
        RAISE EXCEPTION 'Migration failed: Still have % users with duplicate active submissions', remaining_duplicates;
ELSE
        RAISE NOTICE 'SUCCESS: Single photo constraint migration completed successfully';
END IF;
END $$;