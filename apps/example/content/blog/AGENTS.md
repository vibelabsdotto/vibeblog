# Blog posts

Every `.mdx` file in this folder is one post. The file name is the URL slug:
`my-post.mdx` becomes `/blog/my-post`. Use lowercase letters, digits and hyphens only.

## Frontmatter

```yaml
---
title: Post title            # required
date: 2026-01-31             # required, YYYY-MM-DD
description: One sentence.   # recommended, used for the list, SEO and RSS
image: /blog/cover.png       # optional, path below public/ or absolute URL
author: Jane Doe             # optional
draft: true                  # optional, hidden from production builds
---
```

## Body

- Start with text, not with an `# h1`. The page renders the title.
- Use `##` and `###` for sections. They get anchor links and fill the table of contents in the sidebar.
- Markdown, GFM tables, task lists and footnotes work.
- Fenced code blocks get syntax highlighting and a copy button. Always set the language: ```ts, ```bash, ```json.
- Show a file name in the code card's top bar with `title`: ```ts title="lib/blog.ts".
- Available components: `<Callout type="note|tip|warning" title="Optional">Text</Callout>`.
- `import` and `export` are disabled. Put images in `public/` and reference them by path.

`npm run build` fails with the file name if a post has invalid frontmatter or MDX.
