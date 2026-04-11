"use client";

import Link from "next/link";
import { Surface } from "@/components/ui/surface";

export type DashboardEvent = {
  id: string;
  timestamp: string;
  title: string;
  detail?: string;
  severity?: string;
};

type LiveActivityProps = {
  events: DashboardEvent[];
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const formatTimeLocal = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const severityClass = (severity?: string) => {
  switch (severity) {
    case "critical":
      return "text-[var(--error)]";
    case "warning":
      return "text-[var(--tertiary)]";
    case "info":
    default:
      return "text-[var(--on-surface-variant)]";
  }
};

export function LiveActivity({ events }: LiveActivityProps) {
  return (
    <Surface>
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-headline text-lg font-bold">Live Activity</h3>
          <Link href="/history" className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
            View History
          </Link>
        </div>
      </div>
      <div className="max-h-80 space-y-2 overflow-auto p-4">
        {events.length ? (
          events.map((event) => (
            <article
              key={event.id}
              className="rounded-xl bg-[var(--surface-container-low)] p-3 text-sm text-[var(--on-surface-variant)]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-[var(--on-surface)]">{event.title}</p>
                <time className={`shrink-0 text-xs ${severityClass(event.severity)}`}>{formatTimeLocal(event.timestamp)}</time>
              </div>
              {event.detail ? <p className="mt-1 text-xs text-[var(--on-surface-variant)]">{event.detail}</p> : null}
            </article>
          ))
        ) : (
          <div className="rounded-xl bg-[var(--surface-container-low)] p-4 text-sm text-[var(--on-surface-variant)]">
            No activity yet. Add or update sensors to generate events.
          </div>
        )}
      </div>
    </Surface>
  );
}
