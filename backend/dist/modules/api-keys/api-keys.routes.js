"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerApiKeysRoutes = registerApiKeysRoutes;
const zod_1 = require("zod");
const auth_1 = require("../../plugins/auth");
const createApiKeyBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120),
    scope: zod_1.z.enum(['ADMIN', 'INGEST']),
});
function registerApiKeysRoutes(app) {
    app.get('/api/api-keys', { preHandler: app.auth.requireApiKey('ADMIN') }, async () => {
        const keys = await app.prisma.apiKey.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                scope: true,
                prefix: true,
                createdAt: true,
                revokedAt: true,
            },
        });
        return { items: keys };
    });
    app.post('/api/api-keys', { preHandler: app.auth.requireApiKey('ADMIN') }, async (request, reply) => {
        const parsed = createApiKeyBody.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
        }
        const generated = (0, auth_1.generateApiKey)();
        const row = await app.prisma.apiKey.create({
            data: {
                name: parsed.data.name,
                scope: parsed.data.scope,
                prefix: generated.prefix,
                hash: generated.hash,
            },
            select: { id: true, name: true, scope: true, createdAt: true, prefix: true },
        });
        return {
            ...row,
            key: generated.key,
        };
    });
    app.delete('/api/api-keys/:id', { preHandler: app.auth.requireApiKey('ADMIN') }, async (request, reply) => {
        const id = request.params.id;
        if (!id) {
            return reply.code(400).send({ error: 'Missing id' });
        }
        await app.prisma.apiKey.update({
            where: { id },
            data: { revokedAt: new Date() },
        });
        return reply.code(204).send();
    });
}
