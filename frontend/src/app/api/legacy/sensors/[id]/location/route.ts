import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-server";

export const dynamic = "force-dynamic";

type RouteCtx = {
  params:
    | {
        id: string;
      }
    | Promise<{
        id: string;
      }>;
};

function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    !!value &&
    (typeof value === "object" || typeof value === "function") &&
    "then" in value &&
    typeof (value as { then: unknown }).then === "function"
  );
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const rawParams: unknown = ctx.params;
  const params = isPromise<{ id: string }>(rawParams) ? await rawParams : rawParams;

  const id =
    typeof (params as { id?: unknown })?.id === "string"
      ? (params as { id: string }).id.trim()
      : "";
  if (!id) {
    return NextResponse.json({ error: "Missing sensor id" }, { status: 400 });
  }

  const json: unknown = await request.json().catch(() => null);
  const mapFloorId =
    typeof (json as { mapFloorId?: unknown })?.mapFloorId === "string"
      ? (json as { mapFloorId: string }).mapFloorId.trim()
      : "";

  const mapXRaw = (json as { mapX?: unknown })?.mapX;
  const mapYRaw = (json as { mapY?: unknown })?.mapY;
  const mapX = typeof mapXRaw === "number" ? mapXRaw : NaN;
  const mapY = typeof mapYRaw === "number" ? mapYRaw : NaN;

  if (!mapFloorId || mapFloorId.length > 32) {
    return NextResponse.json({ error: "Invalid mapFloorId" }, { status: 400 });
  }
  if (!Number.isFinite(mapX) || mapX < 0 || mapX > 100) {
    return NextResponse.json({ error: "Invalid mapX" }, { status: 400 });
  }
  if (!Number.isFinite(mapY) || mapY < 0 || mapY > 100) {
    return NextResponse.json({ error: "Invalid mapY" }, { status: 400 });
  }

  const res = await backendFetch(`/api/sensors/${encodeURIComponent(id)}`, {
    method: "PATCH",
    admin: true,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ mapFloorId, mapX, mapY }),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    return new NextResponse(text || res.statusText, {
      status: res.status,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const data = text ? (JSON.parse(text) as unknown) : null;
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}
