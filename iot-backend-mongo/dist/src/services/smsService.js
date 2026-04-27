"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSms = sendSms;
const twilio_1 = require("twilio");
const env_1 = require("../config/env");
let twilioClient = null;
function getTwilioClient() {
    if (twilioClient)
        return twilioClient;
    if (!env_1.env.twilio.accountSid || !env_1.env.twilio.authToken) {
        throw new Error('Twilio env vars are not configured');
    }
    twilioClient = new twilio_1.Twilio(env_1.env.twilio.accountSid, env_1.env.twilio.authToken);
    return twilioClient;
}
async function sendSms(target) {
    // If Twilio not configured, do nothing (keeps local dev simple)
    if (!env_1.env.twilio.accountSid || !env_1.env.twilio.authToken || !env_1.env.twilio.from) {
        console.warn('[sms] Twilio not configured; skipping SMS:', { to: target.to, body: target.body });
        return;
    }
    const client = getTwilioClient();
    await client.messages.create({
        from: env_1.env.twilio.from,
        to: target.to,
        body: target.body
    });
}
