"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function required(name) {
    const value = process.env[name];
    if (!value)
        throw new Error(`Missing required env var: ${name}`);
    return value;
}
exports.env = {
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
