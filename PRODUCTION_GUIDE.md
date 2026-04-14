# RUBJOB Production Go-Live Guide

This guide outlines the critical steps to deploy the RUBJOB platform to Cloudflare Pages with D1 Database and LINE LIFF integration.

## 1. Environment Variable Checklist

Ensure the following variables are configured in your Cloudflare Pages Dashboard (Settings > Functions > Variables):

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_LIFF_ID` | Main Customer LIFF ID | `20067xxxxx-xxxxxx` |
| `NEXT_PUBLIC_LIFF_ID_STORE` | Store Partner LIFF ID | `20067xxxxx-xxxxxx` |
| `NEXT_PUBLIC_LIFF_ID_RIDER` | Rider Partner LIFF ID | `20067xxxxx-xxxxxx` |
| `LINE_CHANNEL_ID` | LINE Messaging API Channel ID | `1657xxxxxx` |
| `LINE_CHANNEL_SECRET` | LINE Messaging API Channel Secret | `xxxxxxxxxxxxxxxx` |
| `LINE_ACCESS_TOKEN` | Long-lived Channel Access Token | `xxxxxxxxxxxxxxxx` |
| `OMISE_PUBLIC_KEY` | Omise Payment Public Key | `pkey_test_xxxxxx` |
| `OMISE_SECRET_KEY` | Omise Payment Secret Key | `skey_test_xxxxxx` |

## 2. Database Initialization (Cloudflare D1)

Before the first deployment, you must initialize the database and migrate the schema.

1.  **Create Database**:
    ```bash
    npx wrangler d1 create rubjob-db
    ```
2.  **Initialize Schema**:
    Run the SQL migrations located in `db/schema.sql`:
    ```bash
    npx wrangler d1 execute rubjob-db --file=./db/schema.sql
    ```
3.  **Initialize Settings**:
    Run SQL to seed the essential platform configuration:
    ```sql
    INSERT INTO system_settings (key, value) VALUES ('is_open', 'true'), ('gp_store_percent', '20'), ('gp_rider_percent', '10');
    ```

## 3. LINE LIFF Configuration

Create 3 separate LIFF apps in the [LINE Developers Console](https://developers.line.biz/):

1.  **Customer App**: Endpoint `https://your-domain.com/` (Concise URL)
2.  **Store Portal**: Endpoint `https://your-domain.com/store`
3.  **Rider App**: Endpoint `https://your-domain.com/rider`

> [!IMPORTANT]
> **Scopes**: Ensure each LIFF app has `profile` and `openid` scopes enabled.

## 4. Omise Webhook Setup

Configure your [Omise Dashboard](https://dashboard.omise.co/) to point its webhooks to:
`https://your-domain.com/api/payment/webhook`

**Required Events**:
- `charge.complete`

## 5. Deployment Command

The project is optimized for `@cloudflare/next-on-pages`. Deployment is automatic when pushing to GitHub if linked to Cloudflare Pages.

- **Build Command**: `npx @cloudflare/next-on-pages` (Set this in CF Pages build settings)
- **Output Directory**: `.vercel/output/static`

---
## 6. Default Credentials (Testing)

After initializing the database, navigate to `/api/debug/init-accounts` to create 1 user per role.

| Role | Username / ID | Password | Access |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@rubjob.com` | `password123` | Login at `/admin` |
| **Customer** | `USER-001` | (Mock Only) | Root `/` |
| **Store Owner** | `STORE-OWNER-001` | (Mock Only) | `/store` |
| **Rider** | `RIDER-001` | (Mock Only) | `/rider` |

> [!TIP]
> **Mock Login**: In development mode, a small floating UI will appear on the bottom-right of the screen. Clicking a role will "Force Login" as that demo ID without needing a real LINE account.

---
**RUBJOB — Clean Code, Professional Laundry.**
