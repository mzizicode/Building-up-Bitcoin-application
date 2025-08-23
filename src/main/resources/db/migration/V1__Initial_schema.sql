-- ================================================================
-- INITIAL SCHEMA CREATION
-- Version: V1
-- Description: Create base tables for Photo Lottery application
-- ================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
                                     id BIGSERIAL PRIMARY KEY,
                                     email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    phone_number VARCHAR(20),
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    verification_token_expiry TIMESTAMP,
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP
    );

-- Photos table (UPDATED with all necessary columns)
CREATE TABLE IF NOT EXISTS photos (
                                      id BIGSERIAL PRIMARY KEY,
                                      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    s3url VARCHAR(500) NOT NULL,  -- Matches @Column(name = "s3url") in Photo.java
    upload_date TIMESTAMP DEFAULT NOW(),
    description TEXT,
    location VARCHAR(255),
    size BIGINT,
    width INTEGER,
    height INTEGER,
    status VARCHAR(50),
    s3_key VARCHAR(500),
    is_winner BOOLEAN DEFAULT false,
    lottery_date DATE
    );

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_status ON photos(status);
CREATE INDEX idx_photos_upload_date ON photos(upload_date DESC);
CREATE INDEX idx_photos_is_winner ON photos(is_winner);