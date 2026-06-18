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
