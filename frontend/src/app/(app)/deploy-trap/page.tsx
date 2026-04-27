import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Surface } from "@/components/ui/surface";
import { backendFetch } from "@/lib/backend-server";
import { DeployLocationPicker } from "./deploy-location-picker";

export const dynamic = "force-dynamic";

async function deployTrap(formData: FormData) {
  "use server";

  const trapId = String(formData.get("trapId") ?? "").trim();
  const deviceId = String(formData.get("deviceId") ?? "").trim();
  const floorLabelRaw = String(formData.get("floorLabel") ?? "").trim();
  const zoneRaw = String(formData.get("zone") ?? "").trim();

  const mapFloorIdRaw = String(formData.get("mapFloorId") ?? "").trim();
  const mapXRaw = String(formData.get("mapX") ?? "").trim();
  const mapYRaw = String(formData.get("mapY") ?? "").trim();

  if (!trapId) {
    throw new Error("trapId is required");
  }

  if (!deviceId) {
    throw new Error("deviceId is required (use DevEUI or your hardware ID)");
  }

  const body: Record<string, unknown> = {
    trapId,
    deviceId,
    floorLabel: floorLabelRaw || null,
    zone: zoneRaw || null,
  };

  if (mapFloorIdRaw) {
    const mapX = Number(mapXRaw);
    const mapY = Number(mapYRaw);
    if (Number.isFinite(mapX) && Number.isFinite(mapY)) {
      body.mapFloorId = mapFloorIdRaw;
      body.mapX = mapX;
      body.mapY = mapY;
    }
  }

  const res = await backendFetch("/api/sensors", {
    method: "POST",
    admin: true,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to deploy trap (${res.status}): ${text || res.statusText}`);
  }

  // Create an INGEST key so the board can post uplinks immediately.
  // Key is only returned once, so we store it briefly in cookies and redirect to a "next steps" page.
  const keyRes = await backendFetch("/api/api-keys", {
    method: "POST",
    admin: true,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: `trap-${trapId}`,
      scope: "INGEST",
    }),
  });

  if (!keyRes.ok) {
    const text = await keyRes.text().catch(() => "");
    throw new Error(`Trap deployed, but failed to create INGEST key (${keyRes.status}): ${text || keyRes.statusText}`);
  }

  const keyJson = (await keyRes.json().catch(() => null)) as null | { key?: string };
  const ingestKey = keyJson?.key;
  if (!ingestKey) {
    throw new Error("Trap deployed, but backend did not return an INGEST key");
  }

  const jar = await cookies();
  // Keep only a short time; user copies it into the ESP32 firmware/config.
  jar.set("deploy_trap_id", trapId, { httpOnly: true, sameSite: "lax", maxAge: 300, path: "/" });
  jar.set("deploy_device_id", deviceId, { httpOnly: true, sameSite: "lax", maxAge: 300, path: "/" });
  jar.set("deploy_ingest_key", ingestKey, { httpOnly: true, sameSite: "lax", maxAge: 300, path: "/" });

  redirect("/deploy-trap/next-steps");
}

export default async function DeployTrapPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const trapIdDefault = typeof sp.trapId === "string" ? sp.trapId : undefined;
  const deviceIdDefault = typeof sp.deviceId === "string" ? sp.deviceId : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-extrabold">Deploy New Trap</h1>
        <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Creates or updates a sensor in the backend.</p>
      </header>

      <form action={deployTrap} className="space-y-6">
        <Surface className="p-6">
          <div className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">Trap ID</span>
              <input
                name="trapId"
                required
                placeholder="TRP-0001"
                defaultValue={trapIdDefault}
                className="h-11 rounded-xl border border-white/10 bg-[var(--surface-container-low)] px-4 text-sm text-[var(--on-surface)] outline-none"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">Device ID (ESP32 / LoRa)</span>
              <input
                name="deviceId"
                required
                placeholder="DevEUI / hardware-id"
                defaultValue={deviceIdDefault}
                className="h-11 rounded-xl border border-white/10 bg-[var(--surface-container-low)] px-4 text-sm text-[var(--on-surface)] outline-none"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">Floor (optional)</span>
                <input
                  name="floorLabel"
                  placeholder="Floor 1"
                  className="h-11 rounded-xl border border-white/10 bg-[var(--surface-container-low)] px-4 text-sm text-[var(--on-surface)] outline-none"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">Zone (optional)</span>
                <input
                  name="zone"
                  placeholder="Zone A"
                  className="h-11 rounded-xl border border-white/10 bg-[var(--surface-container-low)] px-4 text-sm text-[var(--on-surface)] outline-none"
                />
              </label>
            </div>

            <button
              type="submit"
              className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--on-primary)]"
            >
              Deploy Trap
            </button>
          </div>
        </Surface>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-headline text-xl font-bold">Floor Map</h2>
              <p className="text-sm text-[var(--on-surface-variant)]">Pick an exact position (optional) before deploying.</p>
            </div>

            <a
              href="/legacy/plan.html?deploy=1"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]"
            >
              Open full map
            </a>
          </div>

          <DeployLocationPicker />
        </section>
      </form>
    </div>
  );
}
