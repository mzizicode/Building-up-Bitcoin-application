-- ================================================================
-- WALLET AND TRANSACTION SYSTEM
-- Version: V2
-- Description: Add wallet and coin transaction tables
-- ================================================================

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
                                       id BIGSERIAL PRIMARY KEY,
                                       user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(15,2) DEFAULT 0.00,
    pending_balance DECIMAL(15,2) DEFAULT 0.00,
    total_earned DECIMAL(15,2) DEFAULT 0.00,
    total_spent DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
    );

-- Coin transactions table
CREATE TABLE IF NOT EXISTS coin_transactions (
                                                 id BIGSERIAL PRIMARY KEY,
                                                 from_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    to_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    from_wallet_id BIGINT REFERENCES wallets(id) ON DELETE SET NULL,
    to_wallet_id BIGINT REFERENCES wallets(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    reference_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'COMPLETED',
    created_at TIMESTAMP DEFAULT NOW(),
    CHECK (amount > 0)
    );

-- Indexes
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_coin_transactions_from_user ON coin_transactions(from_user_id);
CREATE INDEX idx_coin_transactions_to_user ON coin_transactions(to_user_id);
CREATE INDEX idx_coin_transactions_type ON coin_transactions(type);
CREATE INDEX idx_coin_transactions_status ON coin_transactions(status);
CREATE INDEX idx_coin_transactions_created_at ON coin_transactions(created_at DESC);