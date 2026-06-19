/**
 * Chatbot orchestrator — the state machine that turns an incoming WhatsApp
 * message into a reply.
 *
 *  • Receives (schoolId, fromPhone, text) from the Baileys message handler.
 *  • Resolves the school's tenant DB and the parent's student(s).
 *  • Walks the menu using persisted conversation state (chatState.service).
 *  • Returns the reply text; the caller sends it back over the same session.
 */
import { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { getMetaDb, getTenantDb, subdomainToDbName } from '../../lib/mongodb';
import * as state from './chatState.service';
import * as menu from './menu.service';
import { logEvent } from './logger';

const GREETINGS = new Set(['hi', 'hello', 'menu', 'start', 'hey']);

/** Resolve a school's tenant DB + display name from its id (or 'platform'). */
async function resolveSchool(schoolId: string): Promise<{ db: Db; name: string } | null> {
    if (schoolId === 'platform') return { db: getMetaDb(), name: 'ShuleCloud' };
    try {
        const t = await getMetaDb().collection('Tenant').findOne({ _id: new ObjectId(schoolId) });
        if (!t) return null;
        const dbName = t.databaseName || subdomainToDbName(t.subdomain || schoolId);
        return { db: getTenantDb(dbName), name: t.instituteName || t.name || 'ShuleCloud' };
    } catch { return null; }
}

const num = (s: string): number | null => {
    const t = s.trim();
    return /^\d+$/.test(t) ? Number(t) : null;
};

/**
 * Main entry point. Returns the reply text (or null to stay silent).
 */
export async function handleIncomingMessage(schoolId: string, fromPhone: string, rawText: string): Promise<string | null> {
    const text = String(rawText || '').trim();
    if (!text) return null;

    const school = await resolveSchool(schoolId);
    if (!school) return null;
    const db = school.db;

    // A school can switch the chatbot off in Communication Settings.
    const settings = await db.collection('communication_settings').findOne({}).catch(() => null);
    if (settings?.whatsappChatbotEnabled === false) return null;

    const lower = text.toLowerCase();

    logEvent(schoolId, 'chatbot_message', { from: fromPhone, text: text.slice(0, 80) });

    // ── Greeting / explicit menu request → (re)start the conversation ──────────
    if (GREETINGS.has(lower)) {
        return startConversation(db, schoolId, fromPhone, school.name);
    }

    // ── Load existing state; if none/expired, treat as a fresh greeting ────────
    const session = await state.getSession(db, fromPhone);
    if (!session) {
        return startConversation(db, schoolId, fromPhone, school.name);
    }

    // ── Global: 0 → back to main menu ─────────────────────────────────────────
    if (text === '0') {
        await state.patchSession(db, fromPhone, { currentMenu: 'main', currentStep: null });
        return menu.mainMenuText(school.name);
    }

    // ── Student picker ────────────────────────────────────────────────────────
    if (session.currentMenu === 'pick_student') {
        const choices = session.studentChoices || [];
        const n = num(text);
        if (!n || n < 1 || n > choices.length) return menu.pickStudentText(choices);
        const picked = choices[n - 1];
        await state.patchSession(db, fromPhone, {
            currentMenu: 'main', currentStep: null,
            selectedStudent: { id: picked.id, name: picked.name, admissionNo: picked.admissionNo },
        });
        return menu.mainMenuText(school.name);
    }

    // ── Fee-balance sub-menu (1. Pay Now / 2. Back) ───────────────────────────
    if (session.currentMenu === 'fees') {
        if (text === '1') return 'To pay, reply 9 to ask the office to send you an M-PESA prompt, or pay via the parent portal.\n\nReply 0 to go back to the menu.';
        if (text === '2') { await state.patchSession(db, fromPhone, { currentMenu: 'main' }); return menu.mainMenuText(school.name); }
        return menu.INVALID_MSG;
    }

    // ── Main menu selection ───────────────────────────────────────────────────
    return handleMainSelection(db, schoolId, fromPhone, school.name, session, text);
}

/** Greeting → identify parent's student(s), then show the right next screen. */
async function startConversation(db: Db, schoolId: string, fromPhone: string, schoolName: string): Promise<string> {
    const students = await menu.findStudentsByPhone(db, fromPhone);

    if (students.length === 0) {
        // Unknown number — still create a session so AI/office options work.
        await state.setSession(db, { phoneNumber: fromPhone, tenantId: schoolId, currentMenu: 'main', selectedStudent: null });
        return [
            `Welcome to ${schoolName} School Assistant.`,
            '',
            "We couldn't match your number to a student record. You can still:",
            '9. Talk to School Office',
            '',
            'Reply with the number only.',
        ].join('\n');
    }

    if (students.length === 1) {
        const s = students[0];
        await state.setSession(db, {
            phoneNumber: fromPhone, tenantId: schoolId, currentMenu: 'main',
            selectedStudent: { id: s.id, name: s.name, admissionNo: s.admissionNo },
        });
        return menu.mainMenuText(schoolName);
    }

    // Multiple students → ask which one.
    await state.setSession(db, {
        phoneNumber: fromPhone, tenantId: schoolId, currentMenu: 'pick_student',
        studentChoices: students.map(s => ({ id: s.id, name: s.name, admissionNo: s.admissionNo })),
    });
    return menu.pickStudentText(students);
}

/** Dispatch a numeric main-menu choice to the matching option handler. */
async function handleMainSelection(
    db: Db, schoolId: string, fromPhone: string, schoolName: string,
    session: state.ChatSession, text: string,
): Promise<string> {
    const n = num(text);
    if (n === null) return menu.INVALID_MSG;

    // Resolve the active student (for student-scoped options).
    const sel = session.selectedStudent;
    const studentRef = sel
        ? (await menu.findStudentsByPhone(db, fromPhone)).find(s => s.id === sel.id)
            || { id: sel.id, name: sel.name, admissionNo: sel.admissionNo, raw: {} }
        : null;
    const needStudent = () => studentRef
        ? null
        : 'We could not find your student record for this option. Reply 9 to talk to the office.';

    switch (n) {
        case 1: {
            const guard = needStudent(); if (guard) return guard;
            await state.patchSession(db, fromPhone, { currentMenu: 'fees' });
            return menu.optFeeBalance(db, studentRef!);
        }
        case 2: { const g = needStudent(); if (g) return g; return menu.optFeeStatement(db, studentRef!); }
        case 3: { const g = needStudent(); if (g) return g; return menu.optAttendance(db, studentRef!); }
        case 4: { const g = needStudent(); if (g) return g; return menu.optExamResults(db, studentRef!); }
        case 5: { const g = needStudent(); if (g) return g; return menu.optHomework(db, studentRef!); }
        case 6: { const g = needStudent(); if (g) return g; return menu.optTimetable(db, studentRef!); }
        case 7: { const g = needStudent(); if (g) return g; return menu.optCanteenBalance(db, studentRef!); }
        case 8: return menu.optAnnouncements(db);
        case 9: return menu.optTalkToOffice(db, studentRef, fromPhone);
        default:
            return menu.INVALID_MSG;
    }
}
