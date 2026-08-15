"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * P7 brick 4 — the traversal. CBOS asks that the cinematic entrance end by
 * going THROUGH the Core into the real interface, not onto a product page.
 *
 * Honesty of the medium: the link is a real anchor to /app, always present
 * and always keyboard-reachable. The animation is a decoration on top —
 * when it is refused (reduced motion) or impossible (no JS), the anchor
 * still takes you in. Nothing here is a fake door.
 */
export function CoreTraversal() {
  const reduced = useReducedMotion();
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (!entering) return;
    const t = setTimeout(() => {
      window.location.assign("/app");
    }, 900);
    return () => clearTimeout(t);
  }, [entering]);

  return (
    <>
      <h2>Welcome to JARVIS X2.</h2>
      <p className="muted">
        Pas de page produit : la porte donne directement sur le système.
      </p>
      <a
        href="/app"
        data-testid="enter-the-system"
        onClick={(e) => {
          // Let modified clicks (new tab) and reduced-motion users through
          // untouched; otherwise play the traversal, then land in the OS.
          if (reduced || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          setEntering(true);
        }}
      >
        Enter the system
      </a>
      {entering && (
        <div className="jx2-traversal" data-testid="core-traversal" aria-hidden="true">
          <span className="jx2-traversal-core" />
        </div>
      )}
    </>
  );
}
