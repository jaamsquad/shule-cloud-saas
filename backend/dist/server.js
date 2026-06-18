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
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const mongodb_1 = require("./lib/mongodb");
const socket_1 = require("./services/whatsapp/socket");
const SessionManager_1 = require("./services/whatsapp/SessionManager");
// Force port 3000 to match Vite proxy
const PORT = 3000;
async function bootstrap() {
    try {
        // Test database connection
        await (0, mongodb_1.connectDB)();
        // Wrap Express in an HTTP server so Socket.IO can share the port.
        const server = http_1.default.createServer(app_1.default);
        (0, socket_1.attachWhatsAppSocket)(server);
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            // Build marker — confirms the freshly-built code is the one running.
            console.log(`[BUILD] whatsapp-qr v1 · ${new Date().toISOString()}`);
        });
        // ── WhatsApp background jobs ──────────────────────────────────────────
        // Restore previously-connected school sessions shortly after boot, then
        // run a heartbeat every minute to reconnect stale sessions / clean QRs.
        setTimeout(() => { SessionManager_1.whatsAppManager.restoreAll().catch(() => { }); }, 8000);
        setInterval(() => { SessionManager_1.whatsAppManager.heartbeat().catch(() => { }); }, 60000);
    }
    catch (error) {
        console.error('Server bootstrap failed:', error);
        process.exit(1);
    }
}
bootstrap();
