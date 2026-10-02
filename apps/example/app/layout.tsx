import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3077"),
  title: { default: "Acme", template: "%s | Acme" },
  description: "Demo site for @vibelabsdotto/blog.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("font-sans antialiased", geist.variable, geistMono.variable)}>
      <body className="flex min-h-svh flex-col">
        <header className="border-b">
          <nav className="mx-auto flex h-14 w-full max-w-176 items-center gap-6 px-6 text-sm">
            <Link href="/" className="font-semibold tracking-tight">
              Acme
            </Link>
            <Link href="/blog" className="text-muted-foreground hover:text-foreground">
              Blog
            </Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t">
          <div className="mx-auto w-full max-w-176 px-6 py-6 text-sm text-muted-foreground">
            Acme demo site
          </div>
        </footer>
      </body>
    </html>
  );
}
