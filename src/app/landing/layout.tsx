import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "RUBJOB — ผู้จัดการชีวิต Life Operator",
  description:
    "Professional laundry pickup & delivery platform. Riders, stores, and customers — all connected.",
  keywords: ["rubjob", "laundry", "pickup", "delivery", "LINE", "platform"],
  icons: {
    icon: "/images/rubjob-complete_logo-color.png",
    apple: "/images/rubjob-complete_logo-color.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "RUBJOB — ผู้จัดการชีวิต Life Operator",
    description: "ไม่ต้องคิด ไม่ต้องกังวล บริการซักอบรีดที่เหมือนมีคนจัดการชีวิตแทนคุณ รวดเร็ว สะอาด และตรวจสอบสถานะได้ตลอดเวลา",
    url: "https://rubjob.com",
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
