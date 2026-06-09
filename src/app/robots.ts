import { MetadataRoute } from "next";

export const runtime = "edge";

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
