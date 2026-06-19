/**
 * Menu content + per-option data lookups for the WhatsApp chatbot.
 *
 * All queries run against the SCHOOL's tenant DB (native MongoDB driver) using
 * the same collections the rest of ShuleCloud uses: students, invoices,
 * attendance, student_exam_marks_v2, wallets, homework, announcements, etc.
 */
import { Db } from 'mongodb';

export interface StudentRef { id: string; name: string; admissionNo: string; raw: any }

const fmtKsh = (n: any) => `KSh ${(Number(n) || 0).toLocaleString()}`;
const digits = (p: string) => String(p || '').replace(/\D/g, '');

/** Normalise a Kenyan number to a comparable last-9-digits key. */
const phoneKey = (p: string) => {
    const d = digits(p);
    return d.slice(-9);   // ignore 0 / 254 / +254 prefixes
};

/**
 * Find every student whose parent contact matches this WhatsApp number, within
 * the given school. Matches against the common parent-phone fields.
 */
export async function findStudentsByPhone(db: Db, phoneNumber: string): Promise<StudentRef[]> {
    const key = phoneKey(phoneNumber);
    if (!key) return [];

    const students = await db.collection('students').find({}).toArray().catch(() => []);
    const matched = students.filter((s: any) => {
        const candidates = [s.parentPhone, s.fatherPhone, s.motherPhone, s.phone, s.guardianPhone, s.whatsappNumber]
            .filter(Boolean).map((p: string) => phoneKey(p));
        return candidates.includes(key);
    });

    // Also consult a `parents` collection if present (parent → children link).
    if (matched.length === 0) {
        const parents = await db.collection('parents').find({}).toArray().catch(() => []);
        const parent = parents.find((p: any) =>
            [p.whatsappNumber, p.primaryPhone, p.phone].filter(Boolean).some((x: string) => phoneKey(x) === key));
        if (parent) {
            const ids = Array.isArray(parent.studentIds) ? parent.studentIds.map(String) : [];
            const linked = students.filter((s: any) => ids.includes(String(s._id)));
            return linked.map(toRef);
        }
    }
    return matched.map(toRef);
}

const toRef = (s: any): StudentRef => ({
    id: String(s._id),
    name: s.studentName || s.name || 'Student',
    admissionNo: s.registrationNo || s.admNo || s.admissionNo || '—',
    raw: s,
});

// ── Main menu ──────────────────────────────────────────────────────────────
export function mainMenuText(schoolName = 'ShuleCloud'): string {
    return [
        `Welcome to ${schoolName} School Assistant.`,
        '',
        'Please choose an option.',
        '',
        '1. Fee Balance',
        '2. Fee Statement',
        '3. Attendance',
        '4. Exam Results',
        '5. Homework',
        '6. Timetable',
        '7. Canteen Balance',
        '8. School Announcements',
        '9. Talk to School Office',
        '',
        'Reply with the number only.',
    ].join('\n');
}

export function pickStudentText(students: { name: string; admissionNo: string }[]): string {
    const lines = students.map((s, i) => `${i + 1}. ${s.name} (${s.admissionNo})`);
    return ['Choose student.', '', ...lines, '', 'Reply with the number.'].join('\n');
}

export const INVALID_MSG = 'Invalid option.\nPlease choose one of the available menu numbers.';
const backHint = '\n\nReply 0 to go back to the menu.';

// ── Option handlers — each returns the WhatsApp reply text ───────────────────

export async function optFeeBalance(db: Db, st: StudentRef): Promise<string> {
    const invoices = await db.collection('invoices')
        .find({ $or: [{ studentId: st.id }, { student_id: st.id }, { registrationNo: st.admissionNo }] })
        .sort({ createdAt: -1 }).toArray().catch(() => []);
    const outstanding = invoices.reduce((sum: number, inv: any) => sum + (Number(inv.balance) || 0), 0);
    const nextDue = invoices.map((i: any) => i.due_date || i.dueDate).filter(Boolean).sort()[0];

    return [
        `Student: ${st.name}`,
        `Admission No: ${st.admissionNo}`,
        `Outstanding Balance: ${fmtKsh(outstanding)}`,
        `Next Due Date: ${nextDue ? new Date(nextDue).toLocaleDateString('en-GB') : '—'}`,
        '',
        'Reply',
        '1. Pay Now',
        '2. Back',
    ].join('\n');
}

export async function optFeeStatement(db: Db, st: StudentRef): Promise<string> {
    const invoices = await db.collection('invoices')
        .find({ $or: [{ studentId: st.id }, { registrationNo: st.admissionNo }] })
        .sort({ createdAt: 1 }).limit(10).toArray().catch(() => []);
    if (!invoices.length) return `No fee statement found for ${st.name}.${backHint}`;
    const lines = invoices.map((i: any) =>
        `${(i.invoice_no || 'INV')} · billed ${fmtKsh(i.amount || i.total)} · bal ${fmtKsh(i.balance)}`);
    return [
        `Fee Statement — ${st.name}`,
        ...lines,
        '',
        'A downloadable PDF statement can be sent on request. Reply 9 to ask the office.',
    ].join('\n') + backHint;
}

export async function optAttendance(db: Db, st: StudentRef): Promise<string> {
    const recs = await db.collection('attendance')
        .find({ $or: [{ studentId: st.id }, { student_id: st.id }] }).toArray().catch(() => []);
    const today = new Date().toISOString().slice(0, 10);
    const todays = recs.find((r: any) => String(r.date || '').slice(0, 10) === today);
    const monthPrefix = today.slice(0, 7);
    const monthRecs = recs.filter((r: any) => String(r.date || '').slice(0, 7) === monthPrefix);
    const present = monthRecs.filter((r: any) => /present|late/i.test(String(r.status))).length;
    const pct = monthRecs.length ? Math.round((present / monthRecs.length) * 100) : 0;
    const late = monthRecs.filter((r: any) => /late/i.test(String(r.status))).length;

    return [
        `Attendance — ${st.name}`,
        `Today: ${todays ? todays.status : 'Not marked yet'}`,
        `This month: ${pct}% present (${present}/${monthRecs.length})`,
        `Late arrivals this month: ${late}`,
    ].join('\n') + backHint;
}

export async function optExamResults(db: Db, st: StudentRef): Promise<string> {
    const marks = await db.collection('student_exam_marks_v2')
        .find({ studentId: st.id }).sort({ createdAt: -1 }).toArray().catch(() => []);
    if (!marks.length) return `No exam results published yet for ${st.name}.${backHint}`;

    // Latest exam = most recent examId in the marks.
    const latestExamId = marks[0].examId;
    const latest = marks.filter((m: any) => m.examId === latestExamId);
    const totalObtained = latest.reduce((s: number, m: any) => s + (Number(m.marksObtained) || 0), 0);
    const totalOutOf = latest.reduce((s: number, m: any) => s + (Number(m.totalMarks) || 0), 0);
    const pct = totalOutOf ? (totalObtained / totalOutOf) * 100 : 0;
    const grade = pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C+' : pct >= 40 ? 'C' : pct >= 33 ? 'D' : 'E';
    const subjects = latest.map((m: any) => `• ${m.subjectName}: ${m.marksObtained}/${m.totalMarks} (${m.grade || ''})`);

    return [
        `Latest Results — ${st.name}`,
        `Overall: ${totalObtained}/${totalOutOf} (${pct.toFixed(1)}%) · Grade ${grade}`,
        `Class Position: ${latest[0]?.position || '—'}`,
        '',
        'Subjects:',
        ...subjects,
    ].join('\n') + backHint;
}

export async function optHomework(db: Db, st: StudentRef): Promise<string> {
    const today = new Date().toISOString().slice(0, 10);
    const cls = st.raw.currentClass || st.raw.studentClass || '';
    const hw = await db.collection('homework')
        .find({ $or: [{ className: cls }, { class: cls }, {}] }).sort({ createdAt: -1 }).limit(5).toArray().catch(() => []);
    const todays = hw.filter((h: any) => String(h.date || h.dueDate || '').slice(0, 10) === today);
    const list = (todays.length ? todays : hw).slice(0, 5);
    if (!list.length) return `No homework posted for today.${backHint}`;
    const lines = list.map((h: any) => `• ${h.subject || ''}: ${h.title || h.description || ''}`);
    return [`Homework — ${st.name}`, ...lines].join('\n') + backHint;
}

export async function optTimetable(db: Db, st: StudentRef): Promise<string> {
    const cls = st.raw.currentClass || st.raw.studentClass || '';
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const slots = await db.collection('timetable')
        .find({ $or: [{ className: cls }, { class: cls }] }).toArray().catch(() => []);
    const todays = slots.filter((s: any) => String(s.day || '').toLowerCase() === day.toLowerCase());
    if (!todays.length) return `No timetable found for ${cls || 'this class'} today (${day}).${backHint}`;
    const lines = todays
        .sort((a: any, b: any) => String(a.startTime).localeCompare(String(b.startTime)))
        .map((s: any) => `${s.startTime || ''}-${s.endTime || ''}  ${s.subject || s.subjectName || ''}`);
    return [`Timetable (${day}) — ${cls}`, ...lines].join('\n') + backHint;
}

export async function optCanteenBalance(db: Db, st: StudentRef): Promise<string> {
    const wallet = await db.collection('wallets').findOne({ studentId: st.id }).catch(() => null);
    const balance = wallet?.balance ?? 0;
    const txns = await db.collection('wallet_transactions')
        .find({ studentId: st.id }).sort({ createdAt: -1 }).limit(5).toArray().catch(() => []);
    const recent = txns.length
        ? txns.map((t: any) => `• ${new Date(t.createdAt).toLocaleDateString('en-GB')}: ${t.type === 'debit' ? '-' : '+'}${fmtKsh(t.amount)}`)
        : ['• No recent purchases'];
    return [
        `Canteen Wallet — ${st.name}`,
        `Balance: ${fmtKsh(balance)}`,
        '',
        'Recent purchases:',
        ...recent,
    ].join('\n') + backHint;
}

export async function optAnnouncements(db: Db): Promise<string> {
    const items = await db.collection('announcements')
        .find({}).sort({ createdAt: -1 }).limit(5).toArray().catch(() => []);
    if (!items.length) return `No announcements at the moment.${backHint}`;
    const lines = items.map((a: any) => `• ${a.title || a.subject || 'Notice'}: ${(a.message || a.body || '').slice(0, 120)}`);
    return ['School Announcements', ...lines].join('\n') + backHint;
}

/** Option 9 — forward to the office: drop an admin notification, ack the parent. */
export async function optTalkToOffice(db: Db, st: StudentRef | null, phoneNumber: string): Promise<string> {
    await db.collection('notifications').insertOne({
        type: 'whatsapp_request',
        title: 'WhatsApp: parent requested the office',
        message: `${st ? `${st.name} (${st.admissionNo}) — ` : ''}Parent ${phoneNumber} asked to talk to the school office.`,
        audience: 'Admins', level: 'info', read: false, dismissed: false, createdAt: new Date(),
    }).catch(() => {});
    return 'Your request has been forwarded to the school office. They will get back to you shortly.' + backHint;
}
