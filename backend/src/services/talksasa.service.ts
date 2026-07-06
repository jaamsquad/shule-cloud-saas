// ─── Talksasa SMS / WhatsApp vendor ────────────────────────────────────────────
// https://bulksms.talksasa.com/api/v3 — Bearer-token API. Used by schools, the
// organization portal, and the platform owner to send SMS/WhatsApp.

const BASE = 'https://bulksms.talksasa.com/api/v3';

export interface TalksasaConfig { apiToken: string; senderId?: string }

const normalize = (raw: string) => {
    let p = String(raw || '').replace(/[^\d]/g, '');
    if (p.startsWith('0')) p = '254' + p.slice(1);
    else if (p.startsWith('7') || p.startsWith('1')) p = '254' + p;
    return p;
};

// Fold characters outside plain GSM-7/ASCII to their nearest ASCII equivalent.
// Any non-GSM-7 character (em-dash, curly quotes, ellipsis, emoji, etc.) makes
// Talksasa silently reclassify the message as Unicode (70 chars/segment instead
// of 160), splitting it into multiple parts — which has been observed to trigger
// a server-side "Array to string conversion" error on their end for certain
// multi-part sends, and doubles/triples the SMS cost even when it doesn't fail.
// Sanitising here, at the single call-through point every sender uses, means no
// caller anywhere in the codebase can reintroduce this by typing a smart quote.
const GSM7_REPLACEMENTS: Record<string, string> = {
    '—': '-', '–': '-',            // em dash, en dash
    '‘': "'", '’': "'",            // curly single quotes
    '“': '"', '”': '"',            // curly double quotes
    '…': '...',                          // ellipsis
    ' ': ' ',                             // non-breaking space
};
const toGsm7Safe = (text: string): string =>
    String(text || '')
        .replace(/[—–‘’“”… ]/g, (c) => GSM7_REPLACEMENTS[c] || '')
        // Strip anything else outside printable ASCII (emoji, other unicode
        // punctuation, etc.) rather than let it silently balloon the SMS cost.
        .replace(/[^\x00-\x7F]/g, '');

/** Send an SMS (or WhatsApp) via Talksasa to one or more recipients. */
export async function talksasaSend(cfg: TalksasaConfig, numbers: string[], message: string, opts: { type?: 'plain' | 'whatsapp'; scheduleTime?: string } = {}) {
    if (!cfg?.apiToken) return { ok: false, sent: 0, failed: numbers.length, error: 'Talksasa API token not configured.' };
    const recipient = numbers.map(normalize).filter(n => n.length >= 9).join(',');
    if (!recipient) return { ok: false, sent: 0, failed: numbers.length, error: 'No valid recipients.' };
    const safeMessage = opts.type === 'whatsapp' ? message : toGsm7Safe(message);
    try {
        const resp = await fetch(`${BASE}/sms/send`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${cfg.apiToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                recipient,
                sender_id: cfg.senderId || 'TALKSASA',
                type: opts.type === 'whatsapp' ? 'whatsapp' : 'plain',
                message: safeMessage,
                ...(opts.scheduleTime ? { schedule_time: opts.scheduleTime } : {}),
            }),
        });
        const data: any = await resp.json().catch(() => ({}));
        const ok = resp.ok && data?.status === 'success';
        const count = numbers.length;
        return { ok, sent: ok ? count : 0, failed: ok ? 0 : count, raw: data, error: ok ? undefined : (data?.message || `HTTP ${resp.status}`) };
    } catch (e: any) {
        return { ok: false, sent: 0, failed: numbers.length, error: e.message };
    }
}

/** Check the token via the profile endpoint. */
export async function talksasaTest(cfg: TalksasaConfig) {
    if (!cfg?.apiToken) throw new Error('API token required.');
    const resp = await fetch(`${BASE}/me`, { headers: { Authorization: `Bearer ${cfg.apiToken}`, Accept: 'application/json' } });
    if (!resp.ok) throw new Error(`Talksasa returned HTTP ${resp.status}. Check your API token.`);
    return { ok: true };
}

/** SMS unit balance. */
export async function talksasaBalance(cfg: TalksasaConfig) {
    if (!cfg?.apiToken) throw new Error('API token required.');
    const resp = await fetch(`${BASE}/balance`, { headers: { Authorization: `Bearer ${cfg.apiToken}`, Accept: 'application/json' } });
    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.status === 'error') throw new Error(data?.message || `HTTP ${resp.status}`);
    // Talksasa returns { status, data: { remaining_balance: "Ksh115", ... } } — surface a clean string.
    const raw = data?.data;
    let balance: any = raw;
    if (raw && typeof raw === 'object') balance = raw.remaining_balance ?? raw.balance ?? raw.sms_balance ?? raw.units ?? JSON.stringify(raw);
    // Normalise "Ksh115" → "Ksh 115" for readability.
    if (typeof balance === 'string') balance = balance.replace(/(ksh)\s*/i, 'KSh ').trim();
    return { balance, raw };
}

/** Account profile. */
export async function talksasaProfile(cfg: TalksasaConfig) {
    if (!cfg?.apiToken) throw new Error('API token required.');
    const resp = await fetch(`${BASE}/me`, { headers: { Authorization: `Bearer ${cfg.apiToken}`, Accept: 'application/json' } });
    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.status === 'error') throw new Error(data?.message || `HTTP ${resp.status}`);
    return data?.data || data;
}

// Prefix every outgoing message with the sender's name, e.g.
//   "Egerton High School: <message>"
export const brandMessage = (name: string | undefined, message: string) => {
    const n = String(name || '').trim();
    if (!n) return message;
    // Avoid double-prefixing if it already starts with the name.
    return message.startsWith(n) ? message : `${n}: ${message}`;
};
