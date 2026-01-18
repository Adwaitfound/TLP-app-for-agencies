"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isSecureContext = window.location.protocol === "https:" || window.location.hostname === "localhost";
    if (!isSecureContext) return;

    let cancelled = false;

    const register = async () => {
      try {
        // Attempt to fetch the service worker file directly to check if it's accessible
        const swCheckResponse = await fetch("/sw.js", { 
          method: "HEAD",
          cache: "no-cache"
        }).catch(() => null);
        
        if (!swCheckResponse || !swCheckResponse.ok) {
          console.warn("🔄 SW Register: sw.js file not accessible (HTTP " + (swCheckResponse?.status || "unknown") + ")");
          return;
        }

        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (!cancelled) {
          // Trigger an update check on load so stale tabs see the banner quickly.
          registration.update().catch(() => {});
        }
      } catch (err) {
        console.warn("🔄 SW Register: failed", err);
      }
    };

    register();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
