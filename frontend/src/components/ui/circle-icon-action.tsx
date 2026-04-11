import Link from "next/link";
import clsx from "clsx";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const BASE_CLASSNAME =
  "rounded-full p-2 text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container)] hover:text-[var(--on-surface)]";

type CircleIconActionBaseProps = {
  className?: string;
  children: ReactNode;
};

type CircleIconLinkProps = CircleIconActionBaseProps & Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children">;

type CircleIconButtonProps = CircleIconActionBaseProps &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "children">;

export function CircleIconLink({ className, children, ...props }: CircleIconLinkProps) {
  return (
    <Link className={clsx(BASE_CLASSNAME, className)} {...props}>
      {children}
    </Link>
  );
}

export function CircleIconButton({ className, children, ...props }: CircleIconButtonProps) {
  return (
    <button type="button" className={clsx(BASE_CLASSNAME, className)} {...props}>
      {children}
    </button>
  );
}
