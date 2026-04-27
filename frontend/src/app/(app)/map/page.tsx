import { LegacyFrame } from "@/components/ui/legacy-frame";

export default async function MapPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const editSensorId = typeof sp.editSensorId === "string" ? sp.editSensorId : undefined;

  const qs = new URLSearchParams();
  qs.set("embedded", "1");
  if (editSensorId) qs.set("editSensorId", editSensorId);

  return (
    <div className="-m-6 lg:-m-8">
      <LegacyFrame
        page={`plan.html?${qs.toString()}`}
        title="Lumiere Map"
        className="h-[calc(100vh-4rem)] w-full border-0"
      />
    </div>
  );
}
