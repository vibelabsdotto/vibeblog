import type { Metadata, MetadataRoute } from "next";
import type { Post, ResolvedBlogConfig } from "./types";

export function absoluteUrl(url: string, siteUrl: string): string {
  return new URL(url, `${siteUrl}/`).toString();
}

function postImage(post: Post, config: ResolvedBlogConfig): string | undefined {
  return post.image ? absoluteUrl(post.image, config.siteUrl) : config.ogImage;
}

function lastModified(post: Post): string {
  return post.updated ?? post.date;
}

export function indexMetadata(config: ResolvedBlogConfig): Metadata {
  const url = `${config.siteUrl}${config.basePath}`;
  const images = config.ogImage ? [config.ogImage] : undefined;
  return {
    title: config.title,
    description: config.description || undefined,
    alternates: {
      canonical: url,
      types: { "application/rss+xml": `${url}/rss.xml` },
    },
    // A page's `openGraph` replaces the layout's completely, so it carries its own image.
    openGraph: { type: "website", title: config.title, description: config.description || undefined, url, images },
    twitter: { card: images ? "summary_large_image" : "summary", title: config.title, images },
  };
}

export function postMetadata(post: Post, config: ResolvedBlogConfig): Metadata {
  const image = postImage(post, config);
  const images = image ? [image] : undefined;
  const author = post.author ?? config.author;
  const socialTitle = post.seoTitle ?? post.title;
  return {
    // `absolute` skips the site's title template: an SEO title is written as the full string.
    title: post.seoTitle ? { absolute: post.seoTitle } : post.title,
    description: post.description,
    authors: author ? [{ name: author }] : undefined,
    alternates: { canonical: post.url },
    openGraph: {
      type: "article",
      title: socialTitle,
      description: post.description,
      url: post.url,
      publishedTime: post.date,
      modifiedTime: post.updated,
      authors: author ? [author] : undefined,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: socialTitle,
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
    dateModified: lastModified(post),
    url: post.url,
    mainEntityOfPage: post.url,
    image: postImage(post, config),
    inLanguage: config.locale,
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
  const newest = posts.map(lastModified).sort().at(-1);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(config.title)}</title>
    <link>${xml(url)}</link>
    <description>${xml(config.description || config.title)}</description>
    <language>${xml(config.locale)}</language>
    <atom:link href="${xml(`${url}/rss.xml`)}" rel="self" type="application/rss+xml" />${
      newest ? `\n    <lastBuildDate>${rfc822(newest)}</lastBuildDate>` : ""
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
      lastModified: posts.map(lastModified).sort().at(-1),
    },
    ...posts.map((post) => ({ url: post.url, lastModified: lastModified(post) })),
  ];
}
