import { NextResponse } from "next/server";
import { backendJson } from "@/lib/backend-server";

export const dynamic = "force-dynamic";

type BackendSensor = {
  id: string;
  trapId: string;
  floorLabel: string | null;
  zone: string | null;
  status: "ARMED" | "TRIGGERED" | "LOW_BATTERY" | "OFFLINE";
  lastActivityAt: string | null;
  batteryPct: number | null;
  mapFloorId: string | null;
  mapX: number | null;
  mapY: number | null;
};

type BackendEvent = {
  id: string;
  createdAt: string;
  type: string;
  title: string;
  detail: string | null;
};

type SensorsResponse = {
  items: BackendSensor[];
};

type EventsResponse = {
  items: BackendEvent[];
};

function mapSensorStatus(status: BackendSensor["status"]): string {
  switch (status) {
    case "LOW_BATTERY":
      return "low_battery";
    default:
      return status.toLowerCase();
  }
}

export async function GET() {
  try {
    const [sensorsRes, eventsRes] = await Promise.all([
      backendJson<SensorsResponse>("/api/sensors?page=1&pageSize=200", { admin: true }),
      backendJson<EventsResponse>("/api/events?limit=80", { admin: true }),
    ]);

    const sensors = (sensorsRes.items ?? []).map((s) => {
      const hasMap =
        typeof s.mapFloorId === "string" &&
        s.mapFloorId.length > 0 &&
        typeof s.mapX === "number" &&
        Number.isFinite(s.mapX) &&
        typeof s.mapY === "number" &&
        Number.isFinite(s.mapY);

      return {
        id: s.id,
        trapId: s.trapId,
        status: mapSensorStatus(s.status),
        battery: s.batteryPct,
        zone: s.zone,
        floorId: s.mapFloorId ?? null,
        lastActivityAt: s.lastActivityAt,
        location: hasMap
          ? {
              type: "map",
              floorId: s.mapFloorId,
              floor: s.mapFloorId,
              x: s.mapX,
              y: s.mapY,
            }
          : null,
      };
    });

    const events = (eventsRes.items ?? []).map((e) => ({
      id: e.id,
      timestamp: e.createdAt,
      type: e.type,
      title: e.title,
      detail: e.detail ?? undefined,
    }));

    return NextResponse.json({ sensors, events }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load backend snapshot";
    return new NextResponse(message, {
      status: 500,
      headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
    });
  }
}
