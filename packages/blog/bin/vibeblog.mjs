#!/usr/bin/env node
// Scaffolds the thin route files that wire @vibelabsdotto/blog into a Next.js App Router site.
// Existing files are never overwritten unless --force is passed.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const PKG = "@vibelabsdotto/blog";

const HELP = `Usage: npx ${PKG} init [options]

Options:
  --base <path>       Route the blog lives under        (default: /blog)
  --content <dir>     Folder with .mdx posts            (default: content/blog)
  --site-url <url>    Absolute site origin              (default: NEXT_PUBLIC_SITE_URL or http://localhost:3000)
  --locale <locale>   Date format and labels, en or de  (default: en)
  --force             Overwrite files that already exist
  -h, --help          Show this help
`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    base: { type: "string", default: "/blog" },
    content: { type: "string", default: "content/blog" },
    "site-url": { type: "string" },
    locale: { type: "string", default: "en" },
    force: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help || positionals[0] !== "init") {
  process.stdout.write(HELP);
  process.exit(values.help ? 0 : 1);
}

const cwd = process.cwd();
const read = (file) => (existsSync(file) ? readFileSync(file, "utf8") : "");

if (!existsSync(path.join(cwd, "package.json"))) {
  fail("No package.json here. Run this from the root of your Next.js app.");
}

const srcDir = existsSync(path.join(cwd, "src/app")) ? "src" : "";
const appDir = path.join(srcDir, "app");
if (!existsSync(path.join(cwd, appDir))) {
  fail("No app/ or src/app/ directory found. The blog needs the App Router.");
}

const segment = values.base.replace(/^\/+|\/+$/g, "");
if (!segment || !/^[a-z0-9][a-z0-9/_-]*$/i.test(segment)) {
  fail(`--base must be a route like /blog, got ${JSON.stringify(values.base)}`);
}
const basePath = `/${segment}`;
const routeDir = path.join(appDir, segment);
const libFile = path.join(srcDir, "lib", "blog.ts");

const tsconfig = read(path.join(cwd, "tsconfig.json"));
const usesAtAlias = /"@\/\*"\s*:/.test(tsconfig);
function importBlog(fromFile) {
  if (usesAtAlias) return "@/lib/blog";
  const rel = path.relative(path.dirname(fromFile), libFile.replace(/\.ts$/, "")).split(path.sep).join("/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}

// `export const dynamic` and `dynamicParams` are rejected when Cache Components is on.
const nextConfig = ["next.config.ts", "next.config.mjs", "next.config.js"]
  .map((name) => read(path.join(cwd, name)))
  .join("\n");
const cacheComponents = /cacheComponents\s*:\s*true/.test(nextConfig);

const siteUrlExpr = values["site-url"]
  ? JSON.stringify(values["site-url"])
  : `process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`;

const today = new Date().toISOString().slice(0, 10);

const files = [
  [
    libFile,
    `import { createBlog } from "${PKG}";

export const blog = createBlog({
  siteUrl: ${siteUrlExpr},
  basePath: "${basePath}",
  contentDir: "${values.content}",
  title: "Blog",
  description: "",
  locale: "${values.locale}",
});
`,
  ],
  [
    path.join(routeDir, "layout.tsx"),
    `import "${PKG}/styles.css";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
`,
  ],
  [
    path.join(routeDir, "page.tsx"),
    `import { blog } from "${importBlog(path.join(routeDir, "page.tsx"))}";

export const metadata = blog.indexMetadata;
export default blog.IndexPage;
`,
  ],
  [
    path.join(routeDir, "[slug]", "page.tsx"),
    `import { blog } from "${importBlog(path.join(routeDir, "[slug]", "page.tsx"))}";
${cacheComponents ? "" : "\nexport const dynamicParams = false;"}
export const generateStaticParams = blog.generateStaticParams;
export const generateMetadata = blog.generateMetadata;
export default blog.PostPage;
`,
  ],
  [
    path.join(routeDir, "rss.xml", "route.ts"),
    `import { blog } from "${importBlog(path.join(routeDir, "rss.xml", "route.ts"))}";
${cacheComponents ? "" : '\nexport const dynamic = "force-static";'}
export const GET = blog.rss;
`,
  ],
  [
    path.join(values.content, "hello-world.mdx"),
    `---
title: Hello world
date: ${today}
description: The first post on this blog.
---

This post lives in \`${values.content}/hello-world.mdx\`. Edit it or add new \`.mdx\` files next to it.

## Code

\`\`\`ts
const greeting = "hello";
\`\`\`

<Callout type="tip">Set \`draft: true\` in the frontmatter to hide a post from production builds.</Callout>
`,
  ],
  [
    path.join(values.content, "AGENTS.md"),
    `# Blog posts

Every \`.mdx\` file in this folder is one post. The file name is the URL slug:
\`my-post.mdx\` becomes \`${basePath}/my-post\`. Use lowercase letters, digits and hyphens only.

## Frontmatter

\`\`\`yaml
---
title: Post title            # required
date: 2026-01-31             # required, YYYY-MM-DD
description: One sentence.   # recommended, used for the list, SEO and RSS
image: /blog/cover.png       # optional, path below public/ or absolute URL
author: Jane Doe             # optional
draft: true                  # optional, hidden from production builds
---
\`\`\`

## Body

- Start with text, not with an \`# h1\`. The page renders the title.
- Use \`##\` and \`###\` for sections. They get anchor links and fill the table of contents in the sidebar.
- Markdown, GFM tables, task lists and footnotes work.
- Fenced code blocks get syntax highlighting and a copy button. Always set the language: \`\`\`ts, \`\`\`bash, \`\`\`json.
- Show a file name in the code card's top bar with \`title\`: \`\`\`ts title="lib/blog.ts".
- Available components: \`<Callout type="note|tip|warning" title="Optional">Text</Callout>\`.
- \`import\` and \`export\` are disabled. Put images in \`public/\` and reference them by path.

\`npm run build\` fails with the file name if a post has invalid frontmatter or MDX.
`,
  ],
];

const sitemapFile = path.join(appDir, "sitemap.ts");
if (!existsSync(path.join(cwd, sitemapFile))) {
  files.push([
    sitemapFile,
    `import type { MetadataRoute } from "next";
import { blog } from "${importBlog(sitemapFile)}";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: blog.config.siteUrl }, ...blog.sitemap()];
}
`,
  ]);
}

const written = [];
const skipped = [];
for (const [rel, content] of files) {
  const abs = path.join(cwd, rel);
  if (existsSync(abs) && !values.force) {
    skipped.push(rel);
    continue;
  }
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  written.push(rel);
}

const pkg = JSON.parse(read(path.join(cwd, "package.json")));
const installed = Boolean(pkg.dependencies?.[PKG] || pkg.devDependencies?.[PKG]);

const out = [];
if (written.length) out.push("Created:", ...written.map((f) => `  + ${f}`));
if (skipped.length) out.push("Skipped (already exists, use --force):", ...skipped.map((f) => `  = ${f}`));
out.push("", "Next steps:");
if (!installed) out.push(`  npm install ${PKG}`);
out.push(`  Set siteUrl in ${libFile} (or NEXT_PUBLIC_SITE_URL)`);
if (existsSync(path.join(cwd, sitemapFile)) && !written.includes(sitemapFile)) {
  out.push(`  Add ...blog.sitemap() to the array returned by ${sitemapFile}`);
}
out.push(`  npm run dev, then open ${basePath}`);
process.stdout.write(`${out.join("\n")}\n`);

function fail(message) {
  process.stderr.write(`vibeblog: ${message}\n`);
  process.exit(1);
}
