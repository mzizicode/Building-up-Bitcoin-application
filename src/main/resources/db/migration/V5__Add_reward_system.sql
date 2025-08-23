-- ================================================================
-- REWARD SYSTEM
-- Version: V5
-- Description: Add reward action tables
-- ================================================================

-- Reward actions configuration
CREATE TABLE IF NOT EXISTS reward_actions (
                                              id BIGSERIAL PRIMARY KEY,
                                              action_type VARCHAR(50) NOT NULL UNIQUE,
    coin_reward DECIMAL(15,2) NOT NULL CHECK (coin_reward >= 0),
    max_daily INT DEFAULT -1,
    max_total INT DEFAULT -1,
    is_active BOOLEAN DEFAULT true,
    description TEXT
    );

-- User reward history
CREATE TABLE IF NOT EXISTS user_reward_history (
                                                   id BIGSERIAL PRIMARY KEY,
                                                   user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    coins_earned DECIMAL(15,2) NOT NULL CHECK (coins_earned >= 0),
    reference_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
    );

-- Insert default reward actions
INSERT INTO reward_actions (action_type, coin_reward, description) VALUES
                                                                       ('PHOTO_UPLOAD', 25.00, 'Upload a photo to lottery'),
                                                                       ('DAILY_LOGIN', 10.00, 'Daily login bonus'),
                                                                       ('REFERRAL', 50.00, 'Refer a new user'),
                                                                       ('FIRST_PURCHASE', 100.00, 'Make first marketplace purchase'),
                                                                       ('WELCOME_BONUS', 100.00, 'New user welcome bonus')
    ON CONFLICT (action_type) DO NOTHING;

-- Indexes
CREATE INDEX idx_user_reward_history_user ON user_reward_history(user_id);
CREATE INDEX idx_user_reward_history_action ON user_reward_history(action_type);
CREATE INDEX idx_user_reward_history_created ON user_reward_history(created_at DESC);