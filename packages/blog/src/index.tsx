// Keep bare `next/*` specifiers. Next aliases them per layer; `next/link.js` breaks route handlers.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata, MetadataRoute } from "next";
import type { ReactNode } from "react";
import { evaluate } from "next-mdx-remote-client/rsc";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { createPostStore } from "./content";
import { formatDate, resolveLabels } from "./labels";
import { defaultComponents } from "./mdx-components";
import { indexMetadata, postJsonLd, postMetadata, renderRss, sitemapEntries } from "./seo";
import type { BlogConfig, Post, ResolvedBlogConfig, SlugParams } from "./types";

export { Callout, type CalloutProps } from "./mdx-components";
export type { BlogConfig, BlogLabels, Post, PostFrontmatter } from "./types";

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
  return {
    siteUrl,
    basePath,
    contentDir: config.contentDir ?? "content/blog",
    title: config.title ?? "Blog",
    description: config.description ?? "",
    locale,
    labels: resolveLabels(locale, config.labels),
    author: config.author,
    components: { ...defaultComponents, ...config.components },
    remarkPlugins: [remarkGfm, ...(config.remarkPlugins ?? [])],
    rehypePlugins: [rehypeSlug, ...(config.rehypePlugins ?? [])],
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
      <div className="vb-root">
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

  async function PostPage({ params }: SlugParams): Promise<ReactNode> {
    const post = await findPost(params);

    const { content, error } = await evaluate({
      source: post.source,
      components: config.components,
      options: {
        disableImports: true,
        disableExports: true,
        mdxOptions: {
          remarkPlugins: config.remarkPlugins,
          rehypePlugins: config.rehypePlugins,
        },
      },
    });
    // Fail the build with the file name instead of shipping a broken post.
    if (error) throw new Error(`[vibeblog] ${post.file}: ${error.message}`, { cause: error });

    return (
      <article className="vb-root">
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
            {post.draft ? <span className="vb-badge">{labels.draft}</span> : null}
          </div>
        </header>
        {post.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- cover dimensions are unknown.
          <img className="vb-cover" src={post.image} alt="" />
        ) : null}
        <div className="vb-prose">{content}</div>
      </article>
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
    generateStaticParams: (): { slug: string }[] =>
      store.getPosts().map((post) => ({ slug: post.slug })),
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
