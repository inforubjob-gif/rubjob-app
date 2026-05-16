import { D1Database } from "@cloudflare/workers-types";

export async function ensureSchema(db: D1Database) {
  const schema = `
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'admin',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rubber_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      phone TEXT,
      vehicleType TEXT,
      status TEXT DEFAULT 'active',
      address TEXT,
      idNumber TEXT,
      licensePlate TEXT,
      emergencyContact TEXT,
      rubber_number INTEGER,
      bankName TEXT,
      accountNumber TEXT,
      accountName TEXT,
      pictureUrl TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rubber_documents (
      id TEXT PRIMARY KEY,
      rubberId TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      url TEXT,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rubberId) REFERENCES rubber_users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      displayName TEXT,
      pictureUrl TEXT,
      phone TEXT,
      role TEXT DEFAULT 'user',
      assignedStoreId TEXT,
      points INTEGER DEFAULT 0,
      preferences TEXT,
      walletPin TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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
      status TEXT DEFAULT 'active',
      bankName TEXT,
      accountNumber TEXT,
      accountName TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ownerId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS store_documents (
      id TEXT PRIMARY KEY,
      storeId TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      url TEXT,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS specialist_profiles (
      id TEXT PRIMARY KEY,
      bio TEXT,
      skills TEXT,
      status TEXT DEFAULT 'pending',
      bankName TEXT,
      accountNumber TEXT,
      accountName TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      basePrice REAL NOT NULL,
      unit TEXT NOT NULL,
      icon TEXT,
      estimatedDays INTEGER,
      gpPercent REAL DEFAULT 15,
      isActive INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      orderType TEXT DEFAULT 'logistics',
      storeId TEXT,
      providerId TEXT,
      serviceId TEXT NOT NULL,
      status TEXT NOT NULL,
      laundryFee REAL NOT NULL,
      deliveryFee REAL NOT NULL,
      distanceKm REAL,
      totalPrice REAL NOT NULL,
      paymentMethod TEXT NOT NULL,
      paymentStatus TEXT DEFAULT 'pending',
      items TEXT,
      address TEXT,
      scheduledDate TEXT,
      pickupDriverId TEXT,
      deliveryDriverId TEXT,
      evidenceBeforeUrl TEXT,
      evidenceAfterUrl TEXT,
      cancellationFee REAL DEFAULT 0,
      surgeMultiplier REAL DEFAULT 1.0,
      staffNote TEXT,
      customerNote TEXT,
      serviceDetails TEXT,
      rating INTEGER,
      review_text TEXT,
      storeRating INTEGER,
      storeReview TEXT,
      driverRating INTEGER,
      driverReview TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (storeId) REFERENCES stores(id),
      FOREIGN KEY (providerId) REFERENCES specialist_profiles(id),
      FOREIGN KEY (serviceId) REFERENCES services(id),
      FOREIGN KEY (pickupDriverId) REFERENCES rubber_users(id),
      FOREIGN KEY (deliveryDriverId) REFERENCES rubber_users(id)
    );

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

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      minOrder REAL DEFAULT 0,
      maxDiscount REAL,
      expiryDate TEXT,
      usageLimit INTEGER,
      usedCount INTEGER DEFAULT 0,
      isVisible INTEGER DEFAULT 1,
      isActive INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS store_services (
      storeId TEXT NOT NULL,
      serviceId TEXT NOT NULL,
      price REAL,
      PRIMARY KEY (storeId, serviceId),
      FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
      FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payout_requests (
      id TEXT PRIMARY KEY,
      requesterId TEXT NOT NULL,
      requesterType TEXT NOT NULL,
      amount REAL NOT NULL,
      bankName TEXT NOT NULL,
      accountNumber TEXT NOT NULL,
      accountName TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      receiptUrl TEXT,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      processedAt DATETIME
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      userType TEXT DEFAULT 'customer',
      orderId TEXT,
      channel TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      subject TEXT,
      assignedAdminId TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS support_messages (
      id TEXT PRIMARY KEY,
      ticketId TEXT NOT NULL,
      senderType TEXT NOT NULL,
      senderId TEXT NOT NULL,
      content TEXT NOT NULL,
      contentType TEXT DEFAULT 'text',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticketId) REFERENCES support_tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      type TEXT,
      description TEXT,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      ip_key TEXT NOT NULL,
      created_at DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS provider_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      phone TEXT DEFAULT '',
      pictureUrl TEXT DEFAULT '',
      lineUserId TEXT,
      skills TEXT DEFAULT '[]',
      pricing TEXT DEFAULT '{}',
      pricingUnit TEXT DEFAULT '{}',
      bio TEXT DEFAULT '',
      lineId TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS provider_services (
      id TEXT PRIMARY KEY,
      providerId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      price REAL,
      unit TEXT,
      icon TEXT DEFAULT 'Stars',
      packages TEXT DEFAULT '[]',
      isActive INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (providerId) REFERENCES provider_users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS provider_wallet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      providerId TEXT NOT NULL,
      orderId TEXT,
      amount REAL NOT NULL DEFAULT 0,
      type TEXT DEFAULT 'job_completion',
      status TEXT DEFAULT 'completed',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      userType TEXT DEFAULT 'rubber',
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      isRead INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS webhook_logs (
      id TEXT PRIMARY KEY,
      channel TEXT,
      payload TEXT,
      error TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS link_tokens (
      token TEXT PRIMARY KEY,
      accountId TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      userType TEXT NOT NULL DEFAULT 'rubber',
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Execute standard tables
  const statements = schema
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await db.prepare(statement).run();
    } catch (e) {
      console.error("DB Init Error in statement:", statement, e);
    }
  }

  // Ensure mandatory columns exist (for tables that might already exist but are missing columns)
  const migrations = [
     // --- rubber_users ---
     "ALTER TABLE rubber_users ADD COLUMN rubber_number INTEGER",
     "ALTER TABLE rubber_users ADD COLUMN pictureUrl TEXT",
     "ALTER TABLE rubber_users ADD COLUMN bankName TEXT",
     "ALTER TABLE rubber_users ADD COLUMN accountNumber TEXT",
     "ALTER TABLE rubber_users ADD COLUMN accountName TEXT",
     "ALTER TABLE rubber_users ADD COLUMN lineUserId TEXT",
     "ALTER TABLE rubber_users ADD COLUMN preferences TEXT",

     // --- orders ---
     "ALTER TABLE orders ADD COLUMN pickupPhotoUrl TEXT",
     "ALTER TABLE orders ADD COLUMN dropoffShopPhotoUrl TEXT",
     "ALTER TABLE orders ADD COLUMN arrivedAtShopAt DATETIME",
     "ALTER TABLE orders ADD COLUMN lastNotifiedAt DATETIME",
     "ALTER TABLE orders ADD COLUMN storeRating INTEGER",
     "ALTER TABLE orders ADD COLUMN storeReview TEXT",
     "ALTER TABLE orders ADD COLUMN driverRating INTEGER",
     "ALTER TABLE orders ADD COLUMN driverReview TEXT",
     "ALTER TABLE orders ADD COLUMN evidenceBeforeUrl TEXT",
     "ALTER TABLE orders ADD COLUMN evidenceAfterUrl TEXT",
     "ALTER TABLE orders ADD COLUMN serviceDetails TEXT",
     "ALTER TABLE orders ADD COLUMN cancellationFee REAL DEFAULT 0",
     "ALTER TABLE orders ADD COLUMN surgeMultiplier REAL DEFAULT 1.0",
     "ALTER TABLE orders ADD COLUMN staffNote TEXT",
     "ALTER TABLE orders ADD COLUMN rating INTEGER",
     "ALTER TABLE orders ADD COLUMN review_text TEXT",
     "ALTER TABLE orders ADD COLUMN providerId TEXT",
     "ALTER TABLE orders ADD COLUMN paymentStatus TEXT DEFAULT 'pending'",
     "ALTER TABLE orders ADD COLUMN orderType TEXT DEFAULT 'logistics'",
     "ALTER TABLE orders ADD COLUMN adminNotifiedDelay INTEGER DEFAULT 0",
     "ALTER TABLE orders ADD COLUMN customerNote TEXT",

     // --- admin_users ---
     "ALTER TABLE admin_users ADD COLUMN permissions TEXT",
     "ALTER TABLE admin_users ADD COLUMN avatarUrl TEXT",

     // --- stores ---
     "ALTER TABLE stores ADD COLUMN email TEXT",
     "ALTER TABLE stores ADD COLUMN password TEXT",
     "ALTER TABLE stores ADD COLUMN lineUserId TEXT",
     "ALTER TABLE stores ADD COLUMN status TEXT DEFAULT 'active'",
     "ALTER TABLE stores ADD COLUMN preferences TEXT",

     // --- coupons ---
     "ALTER TABLE coupons ADD COLUMN title TEXT",
     "ALTER TABLE coupons ADD COLUMN description TEXT",
     "ALTER TABLE coupons ADD COLUMN isVisible INTEGER DEFAULT 1",
     "ALTER TABLE coupons ADD COLUMN maxDiscount REAL",
     "ALTER TABLE coupons ADD COLUMN eligibleRoles TEXT DEFAULT 'all'",

     // --- support_tickets ---
     "ALTER TABLE support_tickets ADD COLUMN userType TEXT DEFAULT 'customer'",
     "ALTER TABLE support_tickets ADD COLUMN senderName TEXT",
     "ALTER TABLE support_tickets ADD COLUMN orderId TEXT",

     // --- addresses ---
     "ALTER TABLE addresses ADD COLUMN note TEXT",
     "ALTER TABLE addresses ADD COLUMN lat REAL",
     "ALTER TABLE addresses ADD COLUMN lng REAL",

     // --- users ---
     "ALTER TABLE users ADD COLUMN walletPin TEXT",
     "ALTER TABLE users ADD COLUMN preferences TEXT",

     // --- provider_users (schema drift fix) ---
     "ALTER TABLE provider_users ADD COLUMN name TEXT DEFAULT ''",
     "ALTER TABLE provider_users ADD COLUMN phone TEXT DEFAULT ''",
     "ALTER TABLE provider_users ADD COLUMN pictureUrl TEXT DEFAULT ''",
     "ALTER TABLE provider_users ADD COLUMN lineUserId TEXT",
     "ALTER TABLE provider_users ADD COLUMN skills TEXT DEFAULT '[]'",
     "ALTER TABLE provider_users ADD COLUMN pricing TEXT DEFAULT '{}'",
     "ALTER TABLE provider_users ADD COLUMN pricingUnit TEXT DEFAULT '{}'",
     "ALTER TABLE provider_users ADD COLUMN bio TEXT DEFAULT ''",
     "ALTER TABLE provider_users ADD COLUMN lineId TEXT DEFAULT ''",
     "ALTER TABLE provider_users ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP",

     // --- provider_services (schema drift fix) ---
     "ALTER TABLE provider_services ADD COLUMN price REAL",
     "ALTER TABLE provider_services ADD COLUMN unit TEXT",
     "ALTER TABLE provider_services ADD COLUMN icon TEXT DEFAULT 'Stars'",
     "ALTER TABLE provider_services ADD COLUMN packages TEXT DEFAULT '[]'",
  ];

  for (const migration of migrations) {
    try {
      await db.prepare(migration).run();
    } catch (e) {
      // Ignore errors (usually means column already exists)
    }
  }

  // Seed initial data if services table is empty
  const servicesCount = await db.prepare("SELECT COUNT(*) as count FROM services").first() as any;
  if (!servicesCount || servicesCount.count === 0) {
    await db.prepare(`
      INSERT OR REPLACE INTO services (id, name, category, description, basePrice, unit, icon, estimatedDays, isActive) VALUES
      ('wash_fold', 'Wash & Dry', 'laundry', 'Everyday laundry, washed and dried', 59, 'piece', 'wash_fold', 2, 1),
      ('dry_clean', 'Dry Clean', 'laundry', 'Premium care for delicate fabrics & suits', 129, 'piece', 'dry_clean', 3, 1),
      ('iron_only', 'Iron Only', 'laundry', 'Perfectly pressed, ready to wear', 39, 'piece', 'iron_only', 1, 1),
      ('wash_iron', 'Wash & Iron', 'laundry', 'Full service wash with professional pressing', 89, 'piece', 'wash_iron', 2, 1),
      ('home_cleaning', 'Home Cleaning', 'cleaning', 'Professional deep cleaning for your home', 500, 'session', 'home_cleaning', 1, 0),
      ('personal_assistant', 'Personal Assistant', 'personal', 'Secretarial tasks, errands, or just accompaniment', 300, 'hour', 'personal_assistant', 0, 0),
      ('companionship', 'Companionship', 'friend', 'Going to the doctor or sharing a meal together', 200, 'hour', 'companionship', 0, 0)
    `).run();
  }
}
