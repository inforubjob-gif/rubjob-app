import type { Metadata, Viewport } from "next";
import "./globals.css";
import LiffProvider from "@/components/providers/LiffProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import AppWrapper from "@/components/layout/AppWrapper";
import BottomNav from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "RUBJOB — Laundry & Life Service",
  description:
    "Professional laundry pickup & delivery. Book, track, and manage your laundry from LINE.",
  keywords: ["laundry", "pickup", "delivery", "LINE", "RUBJOB"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ff9f1c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/LineSeed/LineSeed.css" />
      </head>
      <body className="min-h-full bg-surface-alt font-sans antialiased">
        <LiffProvider>
          <LanguageProvider>
            <AppWrapper>
              {/* Main content area with bottom nav padding */}
              <main className="pb-20 min-h-dvh">{children}</main>
              <BottomNav />
            </AppWrapper>
          </LanguageProvider>
        </LiffProvider>
      </body>
    </html>
  );
}
