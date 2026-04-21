import { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get("host") || "";

  const isPortal =
    host.startsWith("app.") ||
    host.startsWith("store.") ||
    host.startsWith("admin.") ||
    host.startsWith("rider.");

  if (isPortal) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://rubjob.com/sitemap.xml",
  };
}
