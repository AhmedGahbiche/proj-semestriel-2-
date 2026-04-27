"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthPlugin = registerAuthPlugin;
exports.generateApiKey = generateApiKey;
const node_crypto_1 = __importDefault(require("node:crypto"));
const zod_1 = require("zod");
const apiKeyHeaderSchema = zod_1.z
    .string()
    .min(10)
    .max(512);
function sha256Hex(value) {
    return node_crypto_1.default.createHash('sha256').update(value).digest('hex');
}
function isAdminScope(scope) {
    return scope === 'ADMIN';
}
function registerAuthPlugin(app) {
    app.decorate('auth', {
        requireApiKey: (requiredScope) => async (request, reply) => {
            const rawHeader = request.headers['x-api-key'];
            const rawKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
            if (!rawKey) {
                return reply.code(401).send({ error: 'Missing X-API-Key' });
            }
            const parsed = apiKeyHeaderSchema.safeParse(rawKey);
            if (!parsed.success) {
                return reply.code(401).send({ error: 'Invalid X-API-Key' });
            }
            const bootstrapAdminKey = process.env.ADMIN_BOOTSTRAP_KEY;
            if (bootstrapAdminKey && rawKey === bootstrapAdminKey) {
                if (!isAdminScope(requiredScope)) {
                    // Bootstrap key is admin; allow it for all scopes.
                    request.apiKey = { id: 'bootstrap', scope: 'ADMIN' };
                    return;
                }
                request.apiKey = { id: 'bootstrap', scope: 'ADMIN' };
                return;
            }
            const hash = sha256Hex(rawKey);
            const apiKey = await app.prisma.apiKey.findFirst({
                where: { hash, revokedAt: null },
                select: { id: true, scope: true },
            });
            if (!apiKey) {
                return reply.code(401).send({ error: 'Invalid API key' });
            }
            if (requiredScope === 'ADMIN' && apiKey.scope !== 'ADMIN') {
                return reply.code(403).send({ error: 'Insufficient scope' });
            }
            // For INGEST routes we allow INGEST or ADMIN.
            request.apiKey = { id: apiKey.id, scope: apiKey.scope };
        },
    });
}
function generateApiKey() {
    const key = node_crypto_1.default.randomBytes(32).toString('base64url');
    const prefix = key.slice(0, 8);
    const hash = sha256Hex(key);
    return { key, prefix, hash };
}
