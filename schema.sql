-- RubJob Database Schema (2026 Edition)
-- Target: Cloudflare D1 (SQLite)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS Users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('CUSTOMER', 'RUBBER', 'PARTNER')) NOT NULL,
    walletPin TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Partners (Laundry Shops / Specialists) Table
CREATE TABLE IF NOT EXISTS Partners (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    shop_name TEXT NOT NULL,
    address TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS Orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    rubber_id TEXT, -- Nullable until assigned
    partner_id TEXT, -- Nullable until assigned
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'PICKING_UP', 'PROCESSING', 'DELIVERING', 'COMPLETED', 'CANCELLED')),
    weight_kg REAL NOT NULL,
    distance_km REAL NOT NULL,
    total_price REAL NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES Users(id),
    FOREIGN KEY (rubber_id) REFERENCES Users(id),
    FOREIGN KEY (partner_id) REFERENCES Partners(id)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer ON Orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON Orders(status);
CREATE INDEX IF NOT EXISTS idx_partners_user ON Partners(user_id);
