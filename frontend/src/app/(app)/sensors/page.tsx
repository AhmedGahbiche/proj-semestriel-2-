import { Surface } from "@/components/ui/surface";
import { backendJson } from "@/lib/backend-server";

export const dynamic = "force-dynamic";

type SensorItem = {
  id: string;
  trapId: string;
  floorLabel: string | null;
  zone: string | null;
  status: "ARMED" | "TRIGGERED" | "LOW_BATTERY" | "OFFLINE";
  lastActivityAt: string | null;
  batteryPct: number | null;
  signalLevel: number | null;
  updatedAt: string;
};

type SensorsResponse = {
  items: SensorItem[];
  total: number;
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

export default async function SensorsPage() {
  const res = await backendJson<SensorsResponse>("/api/sensors?page=1&pageSize=100", { admin: true });
  const sensors = res.items ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-extrabold">Sensors</h1>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Showing {sensors.length} of {res.total ?? sensors.length}.</p>
        </div>
      </header>

      <Surface className="overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[var(--surface-container-low)] text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">
              <tr>
                <th className="px-4 py-3">Trap</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Battery</th>
                <th className="px-4 py-3">Signal</th>
                <th className="px-4 py-3">Floor</th>
                <th className="px-4 py-3">Zone</th>
                <th className="px-4 py-3">Last activity</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Map</th>
              </tr>
            </thead>
            <tbody>
              {sensors.length ? (
                sensors.map((s) => (
                  <tr key={s.id} className="border-t border-white/10">
                    <td className="px-4 py-3 font-semibold text-[var(--on-surface)]">{s.trapId}</td>
                    <td className="px-4 py-3 text-[var(--on-surface-variant)]">{s.status}</td>
                    <td className="px-4 py-3 text-[var(--on-surface-variant)]">{s.batteryPct ?? "—"}{typeof s.batteryPct === "number" ? "%" : ""}</td>
                    <td className="px-4 py-3 text-[var(--on-surface-variant)]">{s.signalLevel ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--on-surface-variant)]">{s.floorLabel ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--on-surface-variant)]">{s.zone ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--on-surface-variant)]">{formatDateTime(s.lastActivityAt)}</td>
                    <td className="px-4 py-3 text-[var(--on-surface-variant)]">{formatDateTime(s.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <a
                        className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]"
                        href={`/map?editSensorId=${encodeURIComponent(s.id)}`}
                      >
                        Set position
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-[var(--on-surface-variant)]" colSpan={9}>
                    No sensors yet. Send an ingest payload to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Surface>
    </div>
  );
}
