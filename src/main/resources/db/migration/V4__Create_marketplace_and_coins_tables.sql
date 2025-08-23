-- ================================================================
-- MARKETPLACE SYSTEM
-- Version: V4
-- Description: Add marketplace tables
-- ================================================================

-- Marketplace categories
CREATE TABLE IF NOT EXISTS marketplace_categories (
                                                      id BIGSERIAL PRIMARY KEY,
                                                      name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    parent_id BIGINT REFERENCES marketplace_categories(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0
    );

-- Marketplace items
CREATE TABLE IF NOT EXISTS marketplace_items (
                                                 id BIGSERIAL PRIMARY KEY,
                                                 seller_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id BIGINT REFERENCES marketplace_categories(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(15,2) NOT NULL CHECK (price >= 0),
    original_price DECIMAL(15,2) CHECK (original_price >= 0),
    condition VARCHAR(20) DEFAULT 'NEW',
    quantity INT DEFAULT 1 CHECK (quantity >= 0),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    images JSON,
    tags TEXT[],
    location VARCHAR(200),
    is_negotiable BOOLEAN DEFAULT false,
    views_count INT DEFAULT 0,
    favorites_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
    );

-- Marketplace orders
CREATE TABLE IF NOT EXISTS marketplace_orders (
                                                  id BIGSERIAL PRIMARY KEY,
                                                  order_number VARCHAR(50) UNIQUE NOT NULL,
    buyer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    seller_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    item_id BIGINT NOT NULL REFERENCES marketplace_items(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(15,2) NOT NULL CHECK (unit_price >= 0),
    total_amount DECIMAL(15,2) NOT NULL CHECK (total_amount >= 0),
    service_fee DECIMAL(15,2) DEFAULT 0.00,
    escrow_amount DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'PENDING',
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    shipping_address TEXT,
    tracking_number VARCHAR(200),
    shipping_carrier VARCHAR(100),
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason VARCHAR(500),
    tracking_info JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
    );

-- Marketplace reviews
CREATE TABLE IF NOT EXISTS marketplace_reviews (
                                                   id BIGSERIAL PRIMARY KEY,
                                                   order_id BIGINT NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
    reviewer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    is_buyer_review BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
    );

-- Marketplace favorites
CREATE TABLE IF NOT EXISTS marketplace_favorites (
                                                     id BIGSERIAL PRIMARY KEY,
                                                     user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, item_id)
    );

-- User stores
CREATE TABLE IF NOT EXISTS user_stores (
                                           id BIGSERIAL PRIMARY KEY,
                                           user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_name VARCHAR(100) NOT NULL,
    store_description TEXT,
    store_logo VARCHAR(500),
    banner_image VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    total_sales DECIMAL(15,2) DEFAULT 0.00,
    total_orders INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
    );

-- Indexes for marketplace
CREATE INDEX idx_marketplace_items_seller ON marketplace_items(seller_id);
CREATE INDEX idx_marketplace_items_category ON marketplace_items(category_id);
CREATE INDEX idx_marketplace_items_status ON marketplace_items(status);
CREATE INDEX idx_marketplace_items_price ON marketplace_items(price);
CREATE INDEX idx_marketplace_orders_buyer ON marketplace_orders(buyer_id);
CREATE INDEX idx_marketplace_orders_seller ON marketplace_orders(seller_id);
CREATE INDEX idx_marketplace_orders_status ON marketplace_orders(status);
CREATE INDEX idx_marketplace_favorites_user ON marketplace_favorites(user_id);
CREATE INDEX idx_marketplace_favorites_item ON marketplace_favorites(item_id);