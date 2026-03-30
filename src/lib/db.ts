/**
 * Cloudflare D1 Database Client
 * 
 * In a Next.js (Cloudflare Pages) environment, D1 bindings are available 
 * via the 'process.env' or 'getContext()' depending on the runtime.
 */

export interface Env {
  DB: D1Database;
}

// Helper to get DB from context in Edge Runtime
export function getDb(env: Env): D1Database {
  if (!env.DB) {
    throw new Error("D1 Database binding 'DB' not found. Check wrangler.toml.");
  }
  return env.DB;
}

// Types for DB Rows (Matching schema.sql)
export interface UserRow {
  id: string;
  displayName: string;
  pictureUrl: string;
  phone: string;
  role: string;
  points: number;
  createdAt: string;
}

export interface ServiceRow {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  unit: string;
  icon: string;
  estimatedDays: number;
  isActive: number;
}

export interface OrderRow {
  id: string;
  userId: string;
  serviceId: string;
  status: string;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: string;
  items: string; // JSON string
  address: string; // JSON string
  scheduledDate: string;
  createdAt: string;
  updatedAt: string;
}
