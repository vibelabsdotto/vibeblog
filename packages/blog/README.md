# @vibelabsdotto/blog

Drop-in MDX blog for Next.js App Router sites. Posts are `.mdx` files in your repo. The package renders them on the server. The only client JavaScript is the copy button and the active table-of-contents entry (3.5 kB).

- Index and post pages, statically generated
- Frontmatter validation that fails the build with the file name
- SEO metadata, Open Graph, JSON-LD, canonical URLs
- RSS feed and sitemap entries
- Post sidebar with a table of contents that follows the scroll position, plus more posts
- Code cards with a top bar: file name, language and a copy button
- Syntax highlighting with [sugar-high](https://github.com/huozhi/sugar-high), GFM tables, task lists, footnotes
- Drafts visible in `next dev`, removed from production builds
- Inherits your shadcn theme (light and dark) through CSS variables
- Works with and without `cacheComponents`

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
title: My post            # required
date: 2026-10-02          # required, YYYY-MM-DD
description: One line.    # list, SEO, RSS
image: /blog/cover.png    # cover and Open Graph image
author: Jane Doe
draft: true               # hidden in production
---

Text starts here. The page renders the title, so skip the `# h1`.

<Callout type="tip" title="Optional">note, tip or warning</Callout>
```

Code fences take an optional file name for the top bar:

````mdx
```ts title="lib/blog.ts"
export const blog = createBlog({ siteUrl: "https://example.com" });
```
````

## Sidebar

From 64rem viewport width, post pages show a sticky sidebar in the right margin. It has the `##`/`###` headings of the post (when there are at least two) and up to four other posts. The article keeps the same column and position as without a sidebar. On narrower screens the table of contents is hidden and "More posts" moves below the article. Turn it off with `sidebar: false`.

`import` and `export` inside posts are disabled. Register components through `components` in the config instead.

## Styling

`styles.css` is plain CSS scoped to `.vb-*` classes. Tailwind is not required. Colors come from the shadcn variables `--foreground`, `--muted-foreground`, `--border`, `--muted`, `--primary` and `--radius`, so the blog follows the site theme and `.dark`. Without those variables it falls back to `currentColor`.

To restyle, override variables on `.vb-root`:

```css
.vb-root {
  --vb-width: 48rem;          /* text column */
  --vb-link: oklch(0.55 0.2 260);
  --vb-sticky-top: 5rem;      /* sidebar offset, e.g. below a sticky site header */
  --sh-keyword: #d73a49;
}
```

Prose rules use `:where()`, so a single class in your CSS beats them.

## Develop

This package lives in the [vibeblog monorepo](../../). `npm run dev` at the root builds the package and starts the example app on port 3077.
