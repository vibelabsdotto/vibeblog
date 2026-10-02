# Blog posts

Every `.mdx` file in this folder is one post. The file name is the URL slug:
`my-post.mdx` becomes `/blog/my-post`. Use lowercase letters, digits and hyphens only.

## Frontmatter

```yaml
---
title: Post title            # required, the visible H1
date: 2026-01-31             # required, YYYY-MM-DD, first publication
updated: 2026-02-14          # optional, YYYY-MM-DD, set on real content changes
description: One sentence.   # recommended, meta description, list and RSS
seoTitle: Full <title> tag   # optional, when the search title differs from the H1
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

## Publishing

- New posts start with `draft: true`. A human removes it after review.
- Keep the slug once a post is live. Renaming the file changes the URL and loses its ranking.
- Bump `updated` only for real content changes, not for typo fixes.
