/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  DB: D1Database;
  UPLOADS: R2Bucket;
  KV?: KVNamespace;
  R2?: R2Bucket;
  ADMIN_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  LINE_CHANNEL_SECRET?: string;
  LINE_CHANNEL_ACCESS_TOKEN_RUBBER?: string;
  LINE_CHANNEL_ACCESS_TOKEN_HELP?: string;
  LINE_CHANNEL_ACCESS_TOKEN_REGULAR?: string;
  LINE_ADMIN_GROUP_ID?: string;
}

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_LIFF_ID?: string;
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
    ADMIN_EMAIL?: string;
    ADMIN_PASSWORD?: string;
  }
}
