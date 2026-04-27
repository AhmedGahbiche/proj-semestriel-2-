"use client";

import { useEffect, useState } from "react";
import { LegacyFrame } from "@/components/ui/legacy-frame";

const PENDING_KEY = "legacy-pending-trap";

type PendingTrap = {
  location?: {
    type?: string;
    floor?: string;
    floorId?: string;
    x?: number;
    y?: number;
  };
};

function readPendingLocation(): { mapFloorId: string; mapX: number; mapY: number } | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingTrap;
    const loc = parsed && parsed.location ? parsed.location : null;
    if (!loc || loc.type !== "map") return null;

    const floor = (typeof loc.floorId === "string" && loc.floorId) || (typeof loc.floor === "string" && loc.floor) || "";
    const x = typeof loc.x === "number" ? loc.x : Number(loc.x);
    const y = typeof loc.y === "number" ? loc.y : Number(loc.y);

    if (!floor || !Number.isFinite(x) || !Number.isFinite(y)) return null;

    return { mapFloorId: floor, mapX: x, mapY: y };
  } catch {
    return null;
  }
}

export function DeployLocationPicker() {
  const [loc, setLoc] = useState<{ mapFloorId: string; mapX: number; mapY: number } | null>(null);

  useEffect(() => {
    const refresh = () => setLoc(readPendingLocation());

    refresh();

    const onStorage = (e: StorageEvent) => {
      if (e.key === PENDING_KEY) refresh();
    };

    const onPending = () => refresh();

    window.addEventListener("storage", onStorage);
    window.addEventListener("legacy-pending-trap-updated", onPending as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("legacy-pending-trap-updated", onPending as EventListener);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-[var(--surface-container-low)] p-4 text-sm text-[var(--on-surface-variant)]">
        {loc ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Selected position: <span className="font-mono">{loc.mapFloorId}</span> · X={loc.mapX.toFixed(2)}% Y={loc.mapY.toFixed(2)}%
            </span>
            <button
              type="button"
              className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]"
              onClick={() => {
                window.localStorage.removeItem(PENDING_KEY);
                setLoc(null);
              }}
            >
              Clear
            </button>
          </div>
        ) : (
          <span>Click on the map and confirm to select an exact position (optional).</span>
        )}
      </div>

      {loc ? (
        <>
          <input type="hidden" name="mapFloorId" value={loc.mapFloorId} />
          <input type="hidden" name="mapX" value={String(loc.mapX)} />
          <input type="hidden" name="mapY" value={String(loc.mapY)} />
        </>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-container)]">
        <LegacyFrame page="plan.html?embedded=1&deploy=1" title="Pick trap location" className="h-[70vh] w-full border-0" />
      </div>
    </div>
  );
}
