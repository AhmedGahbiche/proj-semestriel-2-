"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const requestLogger = (req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - startedAt;
        console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    });
    next();
};
exports.requestLogger = requestLogger;
