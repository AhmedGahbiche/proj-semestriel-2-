import { Surface } from "@/components/ui/surface";
import { backendJson } from "@/lib/backend-server";
import type { BackendSensor } from "../dashboard/dashboard-data";

export const dynamic = "force-dynamic";

type AlertsResponse = {
  triggered: BackendSensor[];
  offline: BackendSensor[];
  lowBattery: BackendSensor[];
};

function AlertsSection({ title, items }: { title: string; items: BackendSensor[] }) {
  return (
    <Surface className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-headline text-lg font-bold">{title}</h2>
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">{items.length}</span>
      </div>
      <div className="mt-4 space-y-2">
        {items.length ? (
          items.slice(0, 20).map((s) => (
            <div key={s.id} className="rounded-xl bg-[var(--surface-container-low)] p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-[var(--on-surface)]">{s.trapId}</p>
                <span className="text-xs text-[var(--on-surface-variant)]">{s.status}</span>
              </div>
              <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
                {s.floorLabel ?? "—"} · {s.zone ?? "—"} · battery {typeof s.batteryPct === "number" ? `${s.batteryPct}%` : "—"}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-xl bg-[var(--surface-container-low)] p-4 text-sm text-[var(--on-surface-variant)]">None.</div>
        )}
      </div>
    </Surface>
  );
}

export default async function NotificationsPage() {
  const alerts = await backendJson<AlertsResponse>("/api/alerts/active", { admin: true });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-extrabold">Notifications</h1>
        <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Active alerts derived from backend sensor status.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AlertsSection title="Triggered" items={alerts.triggered ?? []} />
        <AlertsSection title="Offline" items={alerts.offline ?? []} />
        <AlertsSection title="Low Battery" items={alerts.lowBattery ?? []} />
      </div>
    </div>
  );
}
