import { createBlog } from "@vibelabsdotto/blog";

export const blog = createBlog({
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3077",
  basePath: "/blog",
  contentDir: "content/blog",
  title: "Blog",
  description: "Notes on building small, fast products. Written by humans and agents.",
  locale: "en",
  author: "VibeLabs",
  ogImage: "/og.png",
  cta: {
    title: "Add a blog to your own site",
    text: "@vibelabsdotto/blog: one init command, posts as MDX files in your repo.",
    label: "View on npm",
    href: "https://www.npmjs.com/package/@vibelabsdotto/blog",
  },
});
