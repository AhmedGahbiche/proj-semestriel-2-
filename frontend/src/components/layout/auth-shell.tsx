import { PageEnter } from "@/components/ui/page-enter";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--surface)] p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[var(--primary)]/15 blur-[90px]" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[var(--secondary)]/15 blur-[90px]" />
      </div>
      <PageEnter>
        <div className="relative z-10 w-full max-w-xl">{children}</div>
      </PageEnter>
    </div>
  );
}
