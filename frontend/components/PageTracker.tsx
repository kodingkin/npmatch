"use client";

import { useEffect } from "react";

export function PageTracker() {
  useEffect(() => {
    fetch("/api/track/pageview", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrer: document.referrer }),
    }).catch(() => {
      // Fire-and-forget: analytics must never break the page.
    });
  }, []);

  return null;
}
