"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postData = postData;
exports.getData = getData;
exports.getDataByDevice = getDataByDevice;
const Device_1 = require("../models/Device");
const SensorData_1 = require("../models/SensorData");
const env_1 = require("../config/env");
const smsService_1 = require("../services/smsService");
const socket_1 = require("../services/socket");
function parseTimestamp(input) {
    if (!input)
        return new Date();
    if (input instanceof Date)
        return input;
    if (typeof input === 'number')
        return new Date(input);
    if (typeof input === 'string') {
        const d = new Date(input);
        if (!Number.isNaN(d.valueOf()))
            return d;
    }
    return new Date();
}
function clampLimit(raw, max = 500) {
    const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : 100;
    if (!Number.isFinite(n) || n <= 0)
        return 100;
    return Math.min(Math.floor(n), max);
}
async function postData(req, res) {
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
    const device = await Device_1.DeviceModel.findOne({ deviceId });
    if (!device) {
        return res.status(401).json({ ok: false, error: { message: 'Unknown device' } });
    }
    const created = await SensorData_1.SensorDataModel.create({
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
        const io = (0, socket_1.getIo)();
        io.emit('sensorData', payload);
        io.to(`device:${deviceId}`).emit('sensorData:device', payload);
    }
    catch {
        // ignore if socket not initialized
    }
    // SMS alert
    const limit = device.temperatureLimit ?? env_1.env.alertDefaultTemperatureLimit;
    const exceeds = typeof temperature === 'number' && Number.isFinite(temperature) && temperature > limit;
    if (exceeds) {
        const to = device.phoneNumber || env_1.env.alertToPhone;
        if (to) {
            const now = new Date();
            const last = device.lastAlertAt ? new Date(device.lastAlertAt) : null;
            const cooldownMs = env_1.env.alertCooldownSeconds * 1000;
            const canSend = !last || now.valueOf() - last.valueOf() >= cooldownMs;
            if (canSend) {
                await (0, smsService_1.sendSms)({
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
async function getData(req, res) {
    if (!req.auth)
        return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });
    const limit = clampLimit(req.query?.limit);
    const before = req.query?.before ? parseTimestamp(req.query.before) : null;
    const filter = {};
    if (req.auth.type === 'device') {
        filter.deviceId = req.auth.deviceId;
    }
    if (before) {
        filter.timestamp = { $lt: before };
    }
    const rows = await SensorData_1.SensorDataModel.find(filter)
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
async function getDataByDevice(req, res) {
    if (!req.auth)
        return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });
    const deviceId = String(req.params?.deviceId ?? '').trim();
    if (!deviceId) {
        return res.status(400).json({ ok: false, error: { message: 'deviceId is required' } });
    }
    if (req.auth.type === 'device' && req.auth.deviceId !== deviceId) {
        return res.status(403).json({ ok: false, error: { message: 'Forbidden' } });
    }
    const limit = clampLimit(req.query?.limit);
    const rows = await SensorData_1.SensorDataModel.find({ deviceId })
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
