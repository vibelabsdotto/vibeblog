# @vibelabsdotto/blog

Drop-in MDX blog for Next.js App Router sites. Posts are `.mdx` files in your repo. The package renders them on the server. The only client JavaScript is the copy button and the active table-of-contents entry (3.5 kB).

- Index and post pages, statically generated
- Frontmatter validation that fails the build with the file name
- SEO: title and SEO title, description, canonical URL, Open Graph with a default image, `BlogPosting` JSON-LD with `dateModified`
- RSS feed, sitemap entries with `lastmod`, and a `robots.ts` if the site has none
- Post sidebar with a table of contents that follows the scroll position, plus more posts
- Code cards with a top bar: file name, language and a copy button
- Optional call to action below every post
- Syntax highlighting with [sugar-high](https://github.com/huozhi/sugar-high), GFM tables, task lists, footnotes
- Drafts visible in `next dev`, removed from production builds
- Inherits your shadcn theme (light and dark) through CSS variables
- Works with and without `cacheComponents`, also before the first post is published

Requires Next.js 16+ and React 19.1+.

## Install

```bash
npm install @vibelabsdotto/blog
npx vibeblog init --site-url https://example.com
```

`init` writes these files and skips any that already exist:

```
lib/blog.ts                    config
app/blog/layout.tsx            imports the stylesheet
app/blog/page.tsx              index
app/blog/[slug]/page.tsx       posts
app/blog/rss.xml/route.ts      RSS
app/sitemap.ts                 only if you don't have one
app/robots.ts                  only if you have no robots file
content/blog/hello-world.mdx   first post
content/blog/AGENTS.md         writing rules for coding agents
```

Options: `--base /notes`, `--content posts`, `--locale de`, `--force`. It detects `src/app` and the `@/*` alias.

## Why route files?

Next.js only creates a route when a file exists in `app/`. A package can't add one. The generated files are re-exports, so all logic stays in the package and `npm update` reaches every site:

```tsx
// app/blog/[slug]/page.tsx
import { blog } from "@/lib/blog";

export const dynamicParams = false;
export const generateStaticParams = blog.generateStaticParams;
export const generateMetadata = blog.generateMetadata;
export default blog.PostPage;
```

## Config

```ts
// lib/blog.ts
import { createBlog } from "@vibelabsdotto/blog";

export const blog = createBlog({
  siteUrl: "https://example.com", // required, absolute
  basePath: "/blog",              // must match the folder in app/
  contentDir: "content/blog",
  title: "Blog",
  description: "What this blog is about.",
  locale: "en",                   // "en" and "de" labels ship; dates use Intl
  author: "Jane Doe",             // fallback for posts without an author
  ogImage: "/og.png",             // index and posts without their own image, 1200x630
  cta: {                          // shown below every post
    title: "Try Example",
    text: "One sentence on what the reader gets.",
    label: "Get started",
    href: "/signup",
  },
  sidebar: true,                  // table of contents + more posts on post pages
  labels: { allPosts: "Back" },   // override single strings
  components: { Video },          // extra MDX components, or replace defaults
  remarkPlugins: [],              // appended to remark-gfm
  rehypePlugins: [],              // run after rehype-slug and the TOC plugin
});
```

The returned object also has `getPosts()` and `getPost(slug)` for teasers elsewhere on the site.

If your site already has `app/sitemap.ts`, spread the entries into it:

```ts
return [...yourEntries, ...blog.sitemap()];
```

## Posts

The file name is the slug: `content/blog/my-post.mdx` becomes `/blog/my-post`.

```mdx
---
title: My post            # required, the visible H1
date: 2026-10-02          # required, YYYY-MM-DD
updated: 2026-10-20       # optional, real content changes only
description: One line.    # meta description, list, RSS
seoTitle: Full title tag  # optional, replaces <title> and og:title, no site template
image: /blog/cover.png    # cover and Open Graph image
author: Jane Doe
draft: true               # hidden in production
---

Text starts here. The page renders the title, so skip the `# h1`.

<Callout type="tip" title="Optional">note, tip or warning</Callout>
```

`import` and `export` inside posts are disabled. Register components through `components` in the config instead.

Code fences take an optional file name for the top bar:

````mdx
```ts title="lib/blog.ts"
export const blog = createBlog({ siteUrl: "https://example.com" });
```
````

## Sidebar

From 64rem viewport width, post pages show a sticky sidebar in the right margin. It has the `##`/`###` headings of the post (when there are at least two) and up to four other posts. The article keeps the same column and position as without a sidebar. On narrower screens the table of contents is hidden and "More posts" moves below the article. Turn it off with `sidebar: false`.

## SEO: what the site still owns

The package covers everything below `/blog`. These are per domain and stay in the site:

- `metadataBase` and a title template in the root layout
- `robots.txt` (created by `init` when missing) and `sitemap.xml` including `...blog.sitemap()`
- One canonical host: redirect `www`/`http` to it
- A link to the blog in the header or footer
- Search Console verification and sitemap submission

## Styling

`styles.css` is plain CSS scoped to `.vb-*` classes. Tailwind is not required. Colors come from the shadcn variables `--foreground`, `--muted-foreground`, `--border`, `--muted`, `--primary`, `--ring` and `--radius`, so the blog follows the site theme and `.dark`. Without those variables it falls back to `currentColor`.

All defaults sit in `:where()` selectors, so a plain `.vb-root` rule in your CSS wins regardless of load order:

```css
.vb-root {
  --vb-width: 48rem;          /* text column */
  --vb-link: oklch(0.55 0.2 260);
  --vb-sticky-top: 5rem;      /* sidebar offset, e.g. below a sticky site header */
  --vb-cta-bg: #ff7a1a;       /* CTA button, defaults to the text color */
  --vb-cta-fg: #0e0e0e;
  --sh-keyword: #d73a49;
}
```

Tailwind v3 shadcn themes store colors as HSL channels (`--foreground: 0 0% 3.9%`). Map them once:

```css
.vb-root {
  --vb-fg: hsl(var(--foreground));
  --vb-muted: hsl(var(--muted-foreground));
  --vb-border: hsl(var(--border));
  --vb-surface: hsl(var(--muted));
  --vb-link: hsl(var(--primary));
  --vb-ring: hsl(var(--ring));
  --vb-cta-fg: hsl(var(--background));
}
```

Sites without shadcn set the same `--vb-*` variables to their own colors.

## Develop

This package lives in the [vibeblog monorepo](https://github.com/vibelabsdotto/vibeblog). `npm run dev` at the root builds the package and starts the example app on port 3077.
