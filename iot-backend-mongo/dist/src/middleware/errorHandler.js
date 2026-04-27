"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
    if (statusCode >= 500) {
        console.error('[error]', err);
    }
    res.status(statusCode).json({
        ok: false,
        error: {
            message: statusCode >= 500 ? 'Internal Server Error' : String(err?.message ?? 'Request failed')
        }
    });
};
exports.errorHandler = errorHandler;
