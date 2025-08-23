-- ================================================================
-- UPDATE PHOTOS TABLE
-- Version: V6
-- Description: Add missing columns to photos table
-- ================================================================

-- Add missing columns if they don't exist
ALTER TABLE photos
    ADD COLUMN IF NOT EXISTS location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS size BIGINT,
    ADD COLUMN IF NOT EXISTS width INTEGER,
    ADD COLUMN IF NOT EXISTS height INTEGER,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS s3_key VARCHAR(500),
    ADD COLUMN IF NOT EXISTS is_winner BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS lottery_date DATE;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status);
CREATE INDEX IF NOT EXISTS idx_photos_is_winner ON photos(is_winner);