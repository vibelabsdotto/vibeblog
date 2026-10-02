// Keep bare `next/*` specifiers. Next aliases them per layer; `next/link.js` breaks route handlers.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata, MetadataRoute } from "next";
import type { ReactNode } from "react";
import { evaluate } from "next-mdx-remote-client/rsc";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { TocList } from "./client";
import { createPostStore } from "./content";
import { formatDate, resolveLabels } from "./labels";
import { createComponents } from "./mdx-components";
import { rehypeVibeblog, type TocItem } from "./rehype";
import {
  absoluteUrl,
  indexMetadata,
  postJsonLd,
  postMetadata,
  renderRss,
  sitemapEntries,
} from "./seo";
import type { BlogConfig, BlogCta, Post, ResolvedBlogConfig, SlugParams } from "./types";

export { Callout, type CalloutProps } from "./mdx-components";
export type { TocItem } from "./rehype";
export type { BlogConfig, BlogCta, BlogLabels, Post, PostFrontmatter } from "./types";

const MORE_POSTS = 4;
/**
 * Returned by generateStaticParams while no post is published. With `cacheComponents` Next
 * rejects an empty list; the placeholder renders a 404. Slugs are validated, so no post can
 * collide with it.
 */
const EMPTY_SLUG = "_";

function resolveConfig(config: BlogConfig): ResolvedBlogConfig {
  let siteUrl: string;
  try {
    siteUrl = new URL(config.siteUrl).origin;
  } catch {
    throw new Error(`[vibeblog] siteUrl must be an absolute URL, got ${JSON.stringify(config.siteUrl)}`);
  }

  const basePath = `/${(config.basePath ?? "/blog").replace(/^\/+|\/+$/g, "")}`;
  if (basePath === "/") {
    throw new Error(`[vibeblog] basePath must name a route segment like "/blog"`);
  }

  const locale = config.locale ?? "en";
  const labels = resolveLabels(locale, config.labels);
  return {
    siteUrl,
    basePath,
    contentDir: config.contentDir ?? "content/blog",
    title: config.title ?? "Blog",
    description: config.description ?? "",
    locale,
    sidebar: config.sidebar ?? true,
    labels,
    author: config.author,
    ogImage: config.ogImage ? absoluteUrl(config.ogImage, siteUrl) : undefined,
    cta: config.cta,
    components: { ...createComponents(labels), ...config.components },
    remarkPlugins: [remarkGfm, ...(config.remarkPlugins ?? [])],
    rehypePlugins: config.rehypePlugins ?? [],
  };
}

export function createBlog(input: BlogConfig) {
  const config = resolveConfig(input);
  const store = createPostStore(config);
  const { labels } = config;

  async function findPost(params: SlugParams["params"]): Promise<Post> {
    const { slug } = await params;
    const post = store.getPost(slug);
    if (!post) notFound();
    return post;
  }

  function IndexPage(): ReactNode {
    const posts = store.getPosts();
    return (
      <div className="vb-root vb-index">
        <header className="vb-header">
          <h1 className="vb-title">{config.title}</h1>
          {config.description ? <p className="vb-description">{config.description}</p> : null}
        </header>

        {posts.length === 0 ? (
          <p className="vb-empty">{labels.noPosts}</p>
        ) : (
          <ul className="vb-list">
            {posts.map((post) => (
              <li key={post.slug} className="vb-item">
                <Link href={post.path}>
                  <time dateTime={post.date}>{formatDate(post.date, config.locale)}</time>
                  <div>
                    <span className="vb-item-title">
                      {post.title}
                      {post.draft ? <span className="vb-badge">{labels.draft}</span> : null}
                    </span>
                    {post.description ? <p className="vb-item-desc">{post.description}</p> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <footer className="vb-footer">
          <a href={`${config.basePath}/rss.xml`}>{labels.rss}</a>
        </footer>
      </div>
    );
  }

  function Cta({ cta }: { cta: BlogCta }): ReactNode {
    return (
      <aside className="vb-cta">
        <div className="vb-cta-copy">
          <p className="vb-cta-title">{cta.title}</p>
          {cta.text ? <p className="vb-cta-text">{cta.text}</p> : null}
        </div>
        {cta.href.startsWith("/") ? (
          <Link href={cta.href} className="vb-cta-button">
            {cta.label}
          </Link>
        ) : (
          <a href={cta.href} className="vb-cta-button">
            {cta.label}
          </a>
        )}
      </aside>
    );
  }

  function Sidebar({ post, toc }: { post: Post; toc: TocItem[] }): ReactNode {
    const others = store
      .getPosts()
      .filter((other) => other.slug !== post.slug)
      .slice(0, MORE_POSTS);
    // A single heading is not worth a table of contents.
    const showToc = toc.length > 1;
    if (!showToc && others.length === 0) return null;

    return (
      <aside className="vb-sidebar">
        <div className="vb-sidebar-inner">
          {showToc ? (
            <nav className="vb-toc" aria-label={labels.onThisPage}>
              <p className="vb-sidebar-heading">{labels.onThisPage}</p>
              <TocList items={toc} />
            </nav>
          ) : null}
          {others.length > 0 ? (
            <nav className="vb-more" aria-label={labels.morePosts}>
              <p className="vb-sidebar-heading">{labels.morePosts}</p>
              <ul>
                {others.map((other) => (
                  <li key={other.slug}>
                    <Link href={other.path}>
                      <span>{other.title}</span>
                      <time dateTime={other.date}>{formatDate(other.date, config.locale)}</time>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </aside>
    );
  }

  async function PostPage({ params }: SlugParams): Promise<ReactNode> {
    const post = await findPost(params);

    // Filled by rehypeVibeblog while this post compiles.
    const toc: TocItem[] = [];
    const { content, error } = await evaluate({
      source: post.source,
      components: config.components,
      options: {
        disableImports: true,
        disableExports: true,
        mdxOptions: {
          remarkPlugins: config.remarkPlugins,
          rehypePlugins: [rehypeSlug, [rehypeVibeblog, { toc }], ...config.rehypePlugins],
        },
      },
    });
    // Fail the build with the file name instead of shipping a broken post.
    if (error) throw new Error(`[vibeblog] ${post.file}: ${error.message}`, { cause: error });

    return (
      <div className="vb-root vb-post">
        <div className="vb-post-grid">
          <article className="vb-article">
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: postJsonLd(post, config) }}
            />
            <Link href={config.basePath} className="vb-back">
              ← {labels.allPosts}
            </Link>
            <header className="vb-post-header">
              <h1 className="vb-title">{post.title}</h1>
              <div className="vb-meta">
                <time dateTime={post.date}>{formatDate(post.date, config.locale)}</time>
                <span aria-hidden>·</span>
                <span>{labels.readingTime(post.readingMinutes)}</span>
                {post.updated && post.updated !== post.date ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      {labels.updated}{" "}
                      <time dateTime={post.updated}>{formatDate(post.updated, config.locale)}</time>
                    </span>
                  </>
                ) : null}
                {post.draft ? <span className="vb-badge">{labels.draft}</span> : null}
              </div>
            </header>
            {post.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- cover dimensions are unknown.
              <img className="vb-cover" src={post.image} alt="" />
            ) : null}
            <div className="vb-prose">{content}</div>
            {config.cta ? <Cta cta={config.cta} /> : null}
          </article>
          {config.sidebar ? <Sidebar post={post} toc={toc} /> : null}
        </div>
      </div>
    );
  }

  return {
    config,
    getPosts: () => store.getPosts(),
    getPost: (slug: string) => store.getPost(slug),

    /** `export default blog.IndexPage` in `app/<basePath>/page.tsx` */
    IndexPage,
    /** `export const metadata = blog.indexMetadata` in `app/<basePath>/page.tsx` */
    indexMetadata: indexMetadata(config),

    /** `export default blog.PostPage` in `app/<basePath>/[slug]/page.tsx` */
    PostPage,
    generateStaticParams: (): { slug: string }[] => {
      const posts = store.getPosts();
      return posts.length > 0 ? posts.map((post) => ({ slug: post.slug })) : [{ slug: EMPTY_SLUG }];
    },
    generateMetadata: async ({ params }: SlugParams): Promise<Metadata> =>
      postMetadata(await findPost(params), config),

    /** `export const GET = blog.rss` in `app/<basePath>/rss.xml/route.ts` */
    rss: (): Response =>
      new Response(renderRss(store.getPosts(), config), {
        headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
      }),

    /** Spread into the array returned by `app/sitemap.ts`. */
    sitemap: (): MetadataRoute.Sitemap => sitemapEntries(store.getPosts(), config),
  };
}

export type Blog = ReturnType<typeof createBlog>;
