import { Surface } from "@/components/ui/surface";
import { ConnectClient } from "./connect-client";

export const dynamic = "force-dynamic";

export default function DeployTrapConnectPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-extrabold">Connect Board</h1>
        <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
          This step tries to connect to your LoRa board and read its Device ID (DevEUI) automatically.
        </p>
      </header>

      <Surface className="p-6">
        <ConnectClient />
      </Surface>

      <Surface className="p-6">
        <h2 className="font-headline text-lg font-bold">If connection fails</h2>
        <ul className="mt-2 space-y-1 text-sm text-[var(--on-surface-variant)]">
          <li>- Use Chrome or Edge (Web Serial required).</li>
          <li>- Plug the board via USB and close any serial monitor.</li>
          <li>- You can still continue and paste the Device ID manually.</li>
        </ul>
      </Surface>
    </div>
  );
}
