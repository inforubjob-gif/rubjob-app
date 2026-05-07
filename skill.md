# RubJob — Project Context & AI Coding Guidelines

> **Version:** 2.1 | **Updated:** 2026-05-07
> This file is the single source of truth for all AI coding assistants working on the RubJob codebase.
> Read this file in full before writing any code, creating any component, or modifying any existing file.

---

## 1. Project Overview & Core Values

**RubJob** เป็นแพลตฟอร์ม On-Demand Service (เริ่มต้นจากบริการรับ-ส่งซักรีดในพื้นที่ขอนแก่น โซนกังสดาล) ที่วางตัวเป็น "Life Operator" ช่วยจัดการงานจุกจิกให้ผู้ใช้งานแบบ End-to-end ตามคอนเซปต์ **"เรื่องยุ่งยาก เรารับจบให้"**

**Core Values (RUBJOB):** Reliability · User Simplicity · Bridge Everything · Just Done · Ownership · Better Everyday

---

## 2. Core Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript — **Strict mode, no `any` ever** |
| Database | Cloudflare D1 (SQLite) |
| Styling | Tailwind CSS (custom token config) |
| Auth | LINE LIFF |
| Payment | Stripe |
| Messaging | LINE OA (Messaging API) |
| i18n | Custom `useTranslation` hook + locale files (`th.ts`, `en.ts`) |

---

## 3. Design System & UI/UX

### 3.1 — Color Palette (Tailwind Tokens)

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#FF9F1C` | CTA buttons, focus rings, active states — **all portals** |
| `primary-heavy` | `#FF771C` | Button hover states |
| `secondary` | `#FFBC1C` | Accents, highlights |
| `dark` | `#131313` | Body text, dark backgrounds |
| `light` | `#FFFFFF` | Backgrounds, cards |

**Rules:**
- Never use raw hex values in JSX (e.g. `text-[#FF9F1C]`). Always use tokens (`text-primary`).
- Exception: LINE brand green `#00B900` — no token exists, raw hex is acceptable only for LINE-related UI elements.
- `bg-primary` is the **mandatory color for all CTA/submit buttons** across every portal. Never use `bg-slate-900` or any other color for primary actions.

### 3.2 — Typography

- **Font:** `LINE SEED SANS` (primary font for all text)
- **Label style:** `text-[10px] font-black text-slate-400 uppercase tracking-widest`
- **Error style:** `text-xs text-rose-500 font-bold`

### 3.3 — UX/Copywriting Tone

ใช้ภาษาที่เป็นมิตร เข้าถึงง่าย และให้ความรู้สึกเชื่อถือได้ **(Caregiver & Everyman Persona)**
- พูดตรงๆ ไม่เป็นทางการเกินไป
- ประโยค error/alert ต้องไม่ทำให้ผู้ใช้รู้สึกโดนตำหนิ

### 3.4 — Input Styling Standards

ใช้ component `GlobalInput`, `GlobalTextarea`, `GlobalSelect` เสมอ — **ห้ามเขียน inline `<input>` ใหม่**

| Variant | Classes |
|---|---|
| `default` | `bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all` |
| `large` | เหมือน default + `px-6 py-4 text-lg` (ใช้ใน registration, onboarding) |
| `search` | `bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm` |

Label: `text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block`
Error: `text-xs text-rose-500 font-bold mt-1.5 ml-1 animate-fade-in`
With icon: `pl-12` on input, icon at `absolute left-4 top-1/2 -translate-y-1/2`

### 3.5 — Alert & Notification Standards

**ห้ามใช้ `alert()` ทุกกรณี** — ใช้สิ่งต่อไปนี้แทน:

| กรณี | ใช้ |
|---|---|
| แจ้งผลสำเร็จ / error แบบ one-way | `showToast(t("key"), "success" \| "error")` |
| ต้องรอ user กด confirm/cancel | `<ConfirmModal>` |

### 3.6 — Login Page Standards

ใช้ `LoginTemplate` component เสมอสำหรับทุก portal login:

| Portal | theme | mode |
|---|---|---|
| Customer / Partner / Rubber | `"primary"` | `"fullpage"` |
| Admin | `"dark"` | `"fullpage"` |

- `AdminAuthGate` (modal overlay) ให้แยกเป็น component ของตัวเอง — ไม่ merge เข้า `LoginTemplate`
- Submit button ทุก login page ต้องใช้ `bg-primary hover:bg-primary-heavy`

---

## 4. User Roles & Ecosystem

| Role | Portal Path | Priority UX Concern |
|---|---|---|
| **Customer** | `src/app/` | สั่งงานได้ในไม่กี่คลิก, Tracking แบบ real-time เพื่อลดความกังวล |
| **Rubber (Rider)** | `src/app/rubber/` | ใช้งานขณะขับขี่ได้ง่าย, ระบบ Batching/Routing อัตโนมัติ |
| **Partner (Store)** | `src/app/partner-store/` | แดชบอร์ดจัดการ Volume งาน, รองรับ SLA |
| **Partner (Service)** | `src/app/partner-service/` | จัดการ Gig-based services |
| **Admin** | `src/app/admin/` | Back-office management |

---

## 5. Core Business Logic & Pricing

AI ต้องอิงสูตรต่อไปนี้เสมอเมื่อสร้าง API หรือฟังก์ชันด้านการเงิน:

### Rubber (Rider) Earnings

```
Base Fare:        50 THB
Distance Fare:    (Distance > 3km) ? (Distance - 3) × 10 : 0
Gross Fare:       Base + Distance Fare
Commission:       Gross Fare × 15%
Platform Fee:     15 THB
Net Earning:      Gross Fare - Commission - Platform Fee
```

### Platform Revenue (GP)

```
10% จากยอดค่าบริการซักและอบที่เรียกเก็บจาก Partner
```

### Add-ons

```
Express delivery:          +20 THB
Detergent / Fabric Softener: +20 THB (Premium grade)
```

---

## 6. Coding Guidelines

### 6.1 — General Rules

- TypeScript เสมอ — **`any` เป็น error ไม่ใช่ warning**
- Server Components เป็น default — เพิ่ม `"use client"` เฉพาะ component ที่มี state, interaction, หรือเรียก LINE LIFF
- Database query ต้อง optimize สำหรับ Cloudflare D1 (SQLite) — หลีกเลี่ยง N+1 queries

### 6.2 — Component Architecture

```
src/components/
  ui/
    GlobalInput.tsx       ← ใช้แทน <input> ทุกกรณี
    GlobalTextarea.tsx    ← ใช้แทน <textarea> ทุกกรณี
    GlobalSelect.tsx      ← ใช้แทน <select> ทุกกรณี
    ConfirmModal.tsx      ← ใช้แทน alert() ที่รอ user confirm
    Button.tsx            ← existing, ใช้ต่อ
    Card.tsx              ← existing, ใช้ต่อ
    Modal.tsx             ← existing, ใช้ต่อ (ConfirmModal wrap อยู่บน Modal)
    Toast.tsx             ← existing, ใช้ต่อ
    Badge.tsx             ← existing, ใช้ต่อ
    Icons.tsx             ← existing, ใช้ต่อ
    Skeleton.tsx          ← existing, ใช้ต่อ
    PhotoUpload.tsx       ← existing, ใช้ต่อ
    MapPicker.tsx         ← existing, ใช้ต่อ
  auth/
    LoginTemplate.tsx     ← ใช้สำหรับทุก portal login page
    AdminAuthGate.tsx     ← standalone, ไม่ merge กับ LoginTemplate
    OnboardingFlow.tsx    ← customer onboarding
```

**กฎ:** ห้ามเขียน inline `<input>`, `<textarea>`, `<select>` ใหม่ในไฟล์ใดก็ตาม ให้ import Global components เสมอ

### 6.3 — i18n Rules

**ห้ามเขียน hardcoded text ภาษาไทยหรืออังกฤษใน JSX ทุกกรณี**

```tsx
// ❌ ผิด
<button>ยืนยัน</button>
<p>Failed to save</p>

// ✅ ถูก
<button>{t("common.confirm")}</button>
<p>{t("profile.address.errors.saveFailed")}</p>
```

**Dictionary structure (top-level keys):**

| Key | Portal |
|---|---|
| `common` | ทุก portal |
| `home`, `booking`, `orders`, `profile`, `addresses` | Customer |
| `rubber` | Rubber/Rider portal |
| `store` | Partner-Store portal |
| `provider` | Partner-Service portal |
| `admin` | Admin portal |
| `onboarding` | Customer onboarding flow |
| `register` | Landing registration pages |
| `landing` | Landing page |
| `support` | Support pages |

**Locale files: th.ts (Thai), en.ts (English)**

**Missing key fallback:** ถ้า key ไม่มีใน locale ปัจจุบัน จะ render key string แทน (เช่น `"provider.nav.jobs"`) — ทดสอบทุก locale ก่อน deploy

### 6.4 — Wallet & Financial Display

- Transaction type ต้อง translate ผ่าน `t(\`[portal].wallet.types.${trx.type}\`)` เสมอ — ห้าม render raw `trx.type`
- Store wallet ใช้ `store.wallet.*` keys — ห้ามใช้ `rubber.wallet.*` ข้าม portal

---

## 7. Known Architectural Decisions

ตัดสินใจเหล่านี้ได้รับการ approve แล้ว — ไม่ต้องถามซ้ำ:

| Decision | เหตุผล |
|---|---|
| `GlobalInput` มี `asyncValidate?: (value: string) => Promise<string \| undefined>` prop | ต้นทุนต่ำตอนสร้าง แต่ถ้าเพิ่มทีหลังจะ break ทุก file ที่ใช้อยู่ |
| `AdminAuthGate` แยกจาก `LoginTemplate` | AdminAuthGate เป็น modal overlay, LoginTemplate เป็น full-page — layout ต่างกันมาก |
| `LoginTemplate` มี `mode?: "fullpage" \| "modal"` prop | Reserved สำหรับอนาคต — modal mode ยังไม่ implement |
| Phase migration ใช้ pilot file ก่อนเสมอ | ถ้า GlobalInput มีปัญหาจะเห็นได้ทันทีโดยไม่ cascade ทั้ง portal |

---

## 8. What NOT To Do (Anti-patterns)

| ❌ ห้ามทำ | ✅ ทำแทน |
|---|---|
| `alert("ข้อความ")` | `showToast(t("key"), type)` หรือ `<ConfirmModal>` |
| `<input className="...">` inline | `<GlobalInput>` |
| `<textarea className="...">` inline | `<GlobalTextarea>` |
| Hardcoded Thai/English string ใน JSX | `t("dictionary.key")` |
| `text-[#FF9F1C]` raw hex | `text-primary` |
| `rubber.wallet.*` keys ใน store portal | `store.wallet.*` |
| Raw `trx.type` render | `t(\`store.wallet.types.${trx.type}\`)` |
| `bg-slate-900` สำหรับ CTA button | `bg-primary hover:bg-primary-heavy` |
| TypeScript `any` | Type ให้ถูกต้อง หรือใช้ `unknown` + type guard |
| เพิ่ม key ใน `th.ts` หรือ `en.ts` | เพิ่มทุก locale พร้อมกัน |

---

## 9. Post-Refactor Checklist

ใช้ checklist นี้ก่อน merge ทุก PR ที่เกี่ยวกับ UI หรือ i18n:

- [ ] ไม่มี `alert()` เหลืออยู่ในไฟล์ที่แก้ไข
- [ ] ไม่มี hardcoded Thai/English string ใน JSX
- [ ] ไม่มี inline `<input>`, `<textarea>`, `<select>` ใหม่
- [ ] ทุก key ที่ใช้มีอยู่ใน `th.ts` และ `en.ts`
- [ ] CTA button ใช้ `bg-primary` ไม่ใช่ color อื่น
- [ ] ไม่มี `any` type ใหม่ถูก introduce
- [ ] Component ใหม่ที่มี state/interaction มี `"use client"` directive
- [ ] ทดสอบ switch ภาษาใน app แล้วไม่มี key string โผล่

---

## 10. Pending Work (Tracked)

งานต่อไปนี้ยังไม่เสร็จ — AI ที่รับ task ใหม่ควรตรวจสอบว่า item ไหน resolve แล้วก่อนเริ่ม:

| # | งาน | Priority | สถานะ |
|---|---|---|---|
| A | Migrate `src/app/landing/page.tsx` → `useTranslation` | High | ⏳ Pending |
| B | Migrate `src/app/landing/register/partner/page.tsx` | High | ⏳ Pending |
| C | Migrate `src/app/landing/register/rider/page.tsx` | High | ⏳ Pending |
| D | Migrate `src/app/register/rider/page.tsx` (legacy) | Medium | ⏳ Pending |
| E | Migrate `src/app/register/store/page.tsx` (legacy) | Medium | ⏳ Pending |
| F | สร้าง shared `AddressForm` component (unify OnboardingFlow + profile/addresses) | Medium | ⏳ Pending |
| G | (Reserved) | - | ⏳ Removed |
| H | Regression test ทุก portal หลัง Phase 1–4 | Critical | ⏳ Pending |
| I | i18n smoke test ทุกภาษา (ตรวจ key string โผล่) | Critical | ⏳ Pending |
| J | เพิ่ม ESLint rule ตรวจ hardcoded Thai/English ใน JSX | Low | ⏳ Planned |
| K | เขียน Storybook / usage guide สำหรับ Global components | Low | ⏳ Planned |

---

## 11. New Admin-Centric Operational Flow (Manual Phase)

ใช้โฟลว์นี้แทนระบบอัตโนมัติของ Partner ในช่วงเริ่มต้น โดย Admin เป็นศูนย์กลางการควบคุม

### 11.1 — Operational Flow

**Phase A: รับผ้าจากลูกค้า (Pickup Phase)**
1. **Order Created**: ลูกค้าสั่งออเดอร์ผ่านระบบ → Status: `PENDING`
2. **Admin Assigns Rider (Manual)**: Admin เห็นออเดอร์ใน Dashboard และเลือกกดเรียก Rider ที่ว่างอยู่โดยตรง
3. **Pickup Photo (บังคับ)**: Rider ไปถึงลูกค้า → ถ่ายภาพตะกร้า/ถุงผ้าก่อนรับ เพื่อเป็นหลักฐานลักษณะภายนอก → Status: `PICKING_UP`
4. **Drop-off at Shop**: Rider นำผ้าไปส่งที่ร้าน → ถ่ายภาพตะกร้าที่วางอยู่ในร้าน เพื่อยืนยันจุดวาง → Status: `AT_SHOP`
   * ระบบบันทึกเวลา `arrived_at_shop_at` ทันที

**Phase B: ช่วงติดตาม (Monitoring Phase)**
5. **Dashboard Alert (3 ชั่วโมง)**: หากออเดอร์อยู่สถานะ `AT_SHOP` นานเกิน 3 ชั่วโมง → แสดงแถบสีส้มใน Tracking Board พร้อมแจ้งเตือนซ้ำทุก 1 ชั่วโมง (สีแดงเมื่อเกิน 5 ชั่วโมง)
6. **Manual Follow-up**: Admin ดูข้อมูลร้านและติดต่อสอบถามสถานะกับร้านค้าด้วยตนเอง โดยสามารถกดดูภาพหลักฐานทั้ง 2 ชุดจาก Tracking Board ได้เลย

**Phase C: ส่งคืนลูกค้า (Delivery Phase)**
7. **Ready for Return**: เมื่อร้านซักเสร็จ → Admin เปลี่ยนสถานะเป็น `READY_FOR_RETURN` และกดเรียก Rider จากหน้า Tracking Board ได้เลย (ไม่ต้องเปลี่ยนหน้า)
8. **Rider Identification**: Rider ที่รับงาน (คนเดิมหรือคนใหม่) จะเห็นภาพทั้ง 2 ชุดในแอป ได้แก่ ภาพตอนรับจากลูกค้า และภาพตอนวางไว้ที่ร้าน เพื่อระบุตะกร้าได้ถูกต้องทันที
9. **Completed**: Rider นำส่งลูกค้าและปิดงาน → Status: `COMPLETED`

### 11.2 — Data Model Updates (Orders Table)

| Field |ประเภท | วัตถุประสงค์ |
|---|---|---|
| `pickup_photo_url` | String | ภาพตอนรับจากลูกค้า |
| `dropoff_shop_photo_url` | String | ภาพตอนวางที่ร้าน |
| `arrived_at_shop_at` | Timestamp | เวลาที่ผ้าถึงร้าน |
| `last_notified_at` | Timestamp | คำนวณรอบการแจ้งเตือนทุก 1 ชั่วโมง |

### 11.3 — Automation Logic

**Cron Job (ทุก 10–15 นาที)**
- ตรวจหา Order ที่ `status = AT_SHOP` และ `now - arrived_at_shop_at > 3 hours`
- อัปเดตสีแถบใน Dashboard + ตั้ง flag แจ้งเตือนซ้ำทุก 1 ชั่วโมง
- **สำคัญ**: ไม่ส่งออกนอกระบบ แสดงเฉพาะใน Tracking Board ของ Admin เท่านั้น