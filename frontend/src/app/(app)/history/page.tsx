import { Surface } from "@/components/ui/surface";
import { backendJson } from "@/lib/backend-server";
import type { BackendEvent } from "../dashboard/dashboard-data";
import { mapBackendSeverity } from "../dashboard/dashboard-data";

export const dynamic = "force-dynamic";

type EventsResponse = {
  items: BackendEvent[];
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

export default async function HistoryPage() {
  const res = await backendJson<EventsResponse>("/api/events?limit=100", { admin: true });
  const events = res.items ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-extrabold">History</h1>
        <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Most recent backend events.</p>
      </header>

      <Surface className="overflow-hidden">
        <div className="divide-y divide-white/10">
          {events.length ? (
            events.map((e) => {
              const severity = mapBackendSeverity(e.severity);
              return (
                <article key={e.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--on-surface)]">{e.title}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">{severity}</span>
                      <time className="text-xs text-[var(--on-surface-variant)]">{formatDateTime(e.createdAt)}</time>
                    </div>
                  </div>
                  {e.detail ? <p className="mt-1 text-sm text-[var(--on-surface-variant)]">{e.detail}</p> : null}
                </article>
              );
            })
          ) : (
            <div className="p-8 text-sm text-[var(--on-surface-variant)]">No events yet.</div>
          )}
        </div>
      </Surface>
    </div>
  );
}
