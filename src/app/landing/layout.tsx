import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "RUBJOB — เรื่องยุ่งยาก เรารับจบให้",
  description:
    "Professional laundry pickup & delivery platform. Rubbers, stores, and customers — all connected.",
  keywords: ["rubjob", "laundry", "pickup", "delivery", "LINE", "platform", "รับซักอบรีด", "ซักผ้าออนไลน์", "ซักแห้ง", "ซักผ้าส่งถึงบ้าน", "แอปซักผ้า", "ร้านซักรีด", "แม่บ้าน"],
  icons: {
    icon: "/images/rubjob-complete_logo-color.png",
    apple: "/images/rubjob-complete_logo-color.png",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      "max-snippet": -1,
      "max-image-preview": "none",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "RUBJOB — เรื่องยุ่งยาก เรารับจบให้",
    description: "ไม่ต้องคิด ไม่ต้องกังวล บริการซักอบรีดที่เหมือนมีคนจัดการชีวิตแทนคุณ รวดเร็ว สะอาด และตรวจสอบสถานะได้ตลอดเวลา",
    url: "https://rubjob-all.com",
    siteName: "RUBJOB",
    images: [
      {
        url: "/images/rubjob-complete_logo-color.png",
        width: 1200,
        height: 630,
        alt: "RUBJOB Cover Image",
      },
    ],
    locale: "th_TH",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ff9f1c",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Landing page renders without LIFF, BottomNav, or onboarding */}
      {children}
    </>
  );
}
