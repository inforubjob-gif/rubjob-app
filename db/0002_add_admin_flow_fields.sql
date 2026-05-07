-- Migration: Add fields for Admin-Centric Operational Flow
-- Updated: 2026-05-07

ALTER TABLE Orders ADD COLUMN pickupPhotoUrl TEXT;
ALTER TABLE Orders ADD COLUMN dropoffShopPhotoUrl TEXT;
ALTER TABLE Orders ADD COLUMN arrivedAtShopAt DATETIME;
ALTER TABLE Orders ADD COLUMN lastNotifiedAt DATETIME;
