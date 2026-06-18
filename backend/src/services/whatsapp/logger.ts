/**
 * Structured logging for the WhatsApp subsystem.
 *
 * Emits single-line JSON so logs are grep-able and machine-parseable. Captures
 * connection, logout, errors, reconnections, QR generation and auth events.
 */
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
