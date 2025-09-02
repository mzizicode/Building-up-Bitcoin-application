-- ================================================================
-- AI PRIZE IMAGE ENHANCEMENT
-- Version: V9
-- Description: Add AI-generated descriptions and prize image support
-- ================================================================

-- Add AI description field for storing AI-generated descriptions
ALTER TABLE photos
    ADD COLUMN IF NOT EXISTS ai_description VARCHAR(500);

-- Add flag to identify lottery prize images
ALTER TABLE photos
    ADD COLUMN IF NOT EXISTS is_prize_image BOOLEAN DEFAULT FALSE;

-- Add category classification for prize images
ALTER TABLE photos
    ADD COLUMN IF NOT EXISTS prize_category VARCHAR(100);

-- Add reference to lottery_draws table for prize images
ALTER TABLE photos
    ADD COLUMN IF NOT EXISTS lottery_id BIGINT;

-- Create indexes for optimized query performance
CREATE INDEX IF NOT EXISTS idx_photos_prize_images
    ON photos(is_prize_image)
    WHERE is_prize_image = TRUE;

CREATE INDEX IF NOT EXISTS idx_photos_lottery_prizes
    ON photos(lottery_id, is_prize_image)
    WHERE is_prize_image = TRUE;

CREATE INDEX IF NOT EXISTS idx_photos_prize_category
    ON photos(prize_category, is_prize_image)
    WHERE is_prize_image = TRUE;

-- Additional index for AI descriptions search
CREATE INDEX IF NOT EXISTS idx_photos_ai_description
    ON photos(ai_description)
    WHERE ai_description IS NOT NULL;

-- Add column comments for documentation
COMMENT ON COLUMN photos.ai_description IS 'AI-generated description of the image content from OpenAI Vision API';
COMMENT ON COLUMN photos.is_prize_image IS 'Flag to identify lottery prize images uploaded by admins';
COMMENT ON COLUMN photos.prize_category IS 'Category of the prize (Electronics, Fashion, Sports, etc.)';
COMMENT ON COLUMN photos.lottery_id IS 'Associated lottery ID for prize images, references lottery_draws table';

-- Set default values for existing photos
UPDATE photos
SET is_prize_image = FALSE
WHERE is_prize_image IS NULL;

-- Create a tracking table for AI analysis history (optional but useful)
CREATE TABLE IF NOT EXISTS ai_analysis_log (
                                               id BIGSERIAL PRIMARY KEY,
                                               photo_id BIGINT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    ai_provider VARCHAR(50) DEFAULT 'openai',
    request_timestamp TIMESTAMP DEFAULT NOW(),
    response_time_ms INT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    ai_description_generated VARCHAR(500),
    confidence_score DECIMAL(3,2),
    api_tokens_used INT,
    created_at TIMESTAMP DEFAULT NOW()
    );

-- Create index for AI analysis log
CREATE INDEX IF NOT EXISTS idx_ai_analysis_photo ON ai_analysis_log(photo_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_timestamp ON ai_analysis_log(request_timestamp DESC);

-- Create view for prize images with AI descriptions
CREATE OR REPLACE VIEW prize_images_view AS
SELECT
    p.id,
    p.file_name,
    p.s3url,
    p.description as manual_description,
    p.ai_description,
    p.prize_category,
    p.lottery_id,
    p.upload_date,
    u.full_name as uploaded_by,
    u.email as uploader_email,
    CASE
        WHEN p.ai_description IS NOT NULL THEN TRUE
        ELSE FALSE
        END as has_ai_description
FROM photos p
         LEFT JOIN users u ON p.user_id = u.id
WHERE p.is_prize_image = TRUE
ORDER BY p.upload_date DESC;

-- Create function to get prize image statistics
CREATE OR REPLACE FUNCTION get_prize_image_stats()
RETURNS TABLE (
    total_prize_images BIGINT,
    images_with_ai_description BIGINT,
    images_without_ai_description BIGINT,
    categories_count BIGINT,
    most_recent_upload TIMESTAMP
) AS $$
BEGIN
RETURN QUERY
SELECT
    COUNT(*) FILTER (WHERE is_prize_image = TRUE) as total_prize_images,
    COUNT(*) FILTER (WHERE is_prize_image = TRUE AND ai_description IS NOT NULL) as images_with_ai_description,
    COUNT(*) FILTER (WHERE is_prize_image = TRUE AND ai_description IS NULL) as images_without_ai_description,
    COUNT(DISTINCT prize_category) FILTER (WHERE is_prize_image = TRUE) as categories_count,
    MAX(upload_date) FILTER (WHERE is_prize_image = TRUE) as most_recent_upload
FROM photos;
END;
$$ LANGUAGE plpgsql;

-- Insert default prize categories (if needed)
CREATE TABLE IF NOT EXISTS prize_categories (
                                                id BIGSERIAL PRIMARY KEY,
                                                name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
    );

INSERT INTO prize_categories (name, description, display_order) VALUES
                                                                    ('Electronics', 'Phones, tablets, computers, and gadgets', 1),
                                                                    ('Fashion', 'Clothing, shoes, and accessories', 2),
                                                                    ('Sports & Outdoors', 'Sports equipment and outdoor gear', 3),
                                                                    ('Home & Garden', 'Home appliances and garden tools', 4),
                                                                    ('Books & Media', 'Books, movies, music, and games', 5),
                                                                    ('Gift Cards', 'Store and restaurant gift cards', 6),
                                                                    ('Experiences', 'Travel, events, and experiences', 7),
                                                                    ('Other', 'Miscellaneous prizes', 8)
    ON CONFLICT (name) DO NOTHING;

-- Grant appropriate permissions (adjust roles as needed)
-- GRANT SELECT ON prize_images_view TO app_user;
-- GRANT EXECUTE ON FUNCTION get_prize_image_stats() TO app_user;

-- Migration verification
DO $$
BEGIN
    -- Check if columns were added successfully
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'photos'
        AND column_name IN ('ai_description', 'is_prize_image', 'prize_category', 'lottery_id')
    ) THEN
        RAISE NOTICE 'SUCCESS: AI prize image fields migration completed successfully';
ELSE
        RAISE EXCEPTION 'Migration failed: Required columns not added to photos table';
END IF;
END $$;