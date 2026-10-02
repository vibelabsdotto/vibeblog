import type { Metadata, MetadataRoute } from "next";
import type { Post, ResolvedBlogConfig } from "./types";

function absolute(url: string, siteUrl: string): string {
  return new URL(url, `${siteUrl}/`).toString();
}

export function indexMetadata(config: ResolvedBlogConfig): Metadata {
  const url = `${config.siteUrl}${config.basePath}`;
  return {
    title: config.title,
    description: config.description || undefined,
    alternates: {
      canonical: url,
      types: { "application/rss+xml": `${url}/rss.xml` },
    },
    openGraph: { type: "website", title: config.title, url },
  };
}

export function postMetadata(post: Post, config: ResolvedBlogConfig): Metadata {
  const images = post.image ? [absolute(post.image, config.siteUrl)] : undefined;
  const author = post.author ?? config.author;
  return {
    title: post.title,
    description: post.description,
    authors: author ? [{ name: author }] : undefined,
    alternates: { canonical: post.url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: post.url,
      publishedTime: post.date,
      authors: author ? [author] : undefined,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: post.title,
      description: post.description,
      images,
    },
  };
}

export function postJsonLd(post: Post, config: ResolvedBlogConfig): string {
  const author = post.author ?? config.author;
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    url: post.url,
    mainEntityOfPage: post.url,
    image: post.image ? absolute(post.image, config.siteUrl) : undefined,
    author: author ? { "@type": "Person", name: author } : undefined,
  };
  // `<` would let post content close the script tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(date: string): string {
  return new Date(`${date}T00:00:00Z`).toUTCString();
}

export function renderRss(posts: Post[], config: ResolvedBlogConfig): string {
  const url = `${config.siteUrl}${config.basePath}`;
  const items = posts
    .map(
      (post) => `    <item>
      <title>${xml(post.title)}</title>
      <link>${xml(post.url)}</link>
      <guid isPermaLink="true">${xml(post.url)}</guid>
      <pubDate>${rfc822(post.date)}</pubDate>${
        post.description ? `\n      <description>${xml(post.description)}</description>` : ""
      }
    </item>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(config.title)}</title>
    <link>${xml(url)}</link>
    <description>${xml(config.description || config.title)}</description>
    <language>${xml(config.locale)}</language>
    <atom:link href="${xml(`${url}/rss.xml`)}" rel="self" type="application/rss+xml" />${
      posts[0] ? `\n    <lastBuildDate>${rfc822(posts[0].date)}</lastBuildDate>` : ""
    }
${items}
  </channel>
</rss>
`;
}

export function sitemapEntries(posts: Post[], config: ResolvedBlogConfig): MetadataRoute.Sitemap {
  return [
    {
      url: `${config.siteUrl}${config.basePath}`,
      lastModified: posts[0]?.date,
      changeFrequency: "weekly",
    },
    ...posts.map((post) => ({ url: post.url, lastModified: post.date })),
  ];
}
