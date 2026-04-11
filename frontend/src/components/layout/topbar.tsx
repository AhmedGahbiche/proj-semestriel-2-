"use client";

import Link from "next/link";
import { useThemeSettings } from "@/components/providers/theme-settings-provider";
import { topIconLinks } from "@/lib/nav";
import { MaterialIcon } from "@/components/ui/material-icon";
import { CircleIconButton, CircleIconLink } from "@/components/ui/circle-icon-action";

export function Topbar() {
  const { theme, toggleTheme } = useThemeSettings();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[color:var(--surface)]/90 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="font-headline text-xl font-extrabold tracking-tight text-[var(--primary)]">
          Lumiere IoT
        </Link>
        <Link href="/dashboard" className="hidden border-b-2 border-[var(--primary)] pb-1 text-sm font-semibold text-[var(--primary)] lg:block">
          Live Status
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {topIconLinks.map((iconLink) => (
          <CircleIconLink
            key={iconLink.href}
            href={iconLink.href}
            aria-label={iconLink.label}
          >
            <MaterialIcon name={iconLink.icon} />
          </CircleIconLink>
        ))}
        <CircleIconButton
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          <MaterialIcon name={theme === "dark" ? "light_mode" : "dark_mode"} />
        </CircleIconButton>
      </div>
    </header>
  );
}
