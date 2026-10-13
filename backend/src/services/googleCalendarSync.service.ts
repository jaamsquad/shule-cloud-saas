/**
 * Keeps a connected admin's Google Calendar in sync with ShuleCloud school events.
 *
 * One connection per (school, admin user) — `google_calendar_connections`, in the tenant's own
 * DB (same isolation as mpesa_settings). Dedupe is by storing the Google event id Google hands
 * back on the ShuleCloud event document (`googleEventId`): a second sync call updates that exact
 * event instead of creating a new one, so re-running a sync never duplicates anything.
 *
 * Every function here is best-effort: a Google failure (expired token, network error, API down)
 * is caught and reported back as `{ synced: false, error }` — it never throws out of a calendar
 * CRUD request, so Google being unavailable never blocks ShuleCloud's own calendar from working.
 */
import { Db, ObjectId } from 'mongodb';
import { refreshAccessToken, createGoogleEvent, updateGoogleEvent, deleteGoogleEvent, emailFromIdToken, GEventInput } from '../lib/googleCalendar';

export interface GoogleConnection {
    _id?: ObjectId;
    userId: string;
    email: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    calendarId: string;     // 'primary' — syncing to a user-chosen secondary calendar is a possible future extension
    scope: string;
    connectedAt: Date;
    updatedAt: Date;
    lastError?: string | null;
}

const COLLECTION = 'google_calendar_connections';

export const getConnection = (db: Db, userId: string): Promise<GoogleConnection | null> =>
    db.collection(COLLECTION).findOne({ userId }) as any;

export async function saveConnection(db: Db, userId: string, tokens: { access_token: string; refresh_token?: string; expires_in: number; scope: string; id_token?: string }) {
    const now = new Date();
    const set: any = {
        userId, accessToken: tokens.access_token, scope: tokens.scope,
        expiresAt: new Date(now.getTime() + tokens.expires_in * 1000),
        calendarId: 'primary', updatedAt: now, lastError: null,
    };
    const email = emailFromIdToken(tokens.id_token);
    if (email) set.email = email;
    // Google only returns a refresh_token on the FIRST consent (or when prompt=consent forces
    // re-issue, which we always pass) — keep the existing one if this response somehow omits it.
    const update: any = { $set: set, $setOnInsert: { connectedAt: now } };
    if (tokens.refresh_token) set.refreshToken = tokens.refresh_token;
    await db.collection(COLLECTION).updateOne({ userId }, update, { upsert: true });
    return getConnection(db, userId);
}

export const disconnect = (db: Db, userId: string) => db.collection(COLLECTION).deleteOne({ userId });

/** A usable access token, refreshing and persisting it first if it's expired or about to. */
async function freshAccessToken(db: Db, conn: GoogleConnection): Promise<string> {
    if (conn.expiresAt.getTime() - Date.now() > 2 * 60_000) return conn.accessToken;
    const tokens = await refreshAccessToken(conn.refreshToken);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await db.collection(COLLECTION).updateOne({ userId: conn.userId }, { $set: { accessToken: tokens.access_token, expiresAt, updatedAt: new Date(), lastError: null } });
    return tokens.access_token;
}

const TIMEZONE = 'Africa/Nairobi';

/** Push a ShuleCloud event to Google — creates it on the first sync, updates it on every one after. */
export async function syncEventToGoogle(db: Db, userId: string, event: { _id: any; title: string; description?: string; venue?: string; location?: string; eventDate: string; endDate?: string; startTime?: string; endTime?: string; googleEventId?: string }): Promise<{ synced: boolean; googleEventId?: string; error?: string }> {
    const conn = await getConnection(db, userId);
    if (!conn) return { synced: false, error: 'not_connected' };
    try {
        const token = await freshAccessToken(db, conn);
        const input: GEventInput = {
            title: event.title, description: event.description, location: event.location || event.venue,
            eventDate: event.eventDate, endDate: event.endDate, startTime: event.startTime, endTime: event.endTime, timeZone: TIMEZONE,
        };
        const result = event.googleEventId
            ? await updateGoogleEvent(token, conn.calendarId, event.googleEventId, input)
            : await createGoogleEvent(token, conn.calendarId, input);
        const googleEventId = result?.id || event.googleEventId;
        if (googleEventId) await db.collection('calendar_events').updateOne({ _id: event._id }, { $set: { googleEventId, googleSyncedAt: new Date() } });
        return { synced: true, googleEventId };
    } catch (e: any) {
        await db.collection(COLLECTION).updateOne({ userId }, { $set: { lastError: e.message, updatedAt: new Date() } }).catch(() => {});
        return { synced: false, error: e.message || 'Google Calendar sync failed' };
    }
}

export async function deleteEventFromGoogle(db: Db, userId: string, googleEventId?: string): Promise<{ synced: boolean; error?: string }> {
    if (!googleEventId) return { synced: true };
    const conn = await getConnection(db, userId);
    if (!conn) return { synced: false, error: 'not_connected' };
    try {
        const token = await freshAccessToken(db, conn);
        await deleteGoogleEvent(token, conn.calendarId, googleEventId);
        return { synced: true };
    } catch (e: any) {
        await db.collection(COLLECTION).updateOne({ userId }, { $set: { lastError: e.message, updatedAt: new Date() } }).catch(() => {});
        return { synced: false, error: e.message || 'Google Calendar delete failed' };
    }
}
