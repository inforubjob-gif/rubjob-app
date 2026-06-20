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
          "/landing/",       // Internal rewrite path — block direct access
          "/_next/",
        ],
      },
    ],
    sitemap: "https://rubjob-all.com/sitemap.xml",
  };
}
