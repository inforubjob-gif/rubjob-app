import { MetadataRoute } from "next";

export const runtime = "edge";

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/admin/",
          "/rubber/",
          "/partner-store/",
          "/partner-service/",
          "/partner/",
          "/booking/",
          "/orders/",
          "/profile/",
          "/auth/",
          "/quick/",
          "/landing/",
          "/_next/",
        ],
      },
      // AI Crawlers — explicitly allow landing page
      {
        userAgent: "GPTBot",         // ChatGPT / OpenAI
        allow: ["/"],
        disallow: ["/api/", "/admin/", "/rubber/", "/partner-store/", "/partner-service/", "/partner/", "/booking/", "/orders/", "/profile/", "/auth/", "/quick/", "/landing/", "/_next/"],
      },
      {
        userAgent: "Google-Extended", // Gemini AI
        allow: ["/"],
        disallow: ["/api/", "/admin/", "/rubber/", "/partner-store/", "/partner-service/", "/partner/", "/booking/", "/orders/", "/profile/", "/auth/", "/quick/", "/landing/", "/_next/"],
      },
      {
        userAgent: "anthropic-ai",    // Claude
        allow: ["/"],
        disallow: ["/api/", "/admin/", "/rubber/", "/partner-store/", "/partner-service/", "/partner/", "/booking/", "/orders/", "/profile/", "/auth/", "/quick/", "/landing/", "/_next/"],
      },
      {
        userAgent: "PerplexityBot",   // Perplexity AI
        allow: ["/"],
        disallow: ["/api/", "/admin/", "/rubber/", "/partner-store/", "/partner-service/", "/partner/", "/booking/", "/orders/", "/profile/", "/auth/", "/quick/", "/landing/", "/_next/"],
      },
      {
        userAgent: "Applebot-Extended", // Apple Intelligence / Siri
        allow: ["/"],
        disallow: ["/api/", "/admin/", "/rubber/", "/partner-store/", "/partner-service/", "/partner/", "/booking/", "/orders/", "/profile/", "/auth/", "/quick/", "/landing/", "/_next/"],
      },
    ],
    sitemap: "https://rubjob-all.com/sitemap.xml",
  };
}
