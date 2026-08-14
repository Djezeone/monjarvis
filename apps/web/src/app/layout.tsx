import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { JarvisRuntimeProvider } from "@/jarvis/runtime/JarvisRuntimeProvider";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";
import "@/styles/jarvis-x2.css";
import "@/styles/living-interface.css";
import "@/jarvis/components/cinematic/cinematic.css";
import "@/jarvis/components/intelligence/intelligence.css";

export const metadata: Metadata = {
  title: "JARVIS X2",
  description: "Personal Agent OS — local-first, hands-free-first.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#05070A",
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
        <main>
          <JarvisRuntimeProvider>{children}</JarvisRuntimeProvider>
        </main>
        <PwaRegister />
      </body>
    </html>
  );
}
