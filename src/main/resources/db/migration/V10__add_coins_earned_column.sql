-- ================================================================
-- V10: Add coins_earned column to photos table
-- ================================================================

-- Step 1: Add column as nullable first
ALTER TABLE photos
    ADD COLUMN IF NOT EXISTS coins_earned INTEGER;

-- Step 2: Backfill existing rows with default value
UPDATE photos
SET coins_earned = 0
WHERE coins_earned IS NULL;

-- Step 3: Enforce NOT NULL and add default for future inserts
ALTER TABLE photos
    ALTER COLUMN coins_earned SET NOT NULL,
ALTER COLUMN coins_earned SET DEFAULT 0;

-- Verification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'photos' AND column_name = 'coins_earned'
    ) THEN
        RAISE EXCEPTION 'Migration failed: coins_earned column not created';
ELSE
        RAISE NOTICE 'SUCCESS: coins_earned column added and initialized';
END IF;
END $$;
