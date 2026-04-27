"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: node_path_1.default.resolve(__dirname, '../.env') });
const app_1 = require("./app");
const port = Number(process.env.PORT ?? 4000);
async function main() {
    const app = await (0, app_1.buildApp)({ startJobs: true });
    await app.listen({ port, host: '0.0.0.0' });
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
