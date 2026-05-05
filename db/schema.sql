-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin', -- super_admin, admin
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rider Users Table (Created exclusively by Admin)
CREATE TABLE IF NOT EXISTS rider_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  vehicleType TEXT, -- bike, car, truck
  status TEXT DEFAULT 'active', -- active, suspended
  address TEXT, -- Detailed address
  idNumber TEXT, -- National ID
  licensePlate TEXT, -- Vehicle plate number
  emergencyContact TEXT,
  rider_number INTEGER, -- Sequential ID counter
  bankName TEXT,
  accountNumber TEXT,
  accountName TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rider Documents Table
CREATE TABLE IF NOT EXISTS rider_documents (
  id TEXT PRIMARY KEY,
  riderId TEXT NOT NULL,
  type TEXT NOT NULL, -- id_card, license, insurance
  status TEXT DEFAULT 'pending', -- pending, verified, rejected
  url TEXT,
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (riderId) REFERENCES rider_users(id) ON DELETE CASCADE
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- LINE User ID
  displayName TEXT,
  pictureUrl TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user', -- user, store_admin, driver
  assignedStoreId TEXT, -- specifically for drivers to bind them to a store area
  points INTEGER DEFAULT 0,
  preferences TEXT, -- JSON holding activeHours, serviceArea, vehicleType, payoutMethod, etc.
  walletPin TEXT,
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
  phone TEXT,
  isActive INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active', -- active, pending, suspended
  bankName TEXT,
  accountNumber TEXT,
  accountName TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ownerId) REFERENCES users(id)
);

-- Store Documents Table
CREATE TABLE IF NOT EXISTS store_documents (
  id TEXT PRIMARY KEY,
  storeId TEXT NOT NULL,
  type TEXT NOT NULL, -- business_license, id_card, registration
  status TEXT DEFAULT 'pending', -- pending, verified, rejected
  url TEXT,
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
);

-- Specialists/Providers Table
CREATE TABLE IF NOT EXISTS specialist_profiles (
  id TEXT PRIMARY KEY, -- Linked to users.id
  bio TEXT,
  skills TEXT, -- JSON array of skill IDs
  status TEXT DEFAULT 'pending', -- pending, active, suspended
  bankName TEXT,
  accountNumber TEXT,
  accountName TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
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
  gpPercent REAL DEFAULT 15, -- Category/Service specific GP
  isActive INTEGER DEFAULT 1
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  orderType TEXT DEFAULT 'logistics', -- logistics, direct_service
  storeId TEXT, -- Nullable for direct_service
  providerId TEXT, -- ID from specialist_profiles, Nullable for logistics
  serviceId TEXT NOT NULL,
  status TEXT NOT NULL, -- pending, picking_up, delivering_to_store, washing, delivering_to_customer, completed, cancelled, accepted, in_progress
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
  evidenceBeforeUrl TEXT, -- Photo evidence before service
  evidenceAfterUrl TEXT, -- Photo evidence after service
  cancellationFee REAL DEFAULT 0,
  surgeMultiplier REAL DEFAULT 1.0,
  staffNote TEXT, -- Private note from staff
  serviceDetails TEXT, -- JSON for actual weights/durations after pickup
  rating INTEGER, -- 1-5 star rating
  review_text TEXT, -- Customer review text
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (storeId) REFERENCES stores(id),
  FOREIGN KEY (providerId) REFERENCES specialist_profiles(id),
  FOREIGN KEY (serviceId) REFERENCES services(id),
  FOREIGN KEY (pickupDriverId) REFERENCES rider_users(id),
  FOREIGN KEY (deliveryDriverId) REFERENCES rider_users(id)
);

-- Addresses Table
CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  label TEXT NOT NULL,
  details TEXT,
  note TEXT,
  lat REAL,
  lng REAL,
  isDefault INTEGER DEFAULT 0,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Initial Services Data
INSERT OR REPLACE INTO services (id, name, category, description, basePrice, unit, icon, estimatedDays, isActive) VALUES
('wash_fold', 'Wash & Fold', 'laundry', 'Everyday laundry, washed and neatly folded', 59, 'piece', 'wash_fold', 2, 1),
('dry_clean', 'Dry Clean', 'laundry', 'Premium care for delicate fabrics & suits', 129, 'piece', 'dry_clean', 3, 1),
('iron_only', 'Iron Only', 'laundry', 'Perfectly pressed, ready to wear', 39, 'piece', 'iron_only', 1, 1),
('wash_iron', 'Wash & Iron', 'laundry', 'Full service wash with professional pressing', 89, 'piece', 'wash_iron', 2, 1),
('home_cleaning', 'Home Cleaning', 'cleaning', 'Professional deep cleaning for your home', 500, 'session', 'home_cleaning', 1, 0),
('personal_assistant', 'Personal Assistant', 'personal', 'Secretarial tasks, errands, or just accompaniment', 300, 'hour', 'personal_assistant', 0, 0),
('companionship', 'Companionship', 'friend', 'Going to the doctor or sharing a meal together', 200, 'hour', 'companionship', 0, 0);

-- Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- percentage, fixed
  value REAL NOT NULL,
  minOrder REAL DEFAULT 0,
  maxDiscount REAL, -- for percentage type
  expiryDate TEXT,
  usageLimit INTEGER,
  usedCount INTEGER DEFAULT 0,
  isVisible INTEGER DEFAULT 1, -- Added: visibility control
  isActive INTEGER DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Store Services Junction Table
CREATE TABLE IF NOT EXISTS store_services (
  storeId TEXT NOT NULL,
  serviceId TEXT NOT NULL,
  price REAL, -- Added: store-specific pricing override
  PRIMARY KEY (storeId, serviceId),
  FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
);

-- Payout Requests Table
CREATE TABLE IF NOT EXISTS payout_requests (
  id TEXT PRIMARY KEY,
  requesterId TEXT NOT NULL,
  requesterType TEXT NOT NULL, -- 'store' or 'rider'
  amount REAL NOT NULL,
  bankName TEXT NOT NULL,
  accountNumber TEXT NOT NULL,
  accountName TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'
  receiptUrl TEXT,
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  processedAt DATETIME
);

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'regular_line', 'help_line', 'in_app'
  status TEXT DEFAULT 'open', -- 'open', 'pending', 'resolved', 'closed'
  subject TEXT,
  assignedAdminId TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Support Messages Table
CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  ticketId TEXT NOT NULL,
  senderType TEXT NOT NULL, -- 'user', 'admin'
  senderId TEXT NOT NULL, -- can be LINE userId or Admin email
  content TEXT NOT NULL,
  contentType TEXT DEFAULT 'text', -- 'text', 'image', 'file'
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticketId) REFERENCES support_tickets(id) ON DELETE CASCADE
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  type TEXT,
  description TEXT,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
