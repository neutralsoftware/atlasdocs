import type { MetadataRoute } from "next";
import { source } from "@/lib/source";

export default function sitemap(): MetadataRoute.Sitemap {
  return source.getPages().map((page) => ({
    url: new URL(page.url, "https://docs.atlasengine.org").toString(),
    changeFrequency: "weekly",
    priority: page.slugs.length === 1 ? 1 : 0.8,
  }));
}
