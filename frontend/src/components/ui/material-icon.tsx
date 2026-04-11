import clsx from "clsx";

type MaterialIconProps = {
  name: string;
  filled?: boolean;
  className?: string;
};

export function MaterialIcon({ name, filled = false, className }: MaterialIconProps) {
  return (
    <span
      className={clsx("material-symbols-outlined align-middle", className)}
      style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 500` }}
      aria-hidden
    >
      {name}
    </span>
  );
}
