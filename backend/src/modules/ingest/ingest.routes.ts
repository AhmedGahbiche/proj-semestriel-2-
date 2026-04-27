import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

const ingestBodySchema = z.object({
  gatewayId: z.string().max(120).optional(),
  deviceId: z.string().max(120).optional(),
  trapId: z.string().max(64).optional(),
  receivedAt: z.string().datetime().optional(),
  rssi: z.number().optional(),
  snr: z.number().optional(),
  payloadB64: z.string().max(10_000).optional(),
  decoded: z.any().optional(),
});

const ttnWebhookSchema = z
  .object({
    end_device_ids: z
      .object({
        device_id: z.string().optional(),
        dev_eui: z.string().optional(),
      })
      .optional(),
    uplink_message: z
      .object({
        received_at: z.string().datetime().optional(),
        frm_payload: z.string().optional(),
        decoded_payload: z.any().optional(),
        rx_metadata: z
          .array(
            z
              .object({
                rssi: z.number().optional(),
                snr: z.number().optional(),
                gateway_ids: z.object({ gateway_id: z.string().optional() }).optional(),
              })
              .passthrough(),
          )
          .optional(),
      })
      .optional(),
  })
  .passthrough();

function deriveSignalLevelFromRssi(rssi?: number): number | null {
  if (typeof rssi !== 'number' || Number.isNaN(rssi)) return null;
  if (rssi >= -70) return 4;
  if (rssi >= -85) return 3;
  if (rssi >= -100) return 2;
  if (rssi >= -110) return 1;
  return 0;
}

function extractTrapId(input: z.infer<typeof ingestBodySchema>): string | null {
  if (input.trapId) return input.trapId;
  const decoded = input.decoded as any;
  if (decoded && typeof decoded === 'object') {
    if (typeof decoded.trapId === 'string') return decoded.trapId;
    if (typeof decoded.trapid === 'string') return decoded.trapid;
  }
  return null;
}

function extractDeviceId(input: z.infer<typeof ingestBodySchema>): string | null {
  if (typeof input.deviceId === 'string' && input.deviceId) return input.deviceId;
  const decoded = input.decoded as any;
  if (decoded && typeof decoded === 'object') {
    if (typeof decoded.deviceId === 'string' && decoded.deviceId) return decoded.deviceId;
    if (typeof decoded.deveui === 'string' && decoded.deveui) return decoded.deveui;
    if (typeof decoded.devEui === 'string' && decoded.devEui) return decoded.devEui;
  }
  return null;
}

function deriveStatus(decoded: any, batteryPct: number | null): 'ARMED' | 'TRIGGERED' | 'LOW_BATTERY' {
  const triggered =
    decoded?.triggered === true ||
    decoded?.status === 'TRIGGERED' ||
    decoded?.status === 'triggered' ||
    decoded?.alarm === true;

  if (triggered) return 'TRIGGERED';

  if (typeof batteryPct === 'number' && batteryPct <= 20) return 'LOW_BATTERY';

  return 'ARMED';
}

export function registerIngestRoutes(app: FastifyInstance) {
  const processIngest = async (
    body: z.infer<typeof ingestBodySchema>,
    reply: FastifyReply,
  ) => {
    let trapId = extractTrapId(body);

    // If trapId isn't provided, allow gateway to send deviceId and map it to a provisioned sensor.
    if (!trapId) {
      const deviceId = extractDeviceId(body);
      if (!deviceId) {
        return reply
          .code(400)
          .send({
            error:
              'trapId is required (either top-level or inside decoded). Alternatively send deviceId for a provisioned sensor.',
          });
      }

      const provisioned = await app.prisma.sensor.findUnique({ where: { deviceId } });
      if (!provisioned) {
        return reply.code(400).send({ error: `Unknown deviceId '${deviceId}'. Provision the sensor first in /deploy-trap.` });
      }

      trapId = provisioned.trapId;
    }

    const receivedAt = body.receivedAt ? new Date(body.receivedAt) : new Date();
    const decoded = body.decoded;

    const batteryPctCandidate =
      decoded && typeof decoded === 'object' && typeof (decoded as any).batteryPct === 'number'
        ? Math.round((decoded as any).batteryPct)
        : null;

    const signalLevel =
      decoded && typeof decoded === 'object' && typeof (decoded as any).signalLevel === 'number'
        ? Math.max(0, Math.min(4, Math.round((decoded as any).signalLevel)))
        : deriveSignalLevelFromRssi(body.rssi);

    const existing = await app.prisma.sensor.findUnique({ where: { trapId } });

    const derived = deriveStatus(decoded, batteryPctCandidate ?? existing?.batteryPct ?? null);

    const updatedSensor = await app.prisma.sensor.upsert({
      where: { trapId },
      update: {
        lastActivityAt: receivedAt,
        batteryPct: batteryPctCandidate ?? undefined,
        signalLevel: signalLevel ?? undefined,
        status: existing?.status === 'OFFLINE' ? derived : derived,
      },
      create: {
        trapId,
        status: derived,
        lastActivityAt: receivedAt,
        batteryPct: batteryPctCandidate,
        signalLevel,
      },
    });

    await app.prisma.telemetryUplink.create({
      data: {
        receivedAt,
        gatewayId: body.gatewayId ?? null,
        deviceId: extractDeviceId(body) ?? null,
        trapId,
        rssi: body.rssi ?? null,
        snr: body.snr ?? null,
        payloadB64: body.payloadB64 ?? null,
        decoded: decoded ?? null,
        sensorId: updatedSensor.id,
      },
    });

    // Events on transitions
    if (existing && existing.status !== updatedSensor.status) {
      const isOnlineTransition = existing.status === 'OFFLINE' && updatedSensor.status !== 'OFFLINE';

      if (isOnlineTransition) {
        await app.prisma.event.create({
          data: {
            sensorId: updatedSensor.id,
            type: 'ONLINE',
            severity: 'INFO',
            title: `Sensor ${trapId} is back online`,
          },
        });
      }

      await app.prisma.event.create({
        data: {
          sensorId: updatedSensor.id,
          type: updatedSensor.status,
          severity: updatedSensor.status === 'TRIGGERED' ? 'CRITICAL' : updatedSensor.status === 'LOW_BATTERY' ? 'WARN' : 'INFO',
          title: `Sensor ${trapId} status: ${existing.status} → ${updatedSensor.status}`,
        },
      });
    }

    if (!existing) {
      await app.prisma.event.create({
        data: {
          sensorId: updatedSensor.id,
          type: 'INGEST',
          severity: 'INFO',
          title: `First uplink received for ${trapId}`,
        },
      });
    }

    return reply.send({ ok: true, sensor: updatedSensor });
  };

  app.post(
    '/api/ingest/lora',
    {
      preHandler: app.auth.requireApiKey('INGEST'),
    },
    async (request, reply) => {
      const parsed = ingestBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
      }

      return processIngest(parsed.data, reply);
    },
  );

  app.post(
    '/api/ingest/ttn',
    {
      preHandler: app.auth.requireApiKey('INGEST'),
    },
    async (request, reply) => {
      const parsed = ttnWebhookSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid TTN webhook body', details: parsed.error.flatten() });
      }

      const ttn = parsed.data;

      const deviceId = ttn.end_device_ids?.dev_eui || undefined;
      const receivedAt = ttn.uplink_message?.received_at || undefined;
      const decoded = ttn.uplink_message?.decoded_payload;

      const firstRx = ttn.uplink_message?.rx_metadata?.[0];
      const gatewayId = firstRx?.gateway_ids?.gateway_id;
      const rssi = firstRx?.rssi;
      const snr = firstRx?.snr;

      const body: z.infer<typeof ingestBodySchema> = {
        gatewayId,
        deviceId,
        receivedAt,
        rssi,
        snr,
        payloadB64: ttn.uplink_message?.frm_payload,
        decoded: decoded ?? null,
      };

      // Allow fallback where formatter places deviceId inside decoded_payload.
      if (!body.deviceId && body.decoded && typeof body.decoded === 'object') {
        const fallback = extractDeviceId({ decoded: body.decoded } as any);
        if (fallback) body.deviceId = fallback;
      }

      return processIngest(body, reply);
    },
  );
}
