import Link from "next/link";
import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from "react";
import type { MDXComponents } from "mdx/types";
import { highlight } from "sugar-high";
import { lang } from "sugar-high/lang";
import { CopyButton } from "./client";
import type { BlogLabels } from "./types";

type CodeChildProps = { className?: string; children?: ReactNode; "data-meta"?: string };

/** Reads `title="app/page.tsx"` (or `title=app/page.tsx`) from the code fence meta. */
function metaTitle(meta: string | undefined): string | undefined {
  const match = meta ? /(?:^|\s)title=(?:"([^"]*)"|'([^']*)'|(\S+))/.exec(meta) : null;
  return match ? (match[1] ?? match[2] ?? match[3]) || undefined : undefined;
}

function createPre(labels: BlogLabels) {
  return function Pre({ children, ...props }: ComponentPropsWithoutRef<"pre">): ReactNode {
    if (!isValidElement<CodeChildProps>(children) || typeof children.props.children !== "string") {
      return <pre {...props}>{children}</pre>;
    }

    const fence = /language-([\w#+.-]+)/.exec(children.props.className ?? "")?.[1];
    // Unknown or missing languages render as plain text instead of falling back to JS colors.
    const language = (fence && lang(fence)) || "plaintext";
    const title = metaTitle(children.props["data-meta"]);
    const html = highlight(children.props.children.replace(/\n$/, ""), { lang: language });

    return (
      <figure className="vb-code" data-lang={language}>
        <figcaption className="vb-code-bar">
          {title ? <span className="vb-code-title">{title}</span> : null}
          <span className="vb-code-lang">{fence ?? labels.plainText}</span>
          <CopyButton label={labels.copy} copiedLabel={labels.copied} />
        </figcaption>
        <pre {...props}>
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </figure>
    );
  };
}

function A({ href = "", children, ...props }: ComponentPropsWithoutRef<"a">): ReactNode {
  if (href.startsWith("/")) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }
  const external = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
    >
      {children}
    </a>
  );
}

function heading(Tag: "h2" | "h3" | "h4") {
  return function Heading({ id, children, ...props }: ComponentPropsWithoutRef<"h2">): ReactNode {
    return (
      <Tag id={id} {...props}>
        {id ? (
          <a href={`#${id}`} className="vb-anchor">
            {children}
          </a>
        ) : (
          children
        )}
      </Tag>
    );
  };
}

function Img({ alt = "", ...props }: ComponentPropsWithoutRef<"img">): ReactNode {
  // eslint-disable-next-line @next/next/no-img-element -- MDX images have no known dimensions.
  return <img alt={alt} loading="lazy" decoding="async" {...props} />;
}

function Table(props: ComponentPropsWithoutRef<"table">): ReactNode {
  return (
    <div className="vb-table">
      <table {...props} />
    </div>
  );
}

export type CalloutProps = {
  type?: "note" | "tip" | "warning";
  title?: string;
  children?: ReactNode;
};

/** Highlighted box for notes, tips and warnings. Available in every post as `<Callout>`. */
export function Callout({ type = "note", title, children }: CalloutProps): ReactNode {
  return (
    <aside className="vb-callout" data-type={type}>
      {title ? <p className="vb-callout-title">{title}</p> : null}
      {children}
    </aside>
  );
}

export function createComponents(labels: BlogLabels): MDXComponents {
  return {
    a: A,
    pre: createPre(labels),
    img: Img,
    table: Table,
    h2: heading("h2"),
    h3: heading("h3"),
    h4: heading("h4"),
    Callout,
  };
}
