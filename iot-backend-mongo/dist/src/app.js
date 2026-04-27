"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const requestLogger_1 = require("./middleware/requestLogger");
const errorHandler_1 = require("./middleware/errorHandler");
const dataRoutes_1 = require("./routes/dataRoutes");
function buildApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json({ limit: '256kb' }));
    app.use(requestLogger_1.requestLogger);
    app.use('/api', dataRoutes_1.dataRoutes);
    app.use(errorHandler_1.errorHandler);
    return app;
}
