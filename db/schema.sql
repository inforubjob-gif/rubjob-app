-- RUBJOB Database Schema (Cloudflare D1)

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- LINE User ID
  displayName TEXT,
  pictureUrl TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user', -- user, store_admin, driver
  assignedStoreId TEXT, -- specifically for drivers to bind them to a store area
  points INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Stores Table
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  ownerId TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat REAL,
  lng REAL,
  serviceRadiusKm REAL DEFAULT 5,
  baseDeliveryFee REAL DEFAULT 0,
  extraFeePerKm REAL DEFAULT 10,
  isActive INTEGER DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ownerId) REFERENCES users(id)
);

-- Services Table (Master Data)
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  basePrice REAL NOT NULL,
  unit TEXT NOT NULL, -- piece, hour, session
  icon TEXT,
  estimatedDays INTEGER,
  isActive INTEGER DEFAULT 1
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  storeId TEXT NOT NULL,
  serviceId TEXT NOT NULL,
  status TEXT NOT NULL, -- pending, picking_up, delivering_to_store, washing, delivering_to_customer, completed, cancelled
  laundryFee REAL NOT NULL,
  deliveryFee REAL NOT NULL,
  distanceKm REAL,
  totalPrice REAL NOT NULL,
  paymentMethod TEXT NOT NULL,
  paymentStatus TEXT DEFAULT 'pending', -- pending, paid, failed, refunded
  items TEXT, -- JSON string of items/counts
  address TEXT, -- JSON string of address details
  scheduledDate TEXT,
  pickupDriverId TEXT, -- ID of the driver picking up
  deliveryDriverId TEXT, -- ID of the driver delivering
  staffNote TEXT, -- Private note from staff
  serviceDetails TEXT, -- JSON for actual weights/durations after pickup
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (storeId) REFERENCES stores(id),
  FOREIGN KEY (serviceId) REFERENCES services(id),
  FOREIGN KEY (pickupDriverId) REFERENCES users(id),
  FOREIGN KEY (deliveryDriverId) REFERENCES users(id)
);

-- Addresses Table
CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  label TEXT NOT NULL,
  details TEXT,
  lat REAL,
  lng REAL,
  isDefault INTEGER DEFAULT 0,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Initial Services Data
INSERT OR REPLACE INTO services (id, name, category, description, basePrice, unit, icon, estimatedDays) VALUES
('wash_fold', 'Wash & Fold', 'laundry', 'Everyday laundry, washed and neatly folded', 59, 'piece', 'wash_fold', 2),
('dry_clean', 'Dry Clean', 'laundry', 'Premium care for delicate fabrics & suits', 129, 'piece', 'dry_clean', 3),
('iron_only', 'Iron Only', 'laundry', 'Perfectly pressed, ready to wear', 39, 'piece', 'iron_only', 1),
('wash_iron', 'Wash & Iron', 'laundry', 'Full service wash with professional pressing', 89, 'piece', 'wash_iron', 2),
('home_cleaning', 'Home Cleaning', 'cleaning', 'Professional deep cleaning for your home', 500, 'session', 'home_cleaning', 1),
('personal_assistant', 'Personal Assistant', 'personal', 'Secretarial tasks, errands, or just accompaniment', 300, 'hour', 'personal_assistant', 0),
('companionship', 'Companionship', 'friend', 'Going to the doctor or sharing a meal together', 200, 'hour', 'companionship', 0);
