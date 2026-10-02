import type { BlogLabels } from "./types";

const en: BlogLabels = {
  allPosts: "All posts",
  draft: "Draft",
  rss: "RSS",
  readingTime: (minutes) => `${minutes} min read`,
  updated: "Updated",
  noPosts: "No posts yet.",
  onThisPage: "On this page",
  morePosts: "More posts",
  copy: "Copy code",
  copied: "Copied",
  plainText: "text",
};

const de: BlogLabels = {
  allPosts: "Alle Beiträge",
  draft: "Entwurf",
  rss: "RSS",
  readingTime: (minutes) => `${minutes} Min. Lesezeit`,
  updated: "Aktualisiert",
  noPosts: "Noch keine Beiträge.",
  onThisPage: "Auf dieser Seite",
  morePosts: "Weitere Beiträge",
  copy: "Code kopieren",
  copied: "Kopiert",
  plainText: "text",
};

export function resolveLabels(locale: string, overrides?: Partial<BlogLabels>): BlogLabels {
  const base = locale.toLowerCase().startsWith("de") ? de : en;
  return { ...base, ...overrides };
}

export function formatDate(date: string, locale: string): string {
  // Dates are calendar days. Format in UTC so no server timezone shifts them by one.
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
