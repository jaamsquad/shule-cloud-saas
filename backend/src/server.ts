import dotenv from 'dotenv';
dotenv.config();

// Node < 19 doesn't expose Web Crypto as a global, which the MongoDB driver
// needs (uuidV4). Polyfill it so sessions/cursors work on older Node runtimes.
import { webcrypto } from 'crypto';
if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto;

import http from 'http';
import app from './app';
import { connectDB, getMetaDb } from './lib/mongodb';
import { backfillSchoolIds } from './lib/schoolId';
import { attachWhatsAppSocket } from './services/whatsapp/socket';
import { attachSmsSocket } from './services/smsSocket';
import { whatsAppManager } from './services/whatsapp/SessionManager';
import { installSignalLogFilter } from './services/whatsapp/logger';
import { releaseScheduledSms } from './services/smsScheduler';

// Quieten libsignal's direct console noise (huge SessionEntry dumps on key rotation).
installSignalLogFilter();

// Force port 3000 to match Vite proxy
const PORT = 3000;

async function bootstrap() {
    try {
        // Test database connection
        await connectDB();

        // Give every school a ShuleCloud School ID (A######M) if it lacks one.
        backfillSchoolIds(getMetaDb())
            .then(n => { if (n) console.log(`[SchoolId] Assigned School IDs to ${n} school(s)`); })
            .catch(e => console.error('[SchoolId] Backfill failed:', e));

        // Wrap Express in an HTTP server so Socket.IO can share the port.
        const server = http.createServer(app);
        const io = attachWhatsAppSocket(server);
        attachSmsSocket(io);   // /sms namespace for the Android gateway app

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

        // ── SMS scheduler ─────────────────────────────────────────────────────
        // Release due scheduled SMS jobs every 30s across all tenants.
        setInterval(() => { releaseScheduledSms().catch(() => {}); }, 30_000);

        // ── Scheduled class promotion ─────────────────────────────────────────
        // Runs any promotion whose date & time has come (Grade 1 East → Grade 2 East).
        const { runDuePromotionsAllTenants } = require('./services/promotion.service');
        setInterval(() => { runDuePromotionsAllTenants().catch(() => {}); }, 60_000);

        // ── Meeting reminders (Communication → Meetings) ─────────────────────
        const { sendDueMeetingReminders } = require('./routes/meetings.routes');
        setInterval(() => { sendDueMeetingReminders().catch(() => {}); }, 60_000);

        // ── Academic year/term auto-creation + advance + promotion ─────────────
        // Keeps every school one academic year ahead (Term 1/2/3 carried forward from the
        // latest year's own dates), advances the active term/year as dates arrive, and —
        // only on a year rollover (never a plain term-to-term move) — auto-promotes
        // students up the Grade/Form ladder (promotion.service.ts). All for tenants nobody
        // is actively viewing — active ones self-heal on their own via syncCurrentTerm()
        // (cbcTerm.ts), called on every request.
        const { ensureNextAcademicYearAllTenants } = require('./lib/academicYears');
        setInterval(() => { ensureNextAcademicYearAllTenants().catch(() => {}); }, 6 * 60 * 60_000);

        // ── M-PESA auto-sync ──────────────────────────────────────────────────
        // Pull recent Till/Paybill transactions from Safaricom every 5 min for
        // every tenant with the Pull API registered, so payments appear without
        // anyone clicking "Sync".
        const { runScheduledPullSync } = require('./services/autoSync.service');
        setTimeout(() => { runScheduledPullSync().catch(() => {}); }, 20_000);
        setInterval(() => { runScheduledPullSync().catch(() => {}); }, 5 * 60_000);
    } catch (error) {
        console.error('Server bootstrap failed:', error);
        process.exit(1);
    }
}

bootstrap();
