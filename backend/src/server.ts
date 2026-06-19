import dotenv from 'dotenv';
dotenv.config();

// Node < 19 doesn't expose Web Crypto as a global, which the MongoDB driver
// needs (uuidV4). Polyfill it so sessions/cursors work on older Node runtimes.
import { webcrypto } from 'crypto';
if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto;

import http from 'http';
import app from './app';
import { connectDB } from './lib/mongodb';
import { attachWhatsAppSocket } from './services/whatsapp/socket';
import { whatsAppManager } from './services/whatsapp/SessionManager';
import { installSignalLogFilter } from './services/whatsapp/logger';

// Quieten libsignal's direct console noise (huge SessionEntry dumps on key rotation).
installSignalLogFilter();

// Force port 3000 to match Vite proxy
const PORT = 3000;

async function bootstrap() {
    try {
        // Test database connection
        await connectDB();

        // Wrap Express in an HTTP server so Socket.IO can share the port.
        const server = http.createServer(app);
        attachWhatsAppSocket(server);

        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            // Build marker — confirms the freshly-built code is the one running.
            console.log(`[BUILD] whatsapp-qr v1 · ${new Date().toISOString()}`);
        });

        // ── WhatsApp background jobs ──────────────────────────────────────────
        // Restore previously-connected school sessions shortly after boot, then
        // run a heartbeat every minute to reconnect stale sessions / clean QRs.
        setTimeout(() => { whatsAppManager.restoreAll().catch(() => {}); }, 8000);
        setInterval(() => { whatsAppManager.heartbeat().catch(() => {}); }, 60_000);
    } catch (error) {
        console.error('Server bootstrap failed:', error);
        process.exit(1);
    }
}

bootstrap();
