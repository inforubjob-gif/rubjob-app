# RubJob - Project Context & AI Coding Guidelines

## 1. Project Overview & Core Values
**RubJob** เป็นแพลตฟอร์ม On-Demand Service (เริ่มต้นจากบริการรับ-ส่งซักรีดในพื้นที่ขอนแก่น โซนกังสดาล) ที่วางตัวเป็น "Life Operator" ช่วยจัดการงานจุกจิกให้ผู้ใช้งานแบบ End-to-end ตามคอนเซปต์ "เรื่องยุ่งยาก เรารับจบให้"
- **Core Values (RUBJOB):** Reliability, User Simplicity, Bridge Everything, Just Done, Ownership, Better Everyday

## 2. Core Tech Stack & Architecture
- **Framework:** Next.js 16 (App Router), React 19
- **Language:** TypeScript (Strict Typing)
- **Database:** Cloudflare D1 (SQLite)
- **Styling:** Tailwind CSS
- **Integration:** LINE LIFF (Auth), Stripe (Payment), LINE OA (Messaging API)
- **Deployment Target:** Cloudflare Pages (Edge Runtime)

## 3. Strict Coding Guidelines & Data Management
AI ต้องเขียนโค้ดตามแนวทางของ Repository ปัจจุบันอย่างเคร่งครัด ห้ามนำไลบรารีภายนอกมาใช้หากไม่ได้รับคำสั่ง:

- **State Management & Data Fetching:**
  - ใช้ **Context API** ร่วมกับ **React Hooks** ธรรมดา (เช่น `LiffProvider`, `PartnerProvider`) สำหรับ Global State
  - การดึงข้อมูลให้ใช้ Native `fetch` ภายใน `useEffect` หรือผ่าน Helper Functions เท่านั้น *(ห้ามใช้ Zustand, Redux หรือ React Query)*
- **Form Handling & Validation:**
  - จัดการฟอร์มด้วย **React State (Controlled Components)** 
  - เขียน Logic ตรวจสอบเงื่อนไข (Validation) แบบ Manual *(ห้ามใช้ react-hook-form หรือ zod เว้นแต่จะระบุเป็นอย่างอื่น)*
- **Database Operations (Cloudflare D1):**
  - ใช้การเขียน **Raw SQL** โดยตรงผ่าน D1 Driver เท่านั้น (ตัวอย่าง: `db.prepare("SELECT ...").all()`) 
  - ห้ามใช้ ORM ใดๆ (เช่น Prisma หรือ Drizzle)
- **Data Mutation & API Structure:**
  - ใช้ **API Routes** (`src/app/api/.../route.ts`) เป็นหลักสำหรับการทำ Data Mutation
  - **บังคับ:** ทุกไฟล์ในโฟลเดอร์ `api` ต้องระบุ `export const runtime = "edge";` เสมอ เพื่อให้รองรับ Cloudflare Pages
  - *ห้ามใช้ Server Actions (`"use server"`) ภายใน Source Code*
- **Internationalization (i18n) & Localization:**
  - **ห้าม Hardcode ข้อความลงใน UI Component โดยตรง**
  - ต้องแยกระบบข้อความออกเป็น Dictionary หรือตัวแปรสำหรับจัดการภาษาเสมอ (อิงตามโครงสร้างโปรเจกต์ เช่น การใช้ Context สำหรับแปลภาษา) เพื่อให้ฟังก์ชันปุ่มเปลี่ยนภาษา "ทำงานได้จริง" ไม่ใช่แค่ม็อคอัป

## 4. Design System & UI/UX (Tailwind Config)
เมื่อสร้าง Component หรือ UI ให้ใช้ข้อกำหนดต่อไปนี้เสมอ:
- **Language Priority:** กำหนดให้ **ภาษาไทย (TH)** เป็นภาษาหลัก (Default) และ **ภาษาอังกฤษ (EN)** เป็นภาษารอง
- **Typography:** ใช้ฟอนต์ `LINE SEED SANS` เป็นฟอนต์หลัก
- **Color Palette:**
  - `primary`: `#FF9F1C` (Passion Orange)
  - `primary-heavy`: `#FF771C` (Heavy Orange)
  - `secondary`: `#FFBC1C` (Light Yellow)
  - `dark`: `#131313` (Support Black)
  - `light`: `#FFFFFF`
- **UX/Copywriting Tone:** ใช้ภาษาที่เป็นมิตร เข้าถึงง่าย และให้ความรู้สึกเชื่อถือได้ (Caregiver & Everyman Persona)

## 5. Core Business Logic & Pricing Algorithms
อิงตามสูตรคำนวณนี้เมื่อสร้าง API หรือฟังก์ชันด้านการเงิน:
- **Rubber Earnings Calculation (คำนวณแบบไป-กลับ x2):**
  - Base Fare (ต่อเที่ยว): 50 THB
  - Distance Fare (ต่อเที่ยว): หากระยะทาง > 3 km ให้บวกเพิ่มกิโลเมตรละ 10 THB
  - Single Trip Fare = 50 + (Distance > 3 ? (Distance - 3) * 10 : 0)
  - **Gross Rubber Fare (ราคารวมไป-กลับ) = Single Trip Fare * 2**
  - Deductions: หัก Commission 15% จากยอดค่าส่งรวม (Gross Rubber Fare) + Platform Fee 15 THB
  - Net Rubber Earning = Gross Rubber Fare - (Gross Rubber Fare * 0.15) - 15
- **Platform Revenue (GP):**
  - คิด 10% จากยอดค่าบริการซักและอบจาก Partner
- **Add-ons (Options):**
  - บริการด่วน (Express) = +20 THB
  - ค่าน้ำยาซักผ้า/ปรับผ้านุ่ม = +20 THB

## 6. User Roles & Ecosystem
- **Customer (ลูกค้า):** เน้น UI ที่ใช้งานง่าย สั่งงานผ่าน LIFF ได้ในไม่กี่คลิก พร้อมระบบ Tracking แจ้งสถานะเรียลไทม์
- **Rubber (ผู้ปฏิบัติงาน/ผู้รับส่ง):** ระบบรับงาน (Dispatch) ที่ออกแบบให้ใช้งานบนมือถือขณะขับขี่หรือลงพื้นที่ได้ง่าย 
- **Partner (ร้านค้า/ผู้ให้บริการ):** แดชบอร์ดจัดการ Volume งานสำหรับพาร์ทเนอร์ รองรับ SLA และการจัดการคิว