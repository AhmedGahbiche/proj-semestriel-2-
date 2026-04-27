"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";

type SerialPortLike = {
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
};

type WebSerialLike = {
  requestPort: () => Promise<SerialPortLike>;
};

type NavigatorWithSerial = Navigator & {
  serial?: WebSerialLike;
};

function getSerial(): WebSerialLike | null {
  const nav = typeof navigator === "undefined" ? null : (navigator as NavigatorWithSerial);
  if (!nav?.serial) return null;
  if (typeof nav.serial.requestPort !== "function") return null;
  return nav.serial;
}

function extractDevEui(text: string): string | null {
  // Typical LoRa-E5 responses include: "+ID: DevEui, 2CF7F1C0ABCDEF12"
  const match = text.match(/([0-9A-Fa-f]{16})/);
  return match ? match[1].toUpperCase() : null;
}

async function readFor(reader: ReadableStreamDefaultReader<Uint8Array>, ms: number): Promise<string> {
  const decoder = new TextDecoder();
  const start = Date.now();
  let out = "";

  while (Date.now() - start < ms) {
    const remaining = ms - (Date.now() - start);
    const race: ReadableStreamReadResult<Uint8Array> | { timeout: true } = await Promise.race([
      reader.read(),
      new Promise<{ timeout: true }>((resolve) => setTimeout(() => resolve({ timeout: true }), Math.min(remaining, 250))),
    ]);

    if ("timeout" in race) {
      continue;
    }

    const result = race;
    if (result.done) break;
    if (result.value) out += decoder.decode(result.value, { stream: true });
  }

  return out;
}

export function ConnectClient() {
  const serial = useMemo(() => getSerial(), []);
  const [baudRate, setBaudRate] = useState(9600);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [log, setLog] = useState<string>("");
  const [deviceId, setDeviceId] = useState<string>("");
  const [manualDeviceId, setManualDeviceId] = useState<string>("");

  const portRef = useRef<SerialPortLike | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);

  const appendLog = (chunk: string) => {
    setLog((prev) => (prev + chunk).slice(-8000));
  };

  const disconnect = async () => {
    try {
      await writerRef.current?.close().catch(() => undefined);
    } catch {
      // ignore
    }

    try {
      await readerRef.current?.cancel().catch(() => undefined);
    } catch {
      // ignore
    }

    try {
      await portRef.current?.close().catch(() => undefined);
    } catch {
      // ignore
    }

    portRef.current = null;
    readerRef.current = null;
    writerRef.current = null;
  };

  const connect = async () => {
    if (!serial) return;

    setStatus("connecting");
    setLog("");
    setDeviceId("");

    try {
      const port = await serial.requestPort();
      await port.open({ baudRate });

      portRef.current = port;
      const reader = port.readable?.getReader();
      const writer = port.writable?.getWriter();

      if (!reader || !writer) {
        throw new Error("Serial port does not provide readable/writable streams.");
      }

      readerRef.current = reader;
      writerRef.current = writer;

      const encoder = new TextEncoder();

      const write = async (cmd: string) => {
        appendLog(`> ${cmd}\n`);
        await writer.write(encoder.encode(cmd + "\r\n"));
      };

      // Try common LoRa-E5 AT commands for DevEUI.
      await write("AT");
      appendLog(await readFor(reader, 600));

      await write("AT+ID=DevEui");
      const r1 = await readFor(reader, 1200);
      appendLog(r1);
      let dev = extractDevEui(r1);

      if (!dev) {
        await write("AT+ID");
        const r2 = await readFor(reader, 1500);
        appendLog(r2);
        dev = extractDevEui(r2);
      }

      if (dev) {
        setDeviceId(dev);
      }

      setStatus("connected");

      // We only need one-shot identification; close cleanly.
      await disconnect();
    } catch (err) {
      await disconnect();
      setStatus("error");
      appendLog(`\nERROR: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  };

  const effectiveDeviceId = (deviceId || manualDeviceId).trim();

  return (
    <div className="space-y-5">
      {!serial ? (
        <div className="rounded-xl border border-white/10 bg-[var(--surface-container-low)] p-4 text-sm text-[var(--on-surface-variant)]">
          Web Serial is not available in this browser. Use Chrome or Edge.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">Baud rate</span>
          <input
            type="number"
            min={1200}
            step={1200}
            value={baudRate}
            onChange={(e) => setBaudRate(Number(e.target.value) || 9600)}
            className="h-11 rounded-xl border border-white/10 bg-[var(--surface-container-low)] px-4 text-sm text-[var(--on-surface)] outline-none"
          />
        </label>

        <div className="flex items-end gap-3">
          <button
            type="button"
            disabled={!serial || status === "connecting"}
            onClick={connect}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--on-primary)] disabled:opacity-50"
          >
            {status === "connecting" ? "Connecting…" : "Connect via USB"}
          </button>
        </div>
      </div>

      <label className="grid gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">Device ID</span>
        <input
          value={effectiveDeviceId}
          onChange={(e) => {
            setManualDeviceId(e.target.value);
            if (deviceId) setDeviceId("");
          }}
          placeholder="DevEUI / hardware-id"
          className="h-11 rounded-xl border border-white/10 bg-[var(--surface-container-low)] px-4 text-sm text-[var(--on-surface)] outline-none"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <Link
          href={effectiveDeviceId ? `/deploy-trap?deviceId=${encodeURIComponent(effectiveDeviceId)}` : "/deploy-trap"}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-[var(--surface-container-low)] px-5 text-sm font-bold text-[var(--on-surface)]"
        >
          Continue to Deploy
        </Link>

        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-transparent px-5 text-sm font-bold text-[var(--on-surface)]"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[var(--surface-container-low)] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">Serial log</p>
        <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words text-xs text-[var(--on-surface-variant)]">{log || "(no data yet)"}</pre>
      </div>
    </div>
  );
}
