import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4100),

  mongodbUri: required('MONGODB_URI'),

  adminApiKey: process.env.ADMIN_API_KEY ?? '',

  alertDefaultTemperatureLimit: Number(process.env.ALERT_DEFAULT_TEMPERATURE_LIMIT ?? 35),
  alertCooldownSeconds: Number(process.env.ALERT_COOLDOWN_SECONDS ?? 300),
  alertToPhone: process.env.ALERT_TO_PHONE ?? '',

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
    authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    from: process.env.TWILIO_FROM ?? ''
  }
};
