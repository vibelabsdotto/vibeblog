import { createBlog } from "@vibelabsdotto/blog";

export const blog = createBlog({
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3077",
  basePath: "/blog",
  contentDir: "content/blog",
  title: "Blog",
  description: "Notes on building small, fast products. Written by humans and agents.",
  locale: "en",
  author: "VibeLabs",
});
