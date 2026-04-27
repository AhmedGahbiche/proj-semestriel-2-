"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const db_1 = require("./config/db");
const env_1 = require("./config/env");
const socket_1 = require("./services/socket");
async function main() {
    await (0, db_1.connectDb)();
    const app = (0, app_1.buildApp)();
    const server = http_1.default.createServer(app);
    (0, socket_1.initSocket)(server);
    server.listen(env_1.env.port, () => {
        console.log(`IoT backend listening on http://localhost:${env_1.env.port}`);
    });
}
main().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
});
