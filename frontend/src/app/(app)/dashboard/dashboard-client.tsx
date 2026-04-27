"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FloorMapPreview } from "@/components/dashboard/floor-map-preview";
import { LiveActivity, type DashboardEvent } from "@/components/dashboard/live-activity";
import { MaterialIcon } from "@/components/ui/material-icon";
import { Surface, SurfaceLink } from "@/components/ui/surface";

type Sensor = {
  id?: string;
  floor?: string;
  zone?: string;
  status?: string;
  lastActivity?: string;
  battery?: number | null;
  signal?: number | null;
};

type FloorConfig = {
  id: string;
  label: string;
};

type FloorMaps = {
  floor1?: string;
  floor2?: string;
  floor3?: string;
  basement?: string;
};

type Snapshot = {
  sensors: Sensor[];
  events: DashboardEvent[];
  floors: FloorConfig[];
  floorMaps: FloorMaps;
};

const DEFAULT_FLOOR_MAPS: Required<FloorMaps> = {
  floor1: "/legacy/maps/floor1.svg",
  floor2: "/legacy/maps/floor2.svg",
  floor3: "/legacy/maps/floor3.svg",
  basement: "/legacy/maps/basement.svg",
};

const startOfDayLocal = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
};

const formatCompact = (value: number) => {
  try {
    return new Intl.NumberFormat(undefined, { notation: "compact" }).format(value);
  } catch {
    return String(value);
  }
};

function StatCard({
  href,
  label,
  value,
  subtitle,
  icon,
  valueClassName,
}: {
  href: string;
  label: string;
  value: string;
  subtitle: string;
  icon: string;
  valueClassName?: string;
}) {
  return (
    <SurfaceLink
      href={href}
      className="group p-6 hover:bg-[var(--surface-container-high)]"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">{label}</p>
        <MaterialIcon name={icon} className="text-[var(--on-surface-variant)]" />
      </div>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className={`font-headline text-4xl font-black text-[var(--on-surface)] ${valueClassName ?? ""}`}>{value}</p>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">{subtitle}</p>
        </div>
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)] opacity-0 group-hover:opacity-100">
          Open
        </span>
      </div>
    </SurfaceLink>
  );
}

function EfficiencyBars({
  href,
  title,
  description,
  series,
}: {
  href: string;
  title: string;
  description: string;
  series: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...series.map((d) => d.count));

  return (
    <SurfaceLink href={href} className="p-6 hover:bg-[var(--surface-container-high)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-headline text-xl font-bold">{title}</h3>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">{description}</p>
        </div>
        <MaterialIcon name="insights" className="text-[var(--on-surface-variant)]" />
      </div>

      <div className="mt-6 grid h-44 grid-cols-7 items-end gap-3">
        {series.map((d) => {
          const heightPct = Math.round((d.count / max) * 100);
          const height = `${Math.max(6, heightPct)}%`;
          return (
            <div key={d.label} className="flex flex-col items-center gap-3">
              <div className="w-full overflow-hidden rounded-xl bg-[var(--surface-container-low)]">
                <div
                  className="w-full rounded-xl bg-[var(--primary)]/40"
                  style={{ height }}
                  aria-label={`${d.label}: ${d.count} events`}
                />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">{d.label}</span>
            </div>
          );
        })}
      </div>
    </SurfaceLink>
  );
}

export function DashboardClient({ snapshot }: { snapshot: Snapshot }) {
  const sensors = snapshot.sensors;
  const events = snapshot.events;
  const floors = snapshot.floors;
  const floorMaps = snapshot.floorMaps;

  const computed = useMemo(() => {
    const armed = sensors.filter((s) => s && s.status === "armed").length;
    const triggered = sensors.filter((s) => s && s.status === "triggered").length;
    const lowBattery = sensors.filter((s) => s && s.status === "low_battery").length;
    const offline = sensors.filter((s) => s && s.status === "offline").length;

    const floorCount = floors.length
      ? floors.length
      : Array.from(new Set(sensors.map((s) => (s.floor || "").trim()).filter(Boolean))).length;

    const recentEvents = events
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);

    const today = new Date();
    const dayStarts = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const series = dayStarts.map((d) => {
      const start = startOfDayLocal(d);
      const end = start + 24 * 60 * 60 * 1000;
      const count = events.filter((e) => {
        const t = new Date(e.timestamp).getTime();
        return t >= start && t < end;
      }).length;

      const label = d.toLocaleDateString(undefined, { weekday: "short" });
      return { label, count };
    });

    const activeFloor = floors.find((f) => f.id === "floor2")?.label || floors[0]?.label || "Floor";

    return {
      armed,
      triggered,
      lowBattery,
      offline,
      floorCount,
      recentEvents,
      series,
      activeFloor,
    };
  }, [events, floors, sensors]);

  const mapUrl =
    (typeof floorMaps.floor2 === "string" && floorMaps.floor2) ||
    (typeof floorMaps.floor1 === "string" && floorMaps.floor1) ||
    DEFAULT_FLOOR_MAPS.floor2;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-headline text-3xl font-extrabold text-[var(--on-surface)]">Dashboard</h1>
        <p className="text-sm text-[var(--on-surface-variant)]">Everything here reflects your live sensors, maps, and history.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          href="/sensors"
          label="Active"
          value={formatCompact(computed.armed)}
          subtitle="Armed sensors"
          icon="check_circle"
        />
        <StatCard
          href="/history"
          label="Triggered"
          value={formatCompact(computed.triggered)}
          subtitle="Critical alerts"
          icon="warning"
          valueClassName="text-[var(--error)]"
        />
        <StatCard
          href="/sensors"
          label="Low Battery"
          value={formatCompact(computed.lowBattery)}
          subtitle="Needs attention"
          icon="battery_2_bar"
          valueClassName="text-[var(--tertiary)]"
        />
        <StatCard
          href="/sensors"
          label="Offline"
          value={formatCompact(computed.offline)}
          subtitle={computed.offline ? "Investigate" : "All online"}
          icon="signal_cellular_off"
        />
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <FloorMapPreview
            mapUrl={mapUrl}
            floorLabel={`${computed.activeFloor} · ${computed.floorCount || 0} floors`}
            sensorsTotal={sensors.length}
            sensorsTriggered={computed.triggered}
          />

          <EfficiencyBars
            href="/history"
            title="Activity Rate"
            description="Events recorded over the last 7 days"
            series={computed.series}
          />
        </div>

        <div className="space-y-8">
          <LiveActivity events={computed.recentEvents} />

          <Surface className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-headline text-lg font-bold">Quick Links</h3>
                <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Jump to key areas.</p>
              </div>
              <MaterialIcon name="bolt" className="text-[var(--on-surface-variant)]" />
            </div>

            <div className="mt-5 grid gap-3">
              <Link
                href="/deploy-trap/connect"
                className="rounded-xl bg-[var(--surface-container-low)] px-4 py-3 text-sm font-semibold text-[var(--on-surface)]"
              >
                Deploy New Trap
              </Link>
              <Link
                href="/actions/reset-triggered"
                className="rounded-xl bg-[var(--surface-container-low)] px-4 py-3 text-sm font-semibold text-[var(--on-surface)]"
              >
                Reset Triggered
              </Link>
              <Link
                href="/legacy/plan.html"
                className="rounded-xl bg-[var(--surface-container-low)] px-4 py-3 text-sm font-semibold text-[var(--on-surface)]"
              >
                Open Floor Map
              </Link>
              <Link
                href="/settings"
                className="rounded-xl bg-[var(--surface-container-low)] px-4 py-3 text-sm font-semibold text-[var(--on-surface)]"
              >
                Settings
              </Link>
            </div>
          </Surface>
        </div>
      </section>
    </div>
  );
}
