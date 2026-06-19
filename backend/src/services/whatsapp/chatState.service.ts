/**
 * Conversation state for the WhatsApp chatbot.
 *
 * State lives in the SCHOOL's own tenant DB (collection `whatsapp_chat_sessions`),
 * keyed by phoneNumber — so each school's bot conversations are isolated, the same
 * way every other tenant collection is. Native MongoDB driver (no Mongoose), to
 * match the rest of ShuleCloud's tenant data layer.
 */
import { Db } from 'mongodb';

const COLL = 'whatsapp_chat_sessions';
const SESSION_TTL_MS = 30 * 60 * 1000;   // reset after 30 minutes of inactivity

export type Menu = 'root' | 'main' | 'pick_student' | 'fees' | 'statement' | 'ai';

export interface ChatSession {
    phoneNumber: string;
    tenantId: string;
    currentMenu: Menu;
    currentStep: string | null;
    /** The resolved student the conversation is acting on. */
    selectedStudent: { id: string; name: string; admissionNo: string } | null;
    /** Candidate students when the number maps to several (await a pick). */
    studentChoices?: { id: string; name: string; admissionNo: string }[];
    expiresAt: Date;
    updatedAt: Date;
    createdAt?: Date;
}

const freshExpiry = () => new Date(Date.now() + SESSION_TTL_MS);

/** Load a live (non-expired) session, or null. Expired sessions are wiped. */
export async function getSession(db: Db, phoneNumber: string): Promise<ChatSession | null> {
    const doc = await db.collection<ChatSession>(COLL).findOne({ phoneNumber });
    if (!doc) return null;
    if (new Date(doc.expiresAt).getTime() < Date.now()) {
        await db.collection(COLL).deleteOne({ phoneNumber }).catch(() => {});
        return null;
    }
    return doc;
}

/** Create or replace a session for this number. */
export async function setSession(db: Db, session: Partial<ChatSession> & { phoneNumber: string; tenantId: string }): Promise<ChatSession> {
    const next: ChatSession = {
        phoneNumber: session.phoneNumber,
        tenantId: session.tenantId,
        currentMenu: session.currentMenu || 'main',
        currentStep: session.currentStep ?? null,
        selectedStudent: session.selectedStudent ?? null,
        studentChoices: session.studentChoices,
        expiresAt: freshExpiry(),
        updatedAt: new Date(),
    };
    await db.collection(COLL).updateOne(
        { phoneNumber: next.phoneNumber },
        { $set: next, $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
    );
    return next;
}

/** Patch fields on an existing session and bump its expiry. */
export async function patchSession(db: Db, phoneNumber: string, patch: Partial<ChatSession>): Promise<void> {
    await db.collection(COLL).updateOne(
        { phoneNumber },
        { $set: { ...patch, expiresAt: freshExpiry(), updatedAt: new Date() } },
    );
}

/** Reset (delete) a conversation — used on timeout or "exit". */
export async function clearSession(db: Db, phoneNumber: string): Promise<void> {
    await db.collection(COLL).deleteOne({ phoneNumber }).catch(() => {});
}
