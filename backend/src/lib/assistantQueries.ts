/**
 * Smart Assistant — reusable query engine.
 *
 * Every assistant "button" maps to ONE named query function here. The buttons API
 * and any future natural-language AI both dispatch through `runQuery(id, ctx)`, so
 * the AI reuses this exact engine instead of writing new queries — as the spec
 * requires. Each query returns a normalized SmartCard the UI renders identically.
 *
 * Queries are deterministic, read-only, and tenant/branch-scoped: they run against
 * the request's tenant DB (one branch = one database), and honour the caller's
 * data-access scope (students/staff) so branch users only see branch data.
 */
import { Db } from 'mongodb';
import type { Request } from 'express';
import { resolveScope, mergeFilter, ScopeResult } from './dataScope';

// ── Shared response shape ─────────────────────────────────────────────────────
export interface QuickAction { label: string; icon?: string; action: string; params?: any; }
export interface ChartSpec { type: 'bar' | 'pie' | 'line'; title?: string; data: Array<{ label: string; value: number }>; }
export interface SmartCard {
    id: string;
    title: string;
    summary: string;                 // one-line conversational answer
    stat?: { value: string | number; label?: string };
    breakdown?: Array<{ label: string; value: number | string }>;
    chart?: ChartSpec | null;
    actions?: QuickAction[];
    meta?: Record<string, any>;
}

export interface QueryFilters {
    branch?: string; classId?: string; className?: string; department?: string;
    academicYear?: string; term?: string; date?: string; gender?: string; boarding?: string;
}
export interface QueryContext { db: Db; req: Request; scope: ScopeResult; filters: QueryFilters; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const NORM = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const todayStr = (d = new Date()) => d.toISOString().slice(0, 10);
const num = (v: any) => Number(v) || 0;
// A student's class label from any of the common fields.
const classOf = (s: any) => s.studentClass || s.className || s.currentClass || s.class || s.levelName || '';
const isPresent = (a: any) => /present|in|here/i.test(String(a.status || ''));
const isAbsent = (a: any) => /absent|away/i.test(String(a.status || ''));
const isLate = (a: any) => /late/i.test(String(a.status || ''));

// Apply UI filters (class/gender/boarding) to a students array.
function filterStudents(students: any[], f: QueryFilters): any[] {
    return students.filter(s => {
        if (f.className && !NORM(classOf(s)).includes(NORM(f.className))) return false;
        if (f.gender && NORM(s.gender || s.sex) !== NORM(f.gender)) return false;
        if (f.boarding) {
            const b = NORM(s.boardingStatus || s.residence || s.category);
            if (f.boarding === 'Boarding' && !/board/.test(b)) return false;
            if (f.boarding === 'Day' && !/day/.test(b)) return false;
        }
        return true;
    });
}

// Standard quick-action sets, reused across cards.
const studentListActions = (params: any = {}): QuickAction[] => [
    { label: 'View List', icon: 'eye', action: 'viewStudents', params },
    { label: 'Export', icon: 'download', action: 'export', params },
    { label: 'Send SMS to Parents', icon: 'message', action: 'sendSms', params },
    { label: 'Print Report', icon: 'printer', action: 'print', params },
];

// ── The query registry ────────────────────────────────────────────────────────
type QueryFn = (ctx: QueryContext) => Promise<SmartCard>;

const registry: Record<string, { category: string; label: string; run: QueryFn }> = {};
const def = (id: string, category: string, label: string, run: QueryFn) => { registry[id] = { category, label, run }; };

// ─── STUDENTS ──────────────────────────────────────────────────────────────────
def('students.enrolled', 'Students', 'How many students are enrolled?', async ({ db, scope, filters }) => {
    const all = await db.collection('students').find(scope.isAdmin ? {} : scope.studentFilter).toArray().catch(() => []);
    const students = filterStudents(all, filters);
    // Gender split for a quick pie.
    const g: Record<string, number> = {};
    students.forEach(s => { const k = NORM(s.gender || s.sex) || 'unknown'; g[k] = (g[k] || 0) + 1; });
    return {
        id: 'students.enrolled', title: 'Enrolled Students',
        summary: `There are ${students.length} students enrolled${filters.className ? ` in ${filters.className}` : ''}.`,
        stat: { value: students.length, label: 'Total students' },
        chart: { type: 'pie', title: 'By gender', data: Object.entries(g).map(([label, value]) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), value })) },
        actions: studentListActions(),
    };
});

// Match a stored attendance `date` against a YYYY-MM-DD string, tolerating the
// field being a string ("2026-07-02", maybe with a time) or a Date object.
const recDateStr = (r: any): string => {
    const d = r.date ?? r.attendanceDate ?? r.day;
    if (!d) return '';
    if (d instanceof Date) return todayStr(d);
    const s = String(d);
    return s.length >= 10 ? s.slice(0, 10) : s;
};

async function attendanceToday(db: Db, scope: ScopeResult, filters: QueryFilters) {
    const wanted = filters.date || todayStr();
    const all = await db.collection('students').find(scope.isAdmin ? {} : scope.studentFilter).toArray().catch(() => []);
    const students = filterStudents(all, filters);
    const idSet = new Set(students.map(s => String(s._id)));

    // Pull this student-set's attendance once, then bucket by date (robust to string
    // vs Date and to a time component on the date field).
    const allRecs = await db.collection('student_attendance').find({}).toArray().catch(() => []);
    const relevant = allRecs.filter((r: any) => idSet.has(String(r.studentId)));
    let date = wanted;
    let mine = relevant.filter((r: any) => recDateStr(r) === wanted);
    let stale = false;
    // If nothing was marked for the requested day, fall back to the most recent day
    // that actually has attendance — so the card shows real numbers, clearly dated.
    if (mine.length === 0 && relevant.length > 0) {
        const dates = Array.from(new Set(relevant.map(recDateStr).filter(Boolean))).sort();
        const latest = dates[dates.length - 1];
        if (latest) { date = latest; mine = relevant.filter((r: any) => recDateStr(r) === latest); stale = latest !== wanted; }
    }

    const present = mine.filter(isPresent), absent = mine.filter(isAbsent), late = mine.filter(isLate);
    const sById: Record<string, any> = {}; students.forEach(s => { sById[String(s._id)] = s; });
    const byClass: Record<string, number> = {};
    absent.forEach((a: any) => { const c = classOf(sById[String(a.studentId)] || {}) || 'Unknown'; byClass[c] = (byClass[c] || 0) + 1; });
    const rate = mine.length ? (present.length / mine.length) * 100 : 0;
    return { date, stale, total: students.length, marked: mine.length, present, absent, late, byClass, rate, sById };
}

def('students.present', 'Students', 'How many students are present today?', async ({ db, scope, filters }) => {
    const a = await attendanceToday(db, scope, filters);
    const when = a.marked === 0 ? 'No attendance has been marked yet.' : a.stale ? `Latest attendance is from ${a.date}.` : '';
    return {
        id: 'students.present', title: 'Present Today',
        summary: a.marked === 0 ? 'No attendance has been marked yet — nothing to report.' : `${a.present.length} students are present (${a.rate.toFixed(1)}% attendance).${a.stale ? ` ${when}` : ''}`,
        stat: { value: a.present.length, label: `of ${a.marked} marked` },
        chart: { type: 'pie', title: 'Attendance', data: [{ label: 'Present', value: a.present.length }, { label: 'Absent', value: a.absent.length }, { label: 'Late', value: a.late.length }] },
        actions: [{ label: 'Mark Attendance', icon: 'check', action: 'markAttendance' }, ...studentListActions()],
    };
});

def('students.absent', 'Students', 'How many students are absent today?', async ({ db, scope, filters }) => {
    const a = await attendanceToday(db, scope, filters);
    const top = Object.entries(a.byClass).sort((x, y) => y[1] - x[1]);
    return {
        id: 'students.absent', title: 'Absent Today',
        summary: a.marked === 0 ? 'No attendance has been marked yet — nothing to report.' : `${a.absent.length} students are absent${a.stale ? ` (as of ${a.date})` : ' today'}.`,
        stat: { value: `${a.rate.toFixed(1)}%`, label: 'Attendance rate' },
        breakdown: top.map(([label, value]) => ({ label, value })),
        chart: { type: 'bar', title: 'Absentees by class', data: top.map(([label, value]) => ({ label, value })) },
        meta: { mostAffected: top[0]?.[0] || null },
        actions: studentListActions({ status: 'absent', date: a.date }),
    };
});

def('students.absentList', 'Students', 'Which students are absent today?', async ({ db, scope, filters }) => {
    const a = await attendanceToday(db, scope, filters);
    const names = a.absent.map((x: any) => { const s = a.sById[String(x.studentId)] || {}; return { label: s.studentName || s.name || 'Student', value: classOf(s) || '' }; });
    return {
        id: 'students.absentList', title: 'Absent Students',
        summary: `${names.length} students are absent today.`,
        stat: { value: names.length, label: 'Absent' },
        breakdown: names.slice(0, 50),
        actions: studentListActions({ status: 'absent', date: a.date }),
    };
});

def('students.highestAbsenteeism', 'Students', 'Which class has the highest absenteeism?', async ({ db, scope, filters }) => {
    const a = await attendanceToday(db, scope, filters);
    const top = Object.entries(a.byClass).sort((x, y) => y[1] - x[1]);
    return {
        id: 'students.highestAbsenteeism', title: 'Highest Absenteeism',
        summary: top.length ? `${top[0][0]} has the highest absenteeism today with ${top[0][1]} absent.` : 'No absences recorded today.',
        stat: { value: top[0]?.[1] ?? 0, label: top[0]?.[0] || '—' },
        chart: { type: 'bar', title: 'Absentees by class', data: top.map(([label, value]) => ({ label, value })) },
        actions: studentListActions(),
    };
});

def('students.admittedThisMonth', 'Students', 'Students admitted this month.', async ({ db, scope, filters }) => {
    const all = await db.collection('students').find(scope.isAdmin ? {} : scope.studentFilter).toArray().catch(() => []);
    const now = new Date(); const y = now.getFullYear(), m = now.getMonth();
    const inMonth = filterStudents(all, filters).filter(s => {
        const d = new Date(s.admissionDate || s.createdAt || s.dateAdmitted || 0);
        return d.getFullYear() === y && d.getMonth() === m;
    });
    return {
        id: 'students.admittedThisMonth', title: 'Admitted This Month',
        summary: `${inMonth.length} students were admitted this month.`,
        stat: { value: inMonth.length, label: now.toLocaleString('en', { month: 'long' }) },
        breakdown: inMonth.slice(0, 30).map(s => ({ label: s.studentName || s.name || 'Student', value: classOf(s) })),
        actions: studentListActions(),
    };
});

def('students.birthdays', 'Students', 'Students with birthdays today.', async ({ db, scope, filters }) => {
    const all = await db.collection('students').find(scope.isAdmin ? {} : scope.studentFilter).toArray().catch(() => []);
    const now = new Date(); const md = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const bdays = filterStudents(all, filters).filter(s => { const d = new Date(s.dob || s.dateOfBirth || 0); return !isNaN(d.getTime()) && `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === md; });
    return {
        id: 'students.birthdays', title: 'Birthdays Today',
        summary: bdays.length ? `${bdays.length} student(s) have a birthday today!` : 'No student birthdays today.',
        stat: { value: bdays.length, label: 'Birthdays' },
        breakdown: bdays.map(s => ({ label: s.studentName || s.name || 'Student', value: classOf(s) })),
        actions: [{ label: 'Send Wishes SMS', icon: 'message', action: 'sendSms', params: { template: 'birthday' } }],
    };
});

def('students.disciplinary', 'Students', 'Students with disciplinary cases.', async ({ db }) => {
    const cases = await db.collection('student_discipline').find({}).toArray().catch(() => []);
    const byStudent = new Set(cases.map((c: any) => String(c.studentId)));
    return {
        id: 'students.disciplinary', title: 'Disciplinary Cases',
        summary: `${byStudent.size} students have disciplinary case(s) on record (${cases.length} total cases).`,
        stat: { value: byStudent.size, label: 'Students' },
        actions: [{ label: 'View Cases', icon: 'eye', action: 'viewDiscipline' }, { label: 'Export', icon: 'download', action: 'export' }],
    };
});

def('students.noPhotos', 'Students', 'Students without photos.', async ({ db, scope, filters }) => {
    const all = await db.collection('students').find(scope.isAdmin ? {} : scope.studentFilter).toArray().catch(() => []);
    const missing = filterStudents(all, filters).filter(s => !s.photo && !s.avatar && !s.image);
    return {
        id: 'students.noPhotos', title: 'Students Without Photos',
        summary: `${missing.length} students have no photo on file.`,
        stat: { value: missing.length, label: 'Missing photos' },
        breakdown: missing.slice(0, 30).map(s => ({ label: s.studentName || s.name || 'Student', value: classOf(s) })),
        actions: studentListActions(),
    };
});

def('students.noParents', 'Students', 'Students without parents assigned.', async ({ db, scope, filters }) => {
    const all = await db.collection('students').find(scope.isAdmin ? {} : scope.studentFilter).toArray().catch(() => []);
    const parents = await db.collection('parents').find({}).toArray().catch(() => []);
    const linked = new Set<string>();
    parents.forEach((p: any) => (p.linkedStudents || []).forEach((l: any) => linked.add(String(l.studentId))));
    const missing = filterStudents(all, filters).filter(s => !linked.has(String(s._id)) && !s.parentPhone && !s.guardianPhone);
    return {
        id: 'students.noParents', title: 'Students Without Parents',
        summary: `${missing.length} students have no parent/guardian assigned.`,
        stat: { value: missing.length, label: 'Unlinked' },
        breakdown: missing.slice(0, 30).map(s => ({ label: s.studentName || s.name || 'Student', value: classOf(s) })),
        actions: studentListActions(),
    };
});

def('students.pendingAdmission', 'Students', 'Students pending admission approval.', async ({ db }) => {
    const pending = await db.collection('admissions').find({ status: { $in: ['Pending', 'pending', 'Awaiting Approval'] } }).toArray().catch(() => []);
    return {
        id: 'students.pendingAdmission', title: 'Pending Admissions',
        summary: `${pending.length} admission(s) are pending approval.`,
        stat: { value: pending.length, label: 'Pending' },
        actions: [{ label: 'Review Admissions', icon: 'eye', action: 'viewAdmissions' }],
    };
});

// ─── ATTENDANCE ──────────────────────────────────────────────────────────────
def('attendance.today', 'Attendance', 'Attendance today', async ({ db, scope, filters }) => {
    const a = await attendanceToday(db, scope, filters);
    return {
        id: 'attendance.today', title: 'Attendance Today',
        summary: `${a.present.length} present, ${a.absent.length} absent, ${a.late.length} late (${a.rate.toFixed(1)}%).`,
        stat: { value: `${a.rate.toFixed(1)}%`, label: 'Attendance rate' },
        chart: { type: 'pie', title: 'Today', data: [{ label: 'Present', value: a.present.length }, { label: 'Absent', value: a.absent.length }, { label: 'Late', value: a.late.length }] },
        actions: [{ label: 'Mark Attendance', icon: 'check', action: 'markAttendance' }],
    };
});

async function attendanceRange(db: Db, scope: ScopeResult, filters: QueryFilters, days: number) {
    const all = await db.collection('students').find(scope.isAdmin ? {} : scope.studentFilter).toArray().catch(() => []);
    const idSet = new Set(filterStudents(all, filters).map(s => String(s._id)));
    const series: Array<{ label: string; value: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); const ds = todayStr(d);
        const recs = (await db.collection('student_attendance').find({ date: ds }).toArray().catch(() => []))
            .filter((r: any) => idSet.has(String(r.studentId)));
        const present = recs.filter(isPresent).length;
        series.push({ label: ds.slice(5), value: recs.length ? Math.round((present / recs.length) * 100) : 0 });
    }
    return series;
}

def('attendance.week', 'Attendance', 'Attendance this week', async ({ db, scope, filters }) => {
    const series = await attendanceRange(db, scope, filters, 7);
    const avg = series.length ? Math.round(series.reduce((a, b) => a + b.value, 0) / series.length) : 0;
    return { id: 'attendance.week', title: 'Attendance This Week', summary: `Average attendance this week: ${avg}%.`, stat: { value: `${avg}%`, label: '7-day average' }, chart: { type: 'line', title: 'Daily %', data: series } };
});

def('attendance.month', 'Attendance', 'Attendance this month', async ({ db, scope, filters }) => {
    const series = await attendanceRange(db, scope, filters, 30);
    const avg = series.length ? Math.round(series.reduce((a, b) => a + b.value, 0) / series.length) : 0;
    return { id: 'attendance.month', title: 'Attendance This Month', summary: `Average attendance this month: ${avg}%.`, stat: { value: `${avg}%`, label: '30-day average' }, chart: { type: 'line', title: 'Daily %', data: series } };
});

def('attendance.lateToday', 'Attendance', 'Late arrivals today', async ({ db, scope, filters }) => {
    const a = await attendanceToday(db, scope, filters);
    return { id: 'attendance.lateToday', title: 'Late Arrivals', summary: `${a.late.length} student(s) arrived late today.`, stat: { value: a.late.length, label: 'Late today' }, actions: studentListActions({ status: 'late' }) };
});

def('attendance.topClass', 'Attendance', 'Top attendance class', async ({ db, scope, filters }) => {
    const card = await classAttendanceRanking(db, scope, filters);
    return { ...card, id: 'attendance.topClass', title: 'Top Attendance Class', summary: card.meta?.top ? `${card.meta.top.label} has the best attendance at ${card.meta.top.value}%.` : 'No attendance data today.' };
});
def('attendance.lowestClass', 'Attendance', 'Lowest attendance class', async ({ db, scope, filters }) => {
    const card = await classAttendanceRanking(db, scope, filters);
    return { ...card, id: 'attendance.lowestClass', title: 'Lowest Attendance Class', summary: card.meta?.bottom ? `${card.meta.bottom.label} has the lowest attendance at ${card.meta.bottom.value}%.` : 'No attendance data today.' };
});

async function classAttendanceRanking(db: Db, scope: ScopeResult, filters: QueryFilters): Promise<SmartCard> {
    const date = filters.date || todayStr();
    const all = await db.collection('students').find(scope.isAdmin ? {} : scope.studentFilter).toArray().catch(() => []);
    const students = filterStudents(all, filters);
    const sById: Record<string, any> = {}; students.forEach(s => { sById[String(s._id)] = s; });
    const recs = (await db.collection('student_attendance').find({ date }).toArray().catch(() => [])).filter((r: any) => sById[String(r.studentId)]);
    const byClass: Record<string, { present: number; total: number }> = {};
    recs.forEach((r: any) => { const c = classOf(sById[String(r.studentId)]) || 'Unknown'; (byClass[c] ||= { present: 0, total: 0 }); byClass[c].total++; if (isPresent(r)) byClass[c].present++; });
    const rows = Object.entries(byClass).map(([label, v]) => ({ label, value: v.total ? Math.round((v.present / v.total) * 100) : 0 })).sort((a, b) => b.value - a.value);
    return { id: 'attendance.ranking', title: 'Class Attendance', summary: '', chart: { type: 'bar', title: 'Attendance % by class', data: rows }, meta: { top: rows[0] || null, bottom: rows[rows.length - 1] || null } };
}

// ─── FEES & FINANCE ──────────────────────────────────────────────────────────
/**
 * Matches an invoice against a requested term string ("Term 2", "Term 2 2026"…), whether the
 * invoice stores the term as a plain name/semester string or as an id pointing at `terms`.
 * Returns null if no term was requested (caller then applies no term filter at all).
 */
async function resolveTermFilter(db: Db, term?: string): Promise<((inv: any) => boolean) | null> {
    const want = NORM(term);
    if (!want) return null;
    const terms = await db.collection('terms').find({}).toArray().catch(() => []);
    const matchingIds = new Set(
        terms.filter((t: any) => { const n = NORM(t.name || t.title || t.term); return !!n && (want.includes(n) || n.includes(want)); })
            .map((t: any) => String(t._id)),
    );
    return (inv: any) => {
        const direct = NORM(inv.term || inv.semester || inv.termName);
        if (direct && (want.includes(direct) || direct.includes(want))) return true;
        const idRef = String(inv.semester_id ?? inv.term_id ?? inv.termId ?? '');
        return idRef ? matchingIds.has(idRef) : false;
    };
}

async function feeBalances(db: Db, scope: ScopeResult, filters: QueryFilters = {}) {
    const invoices = await db.collection('invoices').find({}).toArray().catch(() => []);
    // Scope invoices to visible students when not admin.
    let visible = invoices;
    if (!scope.isAdmin) {
        const ids = new Set((await db.collection('students').find(scope.studentFilter, { projection: { _id: 1 } }).toArray().catch(() => [])).map((s: any) => String(s._id)));
        visible = invoices.filter((i: any) => ids.has(String(i.studentId)));
    }
    const termFilter = await resolveTermFilter(db, filters.term);
    if (termFilter) visible = visible.filter(termFilter);
    const balOf = (i: any) => num(i.balance ?? (num(i.total_due ?? i.amount) - num(i.amount_paid ?? i.paid)));
    return { invoices: visible, balOf };
}

def('fees.outstanding', 'Fees', 'Outstanding fee balance.', async ({ db, scope, filters }) => {
    const { invoices, balOf } = await feeBalances(db, scope, filters);
    const total = invoices.reduce((a: number, i: any) => a + Math.max(0, balOf(i)), 0);
    const owing = invoices.filter((i: any) => balOf(i) > 0);
    const period = filters.term ? ` for ${filters.term}` : '';
    return {
        id: 'fees.outstanding', title: `Outstanding Fees${filters.term ? ` — ${filters.term}` : ''}`,
        summary: `Total outstanding fee balance${period} is KES ${total.toLocaleString()} across ${new Set(owing.map((i: any) => String(i.studentId))).size} students.`,
        stat: { value: `KES ${total.toLocaleString()}`, label: 'Outstanding' },
        actions: [{ label: 'View Defaulters', icon: 'eye', action: 'viewDefaulters' }, { label: 'Send Reminders', icon: 'message', action: 'sendSms', params: { template: 'feeReminder' } }, { label: 'Export', icon: 'download', action: 'export' }],
    };
});

def('fees.defaulters', 'Fees', 'Top fee defaulters.', async ({ db, scope, filters }) => {
    const { invoices, balOf } = await feeBalances(db, scope, filters);
    const byStudent: Record<string, { name: string; bal: number }> = {};
    invoices.forEach((i: any) => { const b = balOf(i); if (b > 0) { const k = String(i.studentId); (byStudent[k] ||= { name: i.studentName || 'Student', bal: 0 }); byStudent[k].bal += b; } });
    const top = Object.values(byStudent).sort((a, b) => b.bal - a.bal).slice(0, 15);
    return {
        id: 'fees.defaulters', title: `Top Fee Defaulters${filters.term ? ` — ${filters.term}` : ''}`,
        summary: `${top.length ? top[0].name : 'No one'} tops the defaulters list${filters.term ? ` for ${filters.term}` : ''}.`,
        breakdown: top.map(t => ({ label: t.name, value: `KES ${t.bal.toLocaleString()}` })),
        chart: { type: 'bar', title: 'Top balances', data: top.slice(0, 8).map(t => ({ label: t.name, value: Math.round(t.bal) })) },
        actions: [{ label: 'Send Reminders', icon: 'message', action: 'sendSms', params: { template: 'feeReminder' } }, { label: 'Export', icon: 'download', action: 'export' }],
    };
});

async function collections(db: Db, since: Date) {
    const tx = await db.collection('transactions').find({}).toArray().catch(() => []);
    const amt = (t: any) => num(t.amount ?? t.amount_paid ?? t.total);
    const inRange = tx.filter((t: any) => { const d = new Date(t.date || t.createdAt || t.paidAt || 0); return d >= since && /pay|collect|credit|income/i.test(String(t.type || 'payment')); });
    return inRange.reduce((a: number, t: any) => a + amt(t), 0);
}
def('fees.today', 'Fees', "Today's collections.", async ({ db }) => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const total = await collections(db, start);
    return { id: 'fees.today', title: "Today's Collections", summary: `KES ${total.toLocaleString()} collected today.`, stat: { value: `KES ${total.toLocaleString()}`, label: 'Today' }, actions: [{ label: 'View Payments', icon: 'eye', action: 'viewPayments' }] };
});
def('fees.month', 'Fees', "Collections this month.", async ({ db }) => {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    const total = await collections(db, start);
    return { id: 'fees.month', title: 'Collections This Month', summary: `KES ${total.toLocaleString()} collected this month.`, stat: { value: `KES ${total.toLocaleString()}`, label: 'This month' } };
});
def('fees.unallocatedMpesa', 'Fees', 'Unallocated M-PESA payments.', async ({ db }) => {
    const rows = await db.collection('mpesa_c2b_payments').find({ $or: [{ allocated: { $ne: true } }, { studentId: { $in: [null, ''] } }] }).toArray().catch(() => []);
    const total = rows.reduce((a: number, r: any) => a + num(r.amount ?? r.TransAmount), 0);
    return { id: 'fees.unallocatedMpesa', title: 'Unallocated M-PESA', summary: `${rows.length} M-PESA payment(s) totalling KES ${total.toLocaleString()} are unallocated.`, stat: { value: rows.length, label: 'Unallocated' }, actions: [{ label: 'Allocate', icon: 'eye', action: 'allocateMpesa' }] };
});
def('finance.expensesToday', 'Fees', "Today's expenses.", async ({ db }) => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const rows = (await db.collection('expenses').find({}).toArray().catch(() => [])).filter((e: any) => new Date(e.date || e.createdAt || 0) >= start);
    const total = rows.reduce((a: number, e: any) => a + num(e.amount), 0);
    return { id: 'finance.expensesToday', title: "Today's Expenses", summary: `KES ${total.toLocaleString()} spent today across ${rows.length} expense(s).`, stat: { value: `KES ${total.toLocaleString()}`, label: 'Today' } };
});

// ─── LIBRARY ─────────────────────────────────────────────────────────────────
def('library.overdue', 'Library', 'Books overdue today.', async ({ db }) => {
    const issues = await db.collection('library_issues').find({ $or: [{ returned: { $ne: true } }, { returnDate: { $in: [null, ''] } }] }).toArray().catch(() => []);
    const now = new Date();
    const overdue = issues.filter((i: any) => i.dueDate && new Date(i.dueDate) < now && !i.returnDate && !i.returned);
    return { id: 'library.overdue', title: 'Overdue Books', summary: `${overdue.length} book(s) are overdue.`, stat: { value: overdue.length, label: 'Overdue' }, actions: [{ label: 'View List', icon: 'eye', action: 'viewOverdue' }, { label: 'Notify Borrowers', icon: 'message', action: 'sendSms' }] };
});
def('library.borrowed', 'Library', 'Books currently borrowed.', async ({ db }) => {
    const issues = await db.collection('library_issues').find({ $or: [{ returned: { $ne: true } }, { returnDate: { $in: [null, ''] } }] }).toArray().catch(() => []);
    return { id: 'library.borrowed', title: 'Books Borrowed', summary: `${issues.length} book(s) are currently on loan.`, stat: { value: issues.length, label: 'On loan' } };
});
def('library.mostBorrowed', 'Library', 'Most borrowed books.', async ({ db }) => {
    const issues = await db.collection('library_issues').find({}).toArray().catch(() => []);
    const byBook: Record<string, number> = {};
    issues.forEach((i: any) => { const t = i.bookTitle || i.title || i.bookId || 'Book'; byBook[t] = (byBook[t] || 0) + 1; });
    const top = Object.entries(byBook).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { id: 'library.mostBorrowed', title: 'Most Borrowed Books', summary: top.length ? `"${top[0][0]}" is the most borrowed book.` : 'No loans recorded.', chart: { type: 'bar', title: 'Loans', data: top.map(([label, value]) => ({ label, value })) } };
});

// ─── STAFF ───────────────────────────────────────────────────────────────────
def('staff.total', 'Staff', 'Total staff.', async ({ db, scope }) => {
    const staff = await db.collection('staff').find(scope.isAdmin ? {} : scope.staffFilter).toArray().catch(() => []);
    const byDesig: Record<string, number> = {};
    staff.forEach((s: any) => { const k = s.designation || 'Staff'; byDesig[k] = (byDesig[k] || 0) + 1; });
    return { id: 'staff.total', title: 'Total Staff', summary: `There are ${staff.length} staff members.`, stat: { value: staff.length, label: 'Staff' }, chart: { type: 'bar', title: 'By role', data: Object.entries(byDesig).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value })) } };
});
def('staff.birthdays', 'Staff', 'Staff birthdays.', async ({ db, scope }) => {
    const staff = await db.collection('staff').find(scope.isAdmin ? {} : scope.staffFilter).toArray().catch(() => []);
    const now = new Date(); const md = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const bdays = staff.filter((s: any) => { const d = new Date(s.dob || s.dateOfBirth || 0); return !isNaN(d.getTime()) && `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === md; });
    return { id: 'staff.birthdays', title: 'Staff Birthdays', summary: bdays.length ? `${bdays.length} staff have a birthday today.` : 'No staff birthdays today.', stat: { value: bdays.length, label: 'Birthdays' }, breakdown: bdays.map((s: any) => ({ label: s.employeeName || s.name || 'Staff', value: s.designation || '' })) };
});

// ─── ACADEMICS ───────────────────────────────────────────────────────────────
def('academics.above80', 'Academics', 'Students scoring above 80%.', async ({ db }) => {
    const marks = await db.collection('exam_marks').find({}).toArray().catch(() => []);
    const byStudent: Record<string, { sum: number; n: number }> = {};
    marks.forEach((m: any) => { const mx = num(m.totalMarks) || 100; const pct = mx ? (num(m.marksObtained) / mx) * 100 : 0; const k = String(m.studentId); (byStudent[k] ||= { sum: 0, n: 0 }); byStudent[k].sum += pct; byStudent[k].n++; });
    const above = Object.values(byStudent).filter(v => v.n && v.sum / v.n >= 80).length;
    return { id: 'academics.above80', title: 'Students Above 80%', summary: `${above} students have a mean score of 80% or higher.`, stat: { value: above, label: '≥ 80%' }, actions: [{ label: 'View List', icon: 'eye', action: 'viewStudents' }] };
});
def('academics.failing', 'Academics', 'Students failing.', async ({ db }) => {
    const marks = await db.collection('exam_marks').find({}).toArray().catch(() => []);
    const byStudent: Record<string, { sum: number; n: number }> = {};
    marks.forEach((m: any) => { const mx = num(m.totalMarks) || 100; const pct = mx ? (num(m.marksObtained) / mx) * 100 : 0; const k = String(m.studentId); (byStudent[k] ||= { sum: 0, n: 0 }); byStudent[k].sum += pct; byStudent[k].n++; });
    const failing = Object.values(byStudent).filter(v => v.n && v.sum / v.n < 40).length;
    return { id: 'academics.failing', title: 'Students Failing', summary: `${failing} students have a mean score below 40%.`, stat: { value: failing, label: '< 40%' }, actions: [{ label: 'View List', icon: 'eye', action: 'viewStudents' }, { label: 'Notify Parents', icon: 'message', action: 'sendSms' }] };
});

// ─── Registry API ──────────────────────────────────────────────────────────────
export function listCategories(): Array<{ category: string; queries: Array<{ id: string; label: string }> }> {
    const byCat: Record<string, Array<{ id: string; label: string }>> = {};
    for (const [id, q] of Object.entries(registry)) { (byCat[q.category] ||= []).push({ id, label: q.label }); }
    return Object.entries(byCat).map(([category, queries]) => ({ category, queries }));
}

export function hasQuery(id: string): boolean { return !!registry[id]; }

export async function runQuery(id: string, req: Request, filters: QueryFilters): Promise<SmartCard> {
    const entry = registry[id];
    const db: Db = (req as any).tenantDb;
    const scope = await resolveScope(req, db);
    if (!entry) {
        return { id, title: 'Coming Soon', summary: 'This insight is defined but not yet wired to live data.', actions: [] };
    }
    return entry.run({ db, req, scope, filters });
}

// Merge helper re-exported for callers that build compound filters.
export { mergeFilter };
