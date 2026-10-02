import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getFrontmatter } from "next-mdx-remote-client/utils";
import type { Post, ResolvedBlogConfig } from "./types";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WORDS_PER_MINUTE = 220;

// Sync fs on purpose: Next treats `readFileSync` as a predictable value during prerendering,
// so the same code works with and without `cacheComponents`.

function fail(file: string, message: string): never {
  throw new Error(`[vibeblog] ${path.relative(process.cwd(), file)}: ${message}`);
}

function toDateString(value: unknown, file: string): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && DATE_PATTERN.test(value.trim())) {
    return value.trim();
  }
  return fail(file, `frontmatter "date" must be YYYY-MM-DD, got ${JSON.stringify(value)}`);
}

function optionalString(value: unknown, key: string, file: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") fail(file, `frontmatter "${key}" must be a string`);
  return value;
}

function readingMinutes(source: string): number {
  const words = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function readPost(file: string, config: ResolvedBlogConfig): Post {
  const slug = path.basename(file, ".mdx");
  if (!SLUG_PATTERN.test(slug)) {
    fail(file, `file name must be a lowercase slug like "my-first-post.mdx"`);
  }

  const { frontmatter, strippedSource } = getFrontmatter<Record<string, unknown>>(
    readFileSync(file, "utf8"),
  );

  const title = optionalString(frontmatter.title, "title", file);
  if (!title) fail(file, `frontmatter "title" is required`);

  const draft = frontmatter.draft ?? false;
  if (typeof draft !== "boolean") fail(file, `frontmatter "draft" must be true or false`);

  const postPath = `${config.basePath}/${slug}`;

  return {
    slug,
    path: postPath,
    url: `${config.siteUrl}${postPath}`,
    title,
    date: toDateString(frontmatter.date, file),
    description: optionalString(frontmatter.description, "description", file),
    image: optionalString(frontmatter.image, "image", file),
    author: optionalString(frontmatter.author, "author", file),
    draft,
    readingMinutes: readingMinutes(strippedSource),
    source: strippedSource,
    file,
  };
}

export function createPostStore(config: ResolvedBlogConfig) {
  // Posts are read while prerendering, not per request. Without the ignore hint Turbopack
  // traces the whole project into the server output because the path is only known at runtime.
  const dir = path.resolve(/* turbopackIgnore: true */ process.cwd(), config.contentDir);
  const isProduction = process.env.NODE_ENV === "production";
  let cached: Post[] | undefined;

  function load(): Post[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
      .map((entry) => readPost(path.join(dir, entry.name), config))
      .filter((post) => !(isProduction && post.draft))
      .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  }

  return {
    /** Published posts, newest first. Drafts are included only outside production. */
    getPosts(): Post[] {
      // Re-read in dev so edits show up without a restart. Builds read once.
      if (!isProduction) return load();
      cached ??= load();
      return cached;
    },
    getPost(slug: string): Post | undefined {
      return this.getPosts().find((post) => post.slug === slug);
    },
  };
}
