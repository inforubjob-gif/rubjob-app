import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "RUBJOB — บริการซักอบรีด รับ-ส่งถึงบ้าน | เรื่องยุ่งยาก เรารับจบให้",
  description:
    "บริการซักอบรีดครบวงจร รับ-ส่งผ้าถึงหน้าบ้าน สั่งง่ายผ่าน LINE สะอาด รวดเร็ว ราคาเริ่มต้น ฿120 ติดตามสถานะแบบเรียลไทม์ ให้บริการในกรุงเทพฯ และปริมณฑล",
  keywords: [
    "ซักผ้า",
    "ซักอบรีด",
    "รับซักผ้า",
    "ซักผ้าออนไลน์",
    "ซักผ้าส่งถึงบ้าน",
    "ร้านซักรีด",
    "ซักแห้ง",
    "ซักรีด",
    "ซักผ้านวม",
    "ซักผ้ากรุงเทพ",
    "laundry delivery",
    "rubjob",
    "LINE ซักผ้า",
    "แอปซักผ้า",
    "บริการซักอบรีด",
    "รับส่งผ้าถึงบ้าน",
  ],
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
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "https://rubjob-all.com",
  },
  openGraph: {
    title: "RUBJOB — บริการซักอบรีด รับ-ส่งถึงบ้าน",
    description:
      "ไม่ต้องคิด ไม่ต้องกังวล บริการซักอบรีดที่เหมือนมีคนจัดการชีวิตแทนคุณ รวดเร็ว สะอาด ติดตามสถานะได้ตลอดเวลา",
    url: "https://rubjob-all.com",
    siteName: "RUBJOB",
    images: [
      {
        url: "https://rubjob-all.com/images/og-cover-v2.png",
        width: 1200,
        height: 630,
        alt: "RUBJOB - บริการซักอบรีด รับส่งถึงบ้าน",
      },
    ],
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RUBJOB — บริการซักอบรีด รับ-ส่งถึงบ้าน",
    description:
      "สั่งซักผ้าง่ายๆ ผ่าน LINE รับ-ส่งถึงบ้าน ราคาเริ่มต้น ฿120",
    images: ["https://rubjob-all.com/images/og-cover-v2.png"],
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
  // JSON-LD: LocalBusiness schema
  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "RUBJOB",
    "alternateName": "รับจบ",
    "description": "บริการซักอบรีดครบวงจร รับ-ส่งผ้าถึงหน้าบ้าน สั่งง่ายผ่าน LINE สะอาด รวดเร็ว ติดตามสถานะแบบเรียลไทม์",
    "url": "https://rubjob-all.com",
    "logo": "https://rubjob-all.com/images/rubjob-complete_logo-color.png",
    "image": "https://rubjob-all.com/images/og-cover-v2.png",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "กรุงเทพมหานคร",
      "addressCountry": "TH",
    },
    "areaServed": {
      "@type": "City",
      "name": "กรุงเทพมหานคร",
    },
    "priceRange": "฿120 - ฿500",
    "openingHours": "Mo-Su 09:00-17:00",
    "sameAs": [
      "https://www.facebook.com/rubjob.all",
      "https://lin.ee/n8y9NrP",
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "บริการซักอบรีด RUBJOB",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "ซักอบ (Wash & Fold)",
            "description": "ซักผ้าและอบแห้ง รับ-ส่งถึงบ้าน เริ่มต้น ฿120",
          },
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "ซักแห้ง (Dry Clean)",
            "description": "ดูแลพิเศษสำหรับผ้าบอบบาง สูท เสื้อเชิ้ต",
          },
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "ซักรีด (Wash & Iron)",
            "description": "ซักรีดครบวงจรอย่างมืออาชีพ",
          },
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "ซักผ้านวม (Duvet Washing)",
            "description": "ซักผ้านวม ขจัดไรฝุ่นและสิ่งสกปรก",
          },
        },
      ],
    },
  };

  // JSON-LD: FAQPage schema
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "ใช้งานแพลตฟอร์มนี้ต้องโหลดแอปพลิเคชันไหม?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "ไม่จำเป็นเลยครับ! คุณสามารถทำทุกอย่างตั้งแต่กดสั่งซัก เช็กสถานะ ไปจนถึงการชำระเงินผ่านทาง LINE ของเราได้ทั้งหมด ช่วยประหยัดพื้นที่ในโทรศัพท์ของคุณได้เต็มที่",
        },
      },
      {
        "@type": "Question",
        "name": "ราคาค่าบริการซักผ้าคิดอย่างไร?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "ราคาจะถูกคำนวณตามแพ็กเกจที่คุณเลือกและมาตรฐานของร้านซักในละแวกของคุณ โดยระบบจะแสดงราคาให้ทราบล่วงหน้าอย่างชัดเจนก่อนที่คุณจะกดยืนยันออเดอร์",
        },
      },
      {
        "@type": "Question",
        "name": "ใช้เวลาซักและจัดส่งนานเท่าไหร่?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "ระยะเวลาขึ้นอยู่กับประเภทบริการที่คุณเลือก โดยมีตั้งแต่แบบด่วนพิเศษ (เสร็จภายใน 24 ชม.) ไปจนถึงแบบปกติ คุณสามารถติดตามสถานะแบบเรียลไทม์ได้ตลอดจากใน LINE",
        },
      },
      {
        "@type": "Question",
        "name": "หากเสื้อผ้าเกิดความเสียหาย มีการรับประกันไหม?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "แน่นอนครับ RUBJOB มีนโยบายรับประกันความเสียหายและสูญหาย เพื่อให้คุณมั่นใจได้ว่าเสื้อผ้าทุกชิ้นจะได้รับการดูแลเป็นอย่างดีโดยพาร์ทเนอร์ร้านมืออาชีพของเรา",
        },
      },
      {
        "@type": "Question",
        "name": "จะเปลี่ยนที่อยู่รับ-ส่งผ้าต้องทำอย่างไร?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "คุณสามารถแก้ไขหรือเปลี่ยนที่อยู่ใหม่ผ่านหน้าจอระบบบัญชีส่วนตัวบน LINE ได้เลยในขั้นตอนก่อนที่จะกดยืนยันเรียกรับเบอร์เข้ารับผ้าครับ",
        },
      },
      {
        "@type": "Question",
        "name": "สามารถจ่ายเงินผ่านช่องทางไหนได้บ้าง?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "รองรับการชำระเงินดิจิทัลเต็มรูปแบบ ไม่ว่าจะเป็น PromptPay, บัตรเครดิต/เดบิต, หรือตัดผ่านระบบสะสมคะแนน สะดวกและปลอดภัย 100%",
        },
      },
    ],
  };

  return (
    <>
      {/* JSON-LD Structured Data for SEO & AI */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Landing page renders without LIFF, BottomNav, or onboarding */}
      {children}
    </>
  );
}
