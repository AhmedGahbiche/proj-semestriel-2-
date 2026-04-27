import { redirect } from "next/navigation";
import { Surface } from "@/components/ui/surface";
import { backendJson } from "@/lib/backend-server";

export const dynamic = "force-dynamic";

type ResetResponse = {
  resetCount: number;
};

async function doReset() {
  "use server";
  const res = await backendJson<ResetResponse>("/api/sensors/reset-triggered", {
    method: "POST",
    admin: true,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  });

  redirect(`/actions/reset-triggered?done=1&count=${encodeURIComponent(String(res.resetCount ?? 0))}`);
}

export default function ResetTriggeredPage({
  searchParams,
}: {
  searchParams?: { done?: string; count?: string };
}) {
  const done = searchParams?.done === "1";
  const count = typeof searchParams?.count === "string" ? searchParams.count : "0";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-extrabold">Reset Triggered</h1>
        <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Re-arms all TRIGGERED sensors in the backend.</p>
      </header>

      <Surface className="p-6">
        {done ? (
          <div className="space-y-2">
            <p className="text-sm text-[var(--on-surface)]">Done.</p>
            <p className="text-sm text-[var(--on-surface-variant)]">Reset count: {count}</p>
          </div>
        ) : (
          <form action={doReset}>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--on-primary)]"
            >
              Run Reset
            </button>
          </form>
        )}
      </Surface>
    </div>
  );
}
