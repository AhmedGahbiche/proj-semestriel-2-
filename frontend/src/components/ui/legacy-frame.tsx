"use client";

import { useEffect, useMemo, useState } from "react";

type LegacyFrameProps = {
  page: string;
  title: string;
  className?: string;
};

export function LegacyFrame({ page, title, className }: LegacyFrameProps) {
  const [hash, setHash] = useState<string>(typeof window === "undefined" ? "" : window.location.hash || "");

  useEffect(() => {
    const onHashChange = () => {
      setHash(window.location.hash || "");
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const src = useMemo(() => {
    return `/legacy/${page}${hash || ""}`;
  }, [page, hash]);

  return (
    <iframe
      src={src}
      title={title}
      className={className ?? "h-screen w-screen border-0"}
      loading="eager"
    />
  );
}
