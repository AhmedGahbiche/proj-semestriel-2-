"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../src/config/db");
const env_1 = require("../src/config/env");
const Device_1 = require("../src/models/Device");
function getArg(name) {
    const idx = process.argv.findIndex((a) => a === `--${name}`);
    if (idx === -1)
        return undefined;
    return process.argv[idx + 1];
}
async function main() {
    const deviceId = getArg('deviceId');
    const apiKey = getArg('apiKey');
    const phoneNumber = getArg('phone');
    const name = getArg('name');
    const temperatureLimitStr = getArg('tempLimit');
    if (!deviceId || !apiKey) {
        console.error('Usage: npm run seed:device -- --deviceId <id> --apiKey <key> [--phone +216..]');
        process.exit(1);
    }
    const temperatureLimit = temperatureLimitStr ? Number(temperatureLimitStr) : undefined;
    await (0, db_1.connectDb)();
    const doc = await Device_1.DeviceModel.findOneAndUpdate({ deviceId }, { deviceId, apiKey, phoneNumber, name, temperatureLimit }, { upsert: true, new: true });
    console.log('Device upserted:', {
        deviceId: doc.deviceId,
        apiKey: doc.apiKey,
        phoneNumber: doc.phoneNumber,
        temperatureLimit: doc.temperatureLimit ?? env_1.env.alertDefaultTemperatureLimit
    });
    process.exit(0);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
