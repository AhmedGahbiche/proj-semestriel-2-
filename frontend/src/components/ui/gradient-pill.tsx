import Link from "next/link";
import clsx from "clsx";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type GradientPillVariant = "action" | "compact" | "sidebar";

const BASE_CLASSNAME =
  "rounded-full bg-[linear-gradient(90deg,var(--primary),var(--primary-container))] font-bold text-[var(--on-primary)]";

const VARIANT_CLASSNAME: Record<GradientPillVariant, string> = {
  action: "px-5 py-2 text-sm",
  compact: "inline-flex items-center px-4 py-2 text-xs uppercase tracking-[0.12em]",
  sidebar:
    "flex items-center justify-center gap-2 px-4 py-3 text-xs uppercase tracking-[0.18em] transition hover:brightness-110",
};

type GradientPillBaseProps = {
  variant?: GradientPillVariant;
  className?: string;
  children: ReactNode;
};

type GradientPillLinkProps = GradientPillBaseProps & Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children">;

export function GradientPillLink({ variant = "action", className, children, ...props }: GradientPillLinkProps) {
  return (
    <Link className={clsx(BASE_CLASSNAME, VARIANT_CLASSNAME[variant], className)} {...props}>
      {children}
    </Link>
  );
}

type GradientPillButtonProps = GradientPillBaseProps &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "children">;

export function GradientPillButton({ variant = "action", className, children, ...props }: GradientPillButtonProps) {
  return (
    <button type="button" className={clsx(BASE_CLASSNAME, VARIANT_CLASSNAME[variant], className)} {...props}>
      {children}
    </button>
  );
}
