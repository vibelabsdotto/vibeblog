import Link from "next/link";
import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from "react";
import type { MDXComponents } from "mdx/types";
import { highlight } from "sugar-high";
import { lang } from "sugar-high/lang";

type CodeChildProps = { className?: string; children?: ReactNode };

function Pre({ children, ...props }: ComponentPropsWithoutRef<"pre">): ReactNode {
  if (!isValidElement<CodeChildProps>(children) || typeof children.props.children !== "string") {
    return <pre {...props}>{children}</pre>;
  }

  const fence = /language-([\w#+.-]+)/.exec(children.props.className ?? "")?.[1];
  // Unknown or missing languages render as plain text instead of falling back to JS colors.
  const language = (fence && lang(fence)) || "plaintext";
  const html = highlight(children.props.children.replace(/\n$/, ""), { lang: language });

  return (
    <div className="vb-code" data-lang={language}>
      {fence ? <span className="vb-code-lang">{fence}</span> : null}
      <pre {...props}>
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
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

export const defaultComponents: MDXComponents = {
  a: A,
  pre: Pre,
  img: Img,
  table: Table,
  h2: heading("h2"),
  h3: heading("h3"),
  h4: heading("h4"),
  Callout,
};
