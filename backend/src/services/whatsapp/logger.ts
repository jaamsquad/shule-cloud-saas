/**
 * Structured logging for the WhatsApp subsystem.
 *
 * Emits single-line JSON so logs are grep-able and machine-parseable. Captures
 * connection, logout, errors, reconnections, QR generation and auth events.
 */

/**
 * `libsignal` logs verbosely via console.* directly (it ignores Baileys' logger),
 * dumping huge SessionEntry objects on every key rotation. Install a narrow
 * console filter that drops ONLY those known-noisy libsignal lines, leaving every
 * other log untouched. Idempotent — safe to call once at boot.
 */
const NOISE = [
    'Closing open session in favor of incoming prekey bundle',
    'Closing session:',
    'Opening session:',
    'Removing old closed session:',
    'Migrating session to:',
    'Failed to decrypt message with any known session',
    'Session error:',
    'SessionEntry {',
];
let filterInstalled = false;
export function installSignalLogFilter(): void {
    if (filterInstalled) return;
    filterInstalled = true;
    const wrap = (orig: (...a: any[]) => void) => (...args: any[]) => {
        const first = args[0];
        if (typeof first === 'string' && NOISE.some(n => first.includes(n))) return;
        // A SessionEntry object dump comes through as an object arg — drop it too.
        if (first && typeof first === 'object' && (first as any)._chains && (first as any).currentRatchet) return;
        orig(...args);
    };
    console.info = wrap(console.info.bind(console));
    console.warn = wrap(console.warn.bind(console));
    console.error = wrap(console.error.bind(console));
}

type WaEventType =
    | 'connect_initiated' | 'connected' | 'disconnect' | 'disconnected'
    | 'reconnecting' | 'logout' | 'qr_generated' | 'authenticated'
    | 'session_deleted' | 'restore_on_boot' | 'restore_error'
    | 'message_sent' | 'message_received' | 'error' | string;

/**
 * A pino-compatible, near-silent logger for Baileys. Passing `console` makes
 * Baileys spew `Trace:` stacks on every signal-key cache op (console has no
 * proper log levels). This stub satisfies Baileys' logger interface and only
 * surfaces real errors, keeping the process logs clean.
 */
export function makeSilentLogger(): any {
    const noop = () => {};
    const logger: any = {
        level: 'silent',
        trace: noop, debug: noop, info: noop, warn: noop,
        error: (...args: any[]) => console.error('[baileys]', ...args.filter(a => typeof a !== 'object')),
        fatal: (...args: any[]) => console.error('[baileys:fatal]', ...args.filter(a => typeof a !== 'object')),
    };
    logger.child = () => logger;   // Baileys calls logger.child({...})
    return logger;
}

export function logEvent(schoolId: string, event: WaEventType, meta: Record<string, any> = {}): void {
    const entry = {
        ts: new Date().toISOString(),
        scope: 'whatsapp',
        schoolId,
        event,
        ...meta,
    };
    const line = JSON.stringify(entry);
    if (event === 'error' || event === 'restore_error') console.error(line);
    else console.log(line);
}
