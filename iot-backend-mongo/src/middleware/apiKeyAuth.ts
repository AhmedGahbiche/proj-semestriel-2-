import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { DeviceModel } from '../models/Device';

function extractApiKey(req: any): string {
  const header = req.header('x-api-key') ?? req.header('X-API-Key');
  if (typeof header === 'string' && header.trim()) return header.trim();

  const auth = req.header('authorization') ?? req.header('Authorization');
  if (typeof auth === 'string') {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m?.[1]) return m[1].trim();
  }

  return '';
}

export const apiKeyAuth: RequestHandler = async (req, res, next) => {
  const key = extractApiKey(req);

  if (!key) {
    return res.status(401).json({ ok: false, error: { message: 'Missing API key' } });
  }

  if (env.adminApiKey && key === env.adminApiKey) {
    req.auth = { type: 'admin' };
    return next();
  }

  const device = await DeviceModel.findOne({ apiKey: key }).select({ deviceId: 1 }).exec();
  if (!device) {
    return res.status(401).json({ ok: false, error: { message: 'Invalid API key' } });
  }

  req.auth = { type: 'device', deviceId: device.deviceId, deviceObjectId: String(device._id) };
  return next();
};
