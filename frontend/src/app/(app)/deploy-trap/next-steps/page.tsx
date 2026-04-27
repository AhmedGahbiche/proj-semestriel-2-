import { cookies } from "next/headers";
import Link from "next/link";
import { Surface } from "@/components/ui/surface";

export const dynamic = "force-dynamic";

function getBackendUrl(): string {
  const url = process.env.BACKEND_URL || "http://localhost:4000";
  return url.replace(/\/$/, "");
}

export default async function DeployTrapNextStepsPage() {
  const jar = await cookies();

  const trapId = jar.get("deploy_trap_id")?.value || "";
  const deviceId = jar.get("deploy_device_id")?.value || "";
  const ingestKey = jar.get("deploy_ingest_key")?.value || "";

  const backendUrl = getBackendUrl();
  const ingestUrl = `${backendUrl}/api/ingest/lora`;

  if (!trapId || !deviceId || !ingestKey) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="font-headline text-3xl font-extrabold">Next steps</h1>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
            Missing deploy context (cookies expired). Re-deploy the trap to generate a fresh INGEST key.
          </p>
        </header>

        <Surface className="p-6 space-y-3">
          <Link
            href="/deploy-trap"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--on-primary)]"
          >
            Back to Deploy
          </Link>
        </Surface>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-extrabold">Connect your ESP32 (GSM/4G)</h1>
        <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
          Your trap is deployed. Copy the INGEST key and URL below into your ESP32 firmware.
        </p>
      </header>

      <Surface className="p-6 space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">Trap</p>
          <p className="mt-1 text-sm text-[var(--on-surface)]">{trapId}</p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">Device ID (must match ESP32)</p>
          <p className="mt-1 text-sm text-[var(--on-surface)]">{deviceId}</p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">Ingest URL</p>
          <pre className="mt-2 rounded-xl border border-white/10 bg-[var(--surface-container-low)] p-3 text-xs text-[var(--on-surface-variant)]">
            {ingestUrl}
          </pre>
          <p className="mt-2 text-xs text-[var(--on-surface-variant)]">
            If your ESP32 is on mobile data, this URL must be publicly reachable (not localhost).
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">INGEST Key</p>
          <pre className="mt-2 rounded-xl border border-white/10 bg-[var(--surface-container-low)] p-3 text-xs text-[var(--on-surface-variant)]">
            {ingestKey}
          </pre>
          <p className="mt-2 text-xs text-[var(--on-surface-variant)]">This key is shown once. Store it in your device config.</p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">Test with curl</p>
          <pre className="mt-2 rounded-xl border border-white/10 bg-[var(--surface-container-low)] p-3 text-xs text-[var(--on-surface-variant)] whitespace-pre-wrap">
{`curl -X POST ${ingestUrl} \\
  -H "X-API-Key: ${ingestKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"deviceId":"${deviceId}","decoded":{"triggered":false,"batteryPct":90}}'`}
          </pre>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">ESP32 JSON body</p>
          <pre className="mt-2 rounded-xl border border-white/10 bg-[var(--surface-container-low)] p-3 text-xs text-[var(--on-surface-variant)] whitespace-pre-wrap">
{`{
  "deviceId": "${deviceId}",
  "decoded": {
    "temperature": 26.4,
    "humidity": 55,
    "triggered": false,
    "batteryPct": 87
  }
}`}
          </pre>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/sensors"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--on-primary)]"
          >
            Go to Sensors
          </Link>
          <Link
            href="/deploy-trap"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-[var(--surface-container-low)] px-5 text-sm font-bold text-[var(--on-surface)]"
          >
            Deploy another
          </Link>
        </div>
      </Surface>
    </div>
  );
}
