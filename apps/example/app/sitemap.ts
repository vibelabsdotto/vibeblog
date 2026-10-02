import type { MetadataRoute } from "next";
import { blog } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: blog.config.siteUrl }, ...blog.sitemap()];
}
