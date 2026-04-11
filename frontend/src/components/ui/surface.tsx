import Link from "next/link";
import clsx from "clsx";
import type { ComponentPropsWithoutRef, ElementType } from "react";

const SURFACE_BASE_CLASSNAME = "rounded-2xl border border-white/10 bg-[var(--surface-container)]";

type SurfaceProps<TTag extends ElementType> = {
  as?: TTag;
  className?: string;
} & Omit<ComponentPropsWithoutRef<TTag>, "as" | "className">;

export function Surface<TTag extends ElementType = "section">({
  as,
  className,
  ...props
}: SurfaceProps<TTag>) {
  const Tag = (as ?? "section") as ElementType;
  return <Tag className={clsx(SURFACE_BASE_CLASSNAME, className)} {...props} />;
}

type SurfaceLinkProps = {
  className?: string;
} & Omit<ComponentPropsWithoutRef<typeof Link>, "className">;

export function SurfaceLink({ className, ...props }: SurfaceLinkProps) {
  return <Link className={clsx(SURFACE_BASE_CLASSNAME, "block", className)} {...props} />;
}
