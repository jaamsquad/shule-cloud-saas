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

/** Send an SMS (or WhatsApp) via Talksasa to one or more recipients. */
export async function talksasaSend(cfg: TalksasaConfig, numbers: string[], message: string, opts: { type?: 'plain' | 'whatsapp'; scheduleTime?: string } = {}) {
    if (!cfg?.apiToken) return { ok: false, sent: 0, failed: numbers.length, error: 'Talksasa API token not configured.' };
    const recipient = numbers.map(normalize).filter(n => n.length >= 9).join(',');
    if (!recipient) return { ok: false, sent: 0, failed: numbers.length, error: 'No valid recipients.' };
    try {
        const resp = await fetch(`${BASE}/sms/send`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${cfg.apiToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                recipient,
                sender_id: cfg.senderId || 'TALKSASA',
                type: opts.type === 'whatsapp' ? 'whatsapp' : 'plain',
                message,
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
    // Talksasa returns { status, data: <unit info> } — surface a numeric balance when possible.
    const raw = data?.data;
    const balance = typeof raw === 'number' ? raw : Number(raw?.balance ?? raw?.sms_balance ?? raw?.units ?? raw) || raw;
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
