"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { TocItem } from "./rehype";

// Interactive parts only. Everything else renders on the server.

const ICON = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function CopyIcon(): ReactNode {
  return (
    <svg {...ICON}>
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon(): ReactNode {
  return (
    <svg {...ICON}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function selectContents(element: Element): void {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function CopyButton({ label, copiedLabel }: { label: string; copiedLabel: string }): ReactNode {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy(event: MouseEvent<HTMLButtonElement>): Promise<void> {
    // Read the rendered code instead of passing it as a prop, so it isn't sent twice.
    const code = event.currentTarget.closest(".vb-code")?.querySelector("pre code");
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.textContent ?? "");
    } catch {
      // No clipboard access (insecure origin, denied permission): select the code for Cmd+C.
      selectContents(code);
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <span className="vb-copy-status" aria-live="polite">
        {copied ? copiedLabel : ""}
      </span>
      <button
        type="button"
        className="vb-copy"
        aria-label={label}
        title={label}
        data-copied={copied ? "" : undefined}
        onClick={copy}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </>
  );
}

/** Heading closer to the top than this counts as the current section. */
const ACTIVE_OFFSET = 120;

export function TocList({ items }: { items: TocItem[] }): ReactNode {
  const [active, setActive] = useState<string | undefined>(undefined);
  const ids = items.map((item) => item.id).join(" ");

  useEffect(() => {
    const headings = ids
      .split(" ")
      .map((id) => document.getElementById(id))
      .filter((element) => element !== null);
    let frame = 0;

    function update(): void {
      frame = 0;
      let current: string | undefined;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > ACTIVE_OFFSET) break;
        current = heading.id;
      }
      // Short last sections never reach the offset. At the bottom, the last heading wins.
      const root = document.documentElement;
      if (headings.length && window.innerHeight + window.scrollY >= root.scrollHeight - 2) {
        current = headings[headings.length - 1]?.id;
      }
      setActive(current);
    }

    function schedule(): void {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ids]);

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} data-depth={item.depth}>
          <a href={`#${item.id}`} aria-current={item.id === active ? "location" : undefined}>
            {item.text}
          </a>
        </li>
      ))}
    </ul>
  );
}
