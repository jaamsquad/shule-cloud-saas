"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Node < 19 doesn't expose Web Crypto as a global, which the MongoDB driver
// needs (uuidV4). Polyfill it so sessions/cursors work on older Node runtimes.
const crypto_1 = require("crypto");
if (!globalThis.crypto)
    globalThis.crypto = crypto_1.webcrypto;
const app_1 = __importDefault(require("./app"));
const mongodb_1 = require("./lib/mongodb");
// Force port 3000 to match Vite proxy
const PORT = 3000;
async function bootstrap() {
    try {
        // Test database connection
        await (0, mongodb_1.connectDB)();
        app_1.default.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            // Build marker — confirms the freshly-built code is the one running.
            console.log(`[BUILD] parent-portal diagnostics v2 · ${new Date().toISOString()}`);
        });
    }
    catch (error) {
        console.error('Server bootstrap failed:', error);
        process.exit(1);
    }
}
bootstrap();
