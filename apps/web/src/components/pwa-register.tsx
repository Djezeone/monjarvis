"use client";

import { useEffect } from "react";

/** P6 brick 4 — register the service worker (no-op where unsupported). */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failure is non-fatal: the app works without the SW.
      });
    }
  }, []);
  return null;
}
