import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  // Empty sitemap — block all search engine URL discovery
  return [];
}
