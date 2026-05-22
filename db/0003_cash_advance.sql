-- Migration: Cash Advance Wallet — ระบบต้นทุนซักจริงที่ Rubber จ่ายให้ร้านค้า
-- Created: 2026-05-22
-- Description: Admin ตั้งค่าตารางต้นทุน (Cost Matrix) ของแต่ละร้าน
--              Rubber เลือกเครื่องซัก/อบจาก matrix → ระบบล็อกยอดอัตโนมัติ
--              Admin settle จ่ายคืน Rubber

-- ====================================
-- ต้นทุนเครื่องซัก (Washer Costs)
-- ====================================
CREATE TABLE IF NOT EXISTS store_washer_costs (
  id TEXT PRIMARY KEY,
  storeId TEXT NOT NULL,
  sizeKg REAL NOT NULL,          -- ขนาด kg (9, 14, 18, 27, 28)
  sizeLabel TEXT,                 -- ชื่อ (Standard, Extra) สำหรับร้าน local
  priceCold REAL NOT NULL,        -- ราคาน้ำเย็น
  priceWarm REAL NOT NULL,        -- ราคาน้ำอุ่น
  priceHot REAL NOT NULL,         -- ราคาน้ำร้อน
  FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- ====================================
-- ต้นทุนเครื่องอบ (Dryer Costs)
-- ====================================
CREATE TABLE IF NOT EXISTS store_dryer_costs (
  id TEXT PRIMARY KEY,
  storeId TEXT NOT NULL,
  sizeKg REAL NOT NULL,           -- ขนาด kg (14, 15, 20, 25)
  sizeLabel TEXT,                  -- ชื่อ (Standard, Extra)
  price REAL NOT NULL,             -- ราคาต่อรอบ
  durationMinutes INTEGER,         -- จำนวนนาทีต่อรอบ
  extraPricePerMinute REAL,        -- ราคาต่อเวลา (ถ้ามี)
  FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- ====================================
-- บันทึกเงินสดที่ Rubber จ่าย (Cash Advances)
-- ====================================
CREATE TABLE IF NOT EXISTS cash_advances (
  id TEXT PRIMARY KEY,
  rubberId TEXT NOT NULL,
  orderId TEXT,
  storeId TEXT,
  storeName TEXT,
  -- เครื่องที่เลือก (snapshot)
  machineType TEXT NOT NULL,       -- 'washer' หรือ 'dryer'
  machineSizeKg REAL,
  waterTemp TEXT,                  -- 'cold', 'warm', 'hot' (เฉพาะ washer)
  amount REAL NOT NULL,            -- ยอดจาก cost matrix (แก้ไขไม่ได้แบบ free-form)
  costMatrixId TEXT,               -- reference ไป washer/dryer cost id
  note TEXT,
  status TEXT DEFAULT 'pending',   -- pending, settled, rejected
  settledAt DATETIME,
  settledBy TEXT,
  settlementNote TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rubberId) REFERENCES rubber_users(id),
  FOREIGN KEY (orderId) REFERENCES orders(id)
);

-- ====================================
-- Indexes for Performance
-- ====================================
CREATE INDEX IF NOT EXISTS idx_washer_costs_store ON store_washer_costs(storeId);
CREATE INDEX IF NOT EXISTS idx_dryer_costs_store ON store_dryer_costs(storeId);
CREATE INDEX IF NOT EXISTS idx_cash_advances_rubber ON cash_advances(rubberId);
CREATE INDEX IF NOT EXISTS idx_cash_advances_status ON cash_advances(status);
CREATE INDEX IF NOT EXISTS idx_cash_advances_date ON cash_advances(createdAt);
