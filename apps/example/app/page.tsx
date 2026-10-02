import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { blog } from "@/lib/blog";

export default function Home() {
  const latest = blog.getPosts().slice(0, 3);

  return (
    <div className="mx-auto flex w-full max-w-176 flex-col gap-12 px-6 py-16">
      <section className="flex max-w-2xl flex-col gap-5">
        <h1 className="text-4xl font-semibold tracking-tight text-balance">
          A normal marketing site with a blog bolted on.
        </h1>
        <p className="text-lg text-muted-foreground text-pretty">
          Everything under <code className="font-mono text-foreground">/blog</code> comes from{" "}
          <code className="font-mono text-foreground">@vibelabsdotto/blog</code>. The site only owns five
          route files and a folder of MDX posts.
        </p>
        <div>
          <Link href="/blog" className={buttonVariants()}>
            Read the blog
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">Latest posts</h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {latest.map((post) => (
            <li key={post.slug}>
              <Link
                href={post.path}
                className="flex h-full flex-col gap-2 rounded-xl border p-5 transition-colors hover:bg-muted"
              >
                <span className="font-medium leading-snug">{post.title}</span>
                {post.description ? (
                  <span className="text-sm text-muted-foreground">{post.description}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
