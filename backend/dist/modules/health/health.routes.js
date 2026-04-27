"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHealthRoutes = registerHealthRoutes;
function registerHealthRoutes(app) {
    app.get('/api/health', async () => {
        return { ok: true, time: new Date().toISOString() };
    });
}
