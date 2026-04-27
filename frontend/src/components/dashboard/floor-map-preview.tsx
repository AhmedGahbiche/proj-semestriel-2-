"use client";

import Image from "next/image";
import Link from "next/link";
import { GradientPillLink } from "@/components/ui/gradient-pill";
import { Surface } from "@/components/ui/surface";

type FloorMapPreviewProps = {
  mapUrl: string;
  floorLabel: string;
  sensorsTotal: number;
  sensorsTriggered: number;
};

export function FloorMapPreview({ mapUrl, floorLabel, sensorsTotal, sensorsTriggered }: FloorMapPreviewProps) {
  return (
    <Surface className="grid overflow-hidden md:grid-cols-3">
      <div className="space-y-4 p-6">
        <h3 className="font-headline text-xl font-bold">Floor Map</h3>
        <p className="text-sm text-[var(--on-surface-variant)]">
          Live preview for {floorLabel}. Tracking {sensorsTotal} sensors.
        </p>
        <GradientPillLink href="/legacy/plan.html" variant="compact">
          Expand Map View
        </GradientPillLink>
      </div>
      <Link href="/legacy/plan.html" className="relative min-h-64 md:col-span-2">
        <Image
          src={mapUrl}
          alt={`Floor map preview for ${floorLabel}`}
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, 66vw"
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" aria-hidden />
        <div className="absolute bottom-4 left-4 rounded-xl bg-[var(--surface-container)]/80 px-4 py-3 backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)]">Triggered</p>
          <p className="mt-1 font-headline text-2xl font-black text-[var(--error)]">{sensorsTriggered}</p>
        </div>
      </Link>
    </Surface>
  );
}
