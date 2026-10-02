import type { MDXComponents } from "mdx/types";
import type { EvaluateOptions } from "next-mdx-remote-client/rsc";

type MdxOptions = NonNullable<EvaluateOptions["mdxOptions"]>;

export type BlogLabels = {
  allPosts: string;
  draft: string;
  rss: string;
  readingTime: (minutes: number) => string;
  noPosts: string;
};

export type BlogConfig = {
  /** Absolute origin of the site, e.g. `https://vibelabs.to`. Used for canonical URLs, RSS and the sitemap. */
  siteUrl: string;
  /** Route the blog lives under. Must match the folder in `app/`. Default: `/blog`. */
  basePath?: string;
  /** Folder with `*.mdx` posts, relative to the project root. Default: `content/blog`. */
  contentDir?: string;
  /** Heading and `<title>` of the index page. Default: `Blog`. */
  title?: string;
  /** Description of the index page, also used for the RSS channel. */
  description?: string;
  /** BCP 47 locale for dates and built-in labels (`en` and `de` ship). Default: `en`. */
  locale?: string;
  /** Override individual UI strings. */
  labels?: Partial<BlogLabels>;
  /** Fallback author for JSON-LD and RSS when a post has none. */
  author?: string;
  /** Extra or replacement MDX components. Merged over the defaults. */
  components?: MDXComponents;
  /** Appended to the built-in remark-gfm plugin. */
  remarkPlugins?: MdxOptions["remarkPlugins"];
  /** Appended to the built-in rehype-slug plugin. */
  rehypePlugins?: MdxOptions["rehypePlugins"];
};

export type ResolvedBlogConfig = Required<
  Pick<BlogConfig, "siteUrl" | "basePath" | "contentDir" | "title" | "description" | "locale">
> & {
  labels: BlogLabels;
  author?: string;
  components: MDXComponents;
  remarkPlugins: NonNullable<MdxOptions["remarkPlugins"]>;
  rehypePlugins: NonNullable<MdxOptions["rehypePlugins"]>;
};

/** Frontmatter accepted at the top of every post. */
export type PostFrontmatter = {
  title: string;
  /** `YYYY-MM-DD` */
  date: string;
  description?: string;
  /** Absolute URL or path below `public/`, used for the cover and Open Graph. */
  image?: string;
  author?: string;
  /** Drafts render in `next dev` and are excluded from production builds. */
  draft?: boolean;
};

export type Post = {
  slug: string;
  /** Path below the site root, e.g. `/blog/hello-world`. */
  path: string;
  /** Absolute URL. */
  url: string;
  title: string;
  /** `YYYY-MM-DD` */
  date: string;
  description?: string;
  image?: string;
  author?: string;
  draft: boolean;
  readingMinutes: number;
  /** MDX source without frontmatter. */
  source: string;
  /** Absolute file path, used in error messages. */
  file: string;
};

export type SlugParams = { params: Promise<{ slug: string }> };
