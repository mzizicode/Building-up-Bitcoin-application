-- ================================================================
-- LOTTERY SYSTEM TABLES
-- Version: V8
-- Description: Add lottery prizes and draws tables
-- ================================================================

-- Lottery prizes table
CREATE TABLE IF NOT EXISTS lottery_prizes (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500) NOT NULL,
    ai_description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Lottery draws table
CREATE TABLE IF NOT EXISTS lottery_draws (
    id BIGSERIAL PRIMARY KEY,
    winner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    winning_photo_id BIGINT REFERENCES photos(id) ON DELETE SET NULL,
    prize_id BIGINT REFERENCES lottery_prizes(id) ON DELETE SET NULL,
    draw_date TIMESTAMP NOT NULL DEFAULT NOW(),
    total_participants INT,
    is_current_winner BOOLEAN DEFAULT true,
    winner_coins_awarded INT DEFAULT 100,
    participant_coins_awarded INT DEFAULT 20,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add role column to users table for admin functionality
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'USER';

-- Update coin_transactions to support reference_id tracking
ALTER TABLE coin_transactions
    ADD COLUMN IF NOT EXISTS reference_id VARCHAR(255);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lottery_draws_winner ON lottery_draws(winner_user_id);
CREATE INDEX IF NOT EXISTS idx_lottery_draws_photo ON lottery_draws(winning_photo_id);
CREATE INDEX IF NOT EXISTS idx_lottery_draws_current ON lottery_draws(is_current_winner);
CREATE INDEX IF NOT EXISTS idx_lottery_draws_date ON lottery_draws(draw_date DESC);
CREATE INDEX IF NOT EXISTS idx_lottery_prizes_active ON lottery_prizes(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_lottery_prizes_order ON lottery_prizes(display_order ASC);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_reference ON coin_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Insert default admin user (optional - update credentials)
INSERT INTO users (email, password_hash, full_name, role, email_verified, is_active, created_at, updated_at)
VALUES (
    'admin@photolottery.com',
    '$2a$10$YourEncodedPasswordHere', -- Replace with encoded password
    'Admin User',
    'ADMIN',
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert sample lottery prizes (optional)
INSERT INTO lottery_prizes (name, description, image_url, ai_description, is_active, display_order, created_at, updated_at) VALUES
    ('iPhone 15 Pro', 'Latest Apple iPhone 15 Pro', 'https://example.com/iphone15.jpg', 'Sleek Black iPhone 15 Pro', true, 1, NOW(), NOW()),
    ('Nike Air Max', 'Premium Nike Running Shoes', 'https://example.com/nike.jpg', 'White Nike Air Max Sneakers', true, 2, NOW(), NOW()),
    ('Gaming Laptop', 'High-performance Gaming Laptop', 'https://example.com/laptop.jpg', 'Black Gaming Laptop', true, 3, NOW(), NOW()),
    ('Wireless Headphones', 'Premium Noise-Cancelling Headphones', 'https://example.com/headphones.jpg', 'Black Wireless Headphones', true, 4, NOW(), NOW()),
    ('Smart Watch', 'Advanced Fitness Smart Watch', 'https://example.com/watch.jpg', 'Silver Smart Watch', true, 5, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Update existing users to have USER role
UPDATE users SET role = 'USER' WHERE role IS NULL;

-- Create view for easy lottery statistics
CREATE OR REPLACE VIEW lottery_stats AS
SELECT
    COUNT(*) as total_draws,
    COUNT(DISTINCT winner_user_id) as unique_winners,
    AVG(total_participants) as avg_participants,
    SUM(total_participants) as total_participants_all_time,
    MAX(draw_date) as last_draw_date
FROM lottery_draws;

-- Create view for active lottery prizes
CREATE OR REPLACE VIEW active_lottery_prizes AS
SELECT
    id,
    name,
    description,
    image_url,
    ai_description,
    display_order
FROM lottery_prizes
WHERE is_active = true
ORDER BY display_order ASC;