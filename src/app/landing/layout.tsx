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
