/**
 * Google Calendar OAuth2 (authorization-code flow) + a thin REST wrapper around the Calendar
 * API v3. No `googleapis` SDK dependency — plain `fetch`, matching this codebase's existing
 * pattern for other third-party APIs (M-Pesa, KRA: see services/mpesa.service.ts).
 *
 * The client secret and every access/refresh token stay server-side: this module is backend-only
 * and is never imported from frontend code. Tokens are never logged.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const CAL_BASE = 'https://www.googleapis.com/calendar/v3';
// calendar.events (not the broader `calendar` scope) is enough to create/update/delete events —
// the minimum Google permission for what ShuleCloud actually needs. `openid email` only
// identifies which Google account connected; it grants no extra data access.
export const GOOGLE_CALENDAR_SCOPES = 'openid email https://www.googleapis.com/auth/calendar.events';

export interface GoogleCalendarEnv { clientId: string; clientSecret: string; redirectUri: string; configured: boolean }

export function googleCalendarEnv(): GoogleCalendarEnv {
    const clientId = String(process.env.GOOGLE_CALENDAR_CLIENT_ID || '').trim();
    const clientSecret = String(process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '').trim();
    const redirectUri = String(process.env.GOOGLE_CALENDAR_REDIRECT_URI || '').trim();
    return { clientId, clientSecret, redirectUri, configured: !!(clientId && clientSecret && redirectUri) };
}

export function buildGoogleAuthUrl(state: string): string {
    const env = googleCalendarEnv();
    const params = new URLSearchParams({
        client_id: env.clientId,
        redirect_uri: env.redirectUri,
        response_type: 'code',
        scope: GOOGLE_CALENDAR_SCOPES,
        access_type: 'offline',   // request a refresh_token
        prompt: 'consent',        // re-issue the refresh_token even on a repeat connect
        include_granted_scopes: 'true',
        state,
    });
    return `${AUTH_URL}?${params.toString()}`;
}

export interface GoogleTokens { access_token: string; refresh_token?: string; expires_in: number; scope: string; token_type: string; id_token?: string }

async function tokenRequest(body: Record<string, string>): Promise<GoogleTokens> {
    const env = googleCalendarEnv();
    const r = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: env.clientId, client_secret: env.clientSecret, ...body }).toString(),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || j.error || `Google token request failed (${r.status})`);
    return j;
}

export const exchangeCodeForTokens = (code: string) => {
    const env = googleCalendarEnv();
    return tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: env.redirectUri });
};
export const refreshAccessToken = (refreshToken: string) => tokenRequest({ refresh_token: refreshToken, grant_type: 'refresh_token' });

/** Decode the `email` claim out of an OpenID `id_token` — no signature verification needed here:
 *  the token just arrived directly from Google's own token endpoint over TLS, not from the user. */
export function emailFromIdToken(idToken?: string): string {
    if (!idToken) return '';
    try {
        const payload = JSON.parse(Buffer.from(idToken.split('.')[1] || '', 'base64').toString('utf8'));
        return String(payload.email || '');
    } catch { return ''; }
}

export interface GEventInput { title: string; description?: string; location?: string; eventDate: string; endDate?: string; startTime?: string; endTime?: string; timeZone: string }

const toGoogleEvent = (e: GEventInput) => {
    const allDay = !e.startTime;
    return {
        summary: e.title,
        description: e.description || undefined,
        location: e.location || undefined,
        start: allDay ? { date: e.eventDate } : { dateTime: `${e.eventDate}T${e.startTime}:00`, timeZone: e.timeZone },
        end: allDay
            ? { date: e.endDate || e.eventDate }
            : { dateTime: `${e.eventDate}T${e.endTime || e.startTime}:00`, timeZone: e.timeZone },
    };
};

async function calApi(accessToken: string, method: string, path: string, body?: any) {
    const r = await fetch(`${CAL_BASE}${path}`, {
        method,
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 204) return null;
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) {
        const err: any = new Error(j.error?.message || `Google Calendar API error (${r.status})`);
        err.status = r.status;
        throw err;
    }
    return j;
}

export const createGoogleEvent = (accessToken: string, calendarId: string, e: GEventInput) =>
    calApi(accessToken, 'POST', `/calendars/${encodeURIComponent(calendarId)}/events`, toGoogleEvent(e));
export const updateGoogleEvent = (accessToken: string, calendarId: string, googleEventId: string, e: GEventInput) =>
    calApi(accessToken, 'PUT', `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`, toGoogleEvent(e));
export const deleteGoogleEvent = (accessToken: string, calendarId: string, googleEventId: string) =>
    calApi(accessToken, 'DELETE', `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`).catch((e: any) => {
        if (e.status === 404 || e.status === 410) return null;   // already gone on Google's side — not a failure
        throw e;
    });

/** The user's own Google events in a date range — shown merged into ShuleCloud's calendar,
 *  read-only (editing them belongs in Google Calendar, not ShuleCloud). */
export async function listGoogleEvents(accessToken: string, calendarId: string, timeMin: string, timeMax: string) {
    const params = new URLSearchParams({ timeMin: new Date(timeMin).toISOString(), timeMax: new Date(timeMax).toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250' });
    const j = await calApi(accessToken, 'GET', `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`);
    return Array.isArray(j?.items) ? j.items : [];
}
