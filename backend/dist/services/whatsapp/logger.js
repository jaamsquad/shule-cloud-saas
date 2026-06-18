"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logEvent = logEvent;
function logEvent(schoolId, event, meta = {}) {
    const entry = {
        ts: new Date().toISOString(),
        scope: 'whatsapp',
        schoolId,
        event,
        ...meta,
    };
    const line = JSON.stringify(entry);
    if (event === 'error' || event === 'restore_error')
        console.error(line);
    else
        console.log(line);
}
