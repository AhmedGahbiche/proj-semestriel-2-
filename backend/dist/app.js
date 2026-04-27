"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
require("dotenv/config");
const cors_1 = __importDefault(require("@fastify/cors"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const fastify_1 = __importDefault(require("fastify"));
const prisma_1 = require("./db/prisma");
const offline_detection_1 = require("./jobs/offline-detection");
const alerts_routes_1 = require("./modules/alerts/alerts.routes");
const api_keys_routes_1 = require("./modules/api-keys/api-keys.routes");
const events_routes_1 = require("./modules/events/events.routes");
const health_routes_1 = require("./modules/health/health.routes");
const ingest_routes_1 = require("./modules/ingest/ingest.routes");
const sensors_routes_1 = require("./modules/sensors/sensors.routes");
const auth_1 = require("./plugins/auth");
async function buildApp(options) {
    const app = (0, fastify_1.default)({ logger: true });
    const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
    await app.register(cors_1.default, {
        origin: corsOrigin,
        credentials: true,
    });
    await app.register(rate_limit_1.default, {
        max: 120,
        timeWindow: '1 minute',
    });
    app.decorate('prisma', prisma_1.prisma);
    (0, auth_1.registerAuthPlugin)(app);
    (0, health_routes_1.registerHealthRoutes)(app);
    (0, api_keys_routes_1.registerApiKeysRoutes)(app);
    (0, sensors_routes_1.registerSensorsRoutes)(app);
    (0, events_routes_1.registerEventsRoutes)(app);
    (0, alerts_routes_1.registerAlertsRoutes)(app);
    (0, ingest_routes_1.registerIngestRoutes)(app);
    if (options?.startJobs !== false) {
        (0, offline_detection_1.startOfflineDetectionJob)(app);
    }
    return app;
}
