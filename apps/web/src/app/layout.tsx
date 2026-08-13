import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "JARVIS X2",
  description: "Personal Agent OS — local-first, hands-free-first.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <nav className="topnav" aria-label="Navigation principale">
          <Link href="/" className="brand">
            JARVIS&nbsp;X2
          </Link>
          <div className="links">
            <Link href="/app">Cockpit</Link>
            <Link href="/lab/core">Lab&nbsp;Core</Link>
            <Link href="/lab/cinematic">Cinematic</Link>
            <Link href="/lab/living">Living</Link>
            <Link href="/lab/intelligence">Intelligence</Link>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
