"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type NavigateMessage = {
  type: "lumiere:navigate";
  href: string;
};

function isNavigateMessage(value: unknown): value is NavigateMessage {
  if (!value || typeof value !== "object") return false;
  const msg = value as Record<string, unknown>;
  return msg.type === "lumiere:navigate" && typeof msg.href === "string";
}

export function LegacyNavBridge() {
  const router = useRouter();

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Same-origin only.
      if (event.origin !== window.location.origin) return;
      if (!isNavigateMessage(event.data)) return;

      const href = event.data.href;
      if (!href || typeof href !== "string") return;

      // Ensure leading slash for app routes.
      const nextHref = href.startsWith("/") ? href : `/${href}`;
      router.push(nextHref);
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  return null;
}
