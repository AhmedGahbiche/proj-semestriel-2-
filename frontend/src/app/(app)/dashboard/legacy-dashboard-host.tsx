"use client";

import { useEffect, useRef, useState } from "react";
import { LegacyFrame } from "@/components/ui/legacy-frame";
import { Surface } from "@/components/ui/surface";

type LegacySensor = {
  id: string;
  trapId?: string;
  status?: string;
  battery?: number | null;
  floorId?: string | null;
  zone?: string | null;
  lastActivityAt?: string | null;
};

type LegacyEvent = {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  detail?: string;
};

type SnapshotResponse = {
  sensors: LegacySensor[];
  events: LegacyEvent[];
};

const SENSORS_KEY = "legacy-sensors";
const EVENTS_KEY = "legacy-history-events";

function writeLegacySnapshot(snapshot: SnapshotResponse) {
  window.localStorage.setItem(SENSORS_KEY, JSON.stringify(snapshot.sensors ?? []));
  window.localStorage.setItem(EVENTS_KEY, JSON.stringify(snapshot.events ?? []));

  try {
    window.dispatchEvent(new Event("legacy-sensors-updated"));
  } catch {
    // ignore
  }
}

export function LegacyDashboardHost() {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const pollTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/legacy/dashboard-snapshot", { cache: "no-store" });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Failed to load snapshot (${res.status})`);
        }

        const data = (await res.json()) as SnapshotResponse;
        if (cancelled) return;

        writeLegacySnapshot(data);
        setError(null);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load snapshot");
        setReady(false);
      }
    };

    void load();

    pollTimer.current = window.setInterval(() => {
      void load();
    }, 5000);

    return () => {
      cancelled = true;
      if (pollTimer.current) {
        window.clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <Surface className="p-6">
          <h1 className="font-headline text-2xl font-extrabold">Backend not connected</h1>
          <p className="mt-2 text-sm text-[var(--on-surface-variant)]">{error}</p>
          <p className="mt-4 text-sm text-[var(--on-surface-variant)]">
            Set <span className="font-mono">BACKEND_URL</span> and <span className="font-mono">BACKEND_ADMIN_API_KEY</span> in
            <span className="font-mono"> frontend/.env.local</span>.
          </p>
        </Surface>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl">
        <Surface className="p-6">
          <h1 className="font-headline text-2xl font-extrabold">Loading dashboard…</h1>
          <p className="mt-2 text-sm text-[var(--on-surface-variant)]">Syncing sensors and events from the backend.</p>
        </Surface>
      </div>
    );
  }

  return (
    <div className="-m-6 lg:-m-8">
      <LegacyFrame page="dashboard.html" title="Legacy dashboard" className="h-[100vh] w-full border-0" />
    </div>
  );
}
