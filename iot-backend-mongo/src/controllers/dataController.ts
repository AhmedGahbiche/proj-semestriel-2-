import { DeviceModel } from '../models/Device';
import { SensorDataModel } from '../models/SensorData';
import { env } from '../config/env';
import { sendSms } from '../services/smsService';
import { getIo } from '../services/socket';

function parseTimestamp(input: unknown): Date {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(input);
  if (typeof input === 'string') {
    const d = new Date(input);
    if (!Number.isNaN(d.valueOf())) return d;
  }
  return new Date();
}

function clampLimit(raw: unknown, max = 500): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : 100;
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.min(Math.floor(n), max);
}

export async function postData(req: any, res: any) {
  if (!req.auth || req.auth.type !== 'device') {
    return res.status(403).json({ ok: false, error: { message: 'Device key required' } });
  }

  const body = req.body ?? {};
  const deviceId = String(body.deviceId ?? '').trim();

  if (!deviceId) {
    return res.status(400).json({ ok: false, error: { message: 'deviceId is required' } });
  }

  if (deviceId !== req.auth.deviceId) {
    return res
      .status(403)
      .json({ ok: false, error: { message: 'deviceId does not match API key' } });
  }

  const temperature = body.temperature != null ? Number(body.temperature) : undefined;
  const humidity = body.humidity != null ? Number(body.humidity) : undefined;
  const timestamp = parseTimestamp(body.timestamp);

  const device = await DeviceModel.findOne({ deviceId });
  if (!device) {
    return res.status(401).json({ ok: false, error: { message: 'Unknown device' } });
  }

  const created = await SensorDataModel.create({
    device: device._id,
    deviceId,
    temperature,
    humidity,
    timestamp,
    raw: body
  });

  const payload = {
    id: String(created._id),
    deviceId,
    temperature,
    humidity,
    timestamp: created.timestamp.toISOString()
  };

  // Realtime updates
  try {
    const io = getIo();
    io.emit('sensorData', payload);
    io.to(`device:${deviceId}`).emit('sensorData:device', payload);
  } catch {
    // ignore if socket not initialized
  }

  // SMS alert
  const limit = device.temperatureLimit ?? env.alertDefaultTemperatureLimit;
  const exceeds = typeof temperature === 'number' && Number.isFinite(temperature) && temperature > limit;

  if (exceeds) {
    const to = device.phoneNumber || env.alertToPhone;

    if (to) {
      const now = new Date();
      const last = device.lastAlertAt ? new Date(device.lastAlertAt) : null;
      const cooldownMs = env.alertCooldownSeconds * 1000;
      const canSend = !last || now.valueOf() - last.valueOf() >= cooldownMs;

      if (canSend) {
        await sendSms({
          to,
          body: `ALERT: ${deviceId} temperature ${temperature}°C exceeded limit ${limit}°C at ${payload.timestamp}`
        });
        device.lastAlertAt = now;
        await device.save();
      }
    }
  }

  return res.status(201).json({ ok: true, data: payload });
}

export async function getData(req: any, res: any) {
  if (!req.auth) return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });

  const limit = clampLimit(req.query?.limit);
  const before = req.query?.before ? parseTimestamp(req.query.before) : null;

  const filter: any = {};

  if (req.auth.type === 'device') {
    filter.deviceId = req.auth.deviceId;
  }

  if (before) {
    filter.timestamp = { $lt: before };
  }

  const rows = await SensorDataModel.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

  return res.json({
    ok: true,
    data: rows.map((r) => ({
      id: String(r._id),
      deviceId: r.deviceId,
      temperature: r.temperature,
      humidity: r.humidity,
      timestamp: new Date(r.timestamp).toISOString()
    }))
  });
}

export async function getDataByDevice(req: any, res: any) {
  if (!req.auth) return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });

  const deviceId = String(req.params?.deviceId ?? '').trim();
  if (!deviceId) {
    return res.status(400).json({ ok: false, error: { message: 'deviceId is required' } });
  }

  if (req.auth.type === 'device' && req.auth.deviceId !== deviceId) {
    return res.status(403).json({ ok: false, error: { message: 'Forbidden' } });
  }

  const limit = clampLimit(req.query?.limit);

  const rows = await SensorDataModel.find({ deviceId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

  return res.json({
    ok: true,
    data: rows.map((r) => ({
      id: String(r._id),
      deviceId: r.deviceId,
      temperature: r.temperature,
      humidity: r.humidity,
      timestamp: new Date(r.timestamp).toISOString()
    }))
  });
}
