import { connectDb } from '../src/config/db';
import { env } from '../src/config/env';
import { DeviceModel } from '../src/models/Device';

function getArg(name: string): string | undefined {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx === -1) return undefined;
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

  await connectDb();

  const doc = await DeviceModel.findOneAndUpdate(
    { deviceId },
    { deviceId, apiKey, phoneNumber, name, temperatureLimit },
    { upsert: true, new: true }
  );

  console.log('Device upserted:', {
    deviceId: doc.deviceId,
    apiKey: doc.apiKey,
    phoneNumber: doc.phoneNumber,
    temperatureLimit: doc.temperatureLimit ?? env.alertDefaultTemperatureLimit
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
