import { Twilio } from 'twilio';
import { env } from '../config/env';

export type SmsTarget = {
  to: string;
  body: string;
};

let twilioClient: Twilio | null = null;

function getTwilioClient(): Twilio {
  if (twilioClient) return twilioClient;
  if (!env.twilio.accountSid || !env.twilio.authToken) {
    throw new Error('Twilio env vars are not configured');
  }
  twilioClient = new Twilio(env.twilio.accountSid, env.twilio.authToken);
  return twilioClient;
}

export async function sendSms(target: SmsTarget): Promise<void> {
  // If Twilio not configured, do nothing (keeps local dev simple)
  if (!env.twilio.accountSid || !env.twilio.authToken || !env.twilio.from) {
    console.warn('[sms] Twilio not configured; skipping SMS:', { to: target.to, body: target.body });
    return;
  }

  const client = getTwilioClient();

  await client.messages.create({
    from: env.twilio.from,
    to: target.to,
    body: target.body
  });
}
