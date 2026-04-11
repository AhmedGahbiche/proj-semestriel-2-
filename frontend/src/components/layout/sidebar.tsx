"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { sideNavItems } from "@/lib/nav";
import { MaterialIcon } from "@/components/ui/material-icon";
import { GradientPillLink } from "@/components/ui/gradient-pill";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-white/10 bg-[var(--surface-container-low)] p-4">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--primary),var(--primary-container))]">
          <MaterialIcon name="hub" filled className="text-[var(--on-primary)]" />
        </div>
        <div>
          <p className="font-headline text-sm font-bold text-[var(--primary)]">Nocturne Protocol</p>
          <p className="text-xs text-[var(--outline)]">IoT Control Center</p>
        </div>
      </div>
      <nav className="space-y-1">
        {sideNavItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200",
                active
                  ? "bg-[var(--surface-container)] text-[var(--primary)]"
                  : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-variant)] hover:text-[var(--on-surface)]",
              )}
            >
              <MaterialIcon name={item.icon} filled={active} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <GradientPillLink href="/deploy-trap" variant="sidebar" className="mt-auto">
        <MaterialIcon name="add_circle" className="text-sm" />
        Deploy New Trap
      </GradientPillLink>
    </aside>
  );
}
