import { Db, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { getMetaDb } from './mongodb';
import type { Request, Response, NextFunction } from 'express';

// Default role → permission map (mirrors the frontend catalog). Used when a role
// has no explicit permissions configured in the `roles` collection yet.
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
    'Super Admin': ['*'], 'School Admin': ['*'], 'Principal': ['*'],
    'Deputy Principal': ['academics.view', 'results.view', 'attendance.view', 'students.view', 'staff.view', 'reports.view', 'communications.send'],
    'Academic Director': ['academics.view', 'exams.manage', 'results.entry', 'results.view', 'content.manage', 'attendance.view', 'departments.manage', 'reports.view'],
    'HOD': ['academics.view', 'results.entry', 'results.view', 'content.manage', 'attendance.view', 'departments.manage'],
    'Teacher': ['academics.view', 'content.manage', 'results.entry', 'results.view', 'attendance.mark', 'communications.send'],
    'Class Teacher': ['academics.view', 'content.manage', 'results.entry', 'results.view', 'attendance.mark', 'attendance.view', 'communications.send'],
    'Exam Officer': ['academics.view', 'exams.manage', 'results.entry', 'results.view', 'reports.view'],
    'Finance Manager': ['finance.view', 'finance.payments', 'finance.invoices', 'finance.wallet', 'finance.discounts', 'finance.reports', 'accounting.income', 'accounting.expenses', 'accounting.budget', 'reports.view'],
    'Accountant': ['finance.view', 'finance.payments', 'finance.invoices', 'finance.reports', 'accounting.income', 'accounting.expenses', 'reports.view'],
    'Bursar': ['finance.view', 'finance.payments', 'finance.invoices', 'finance.wallet', 'finance.reports', 'reports.view'],
    'Cashier': ['finance.view', 'finance.payments', 'finance.wallet'],
    'HR Manager': ['staff.view', 'hr.manage', 'accounting.payroll'],
    'HR Officer': ['staff.view', 'hr.manage'],
    'Registrar': ['students.view', 'students.manage', 'admissions.manage', 'reports.view'],
    'Admissions Officer': ['students.view', 'admissions.manage'],
    'Librarian': ['library.manage'],
    'Transport Officer': ['transport.manage'], 'Driver': ['transport.manage'],
    'Boarding Master': ['boarding.manage', 'attendance.view'], 'Boarding Mistress': ['boarding.manage', 'attendance.view'],
    'School Nurse': ['health.manage'],
    'ICT Administrator': ['settings.manage', 'roles.manage', 'communications.send'],
    'Kitchen': ['cafeteria.serve', 'cafeteria.menu', 'cafeteria.history'],
    'Kitchen Staff': ['cafeteria.serve', 'cafeteria.history'],
    'Cook': ['cafeteria.serve', 'cafeteria.history'],
    'Catering Supervisor': ['cafeteria.serve', 'cafeteria.menu', 'cafeteria.history', 'canteen.transactions'],
    'Canteen Manager': ['canteen.sell', 'canteen.transactions', 'canteen.settings', 'cafeteria.history'],
    'Canteen Cashier': ['canteen.sell', 'canteen.transactions'],
    'Canteen Attendant': ['canteen.sell'],
    'Storekeeper': ['canteen.transactions'],
    'Store Manager': ['canteen.transactions', 'canteen.settings'],
    'Inventory Officer': ['canteen.transactions'],
    // Sports / Trips / Front Desk / Secretary
    'Sports Coordinator': ['sports.view', 'sports.manage', 'sports.attendance', 'sports.performance', 'trips.view', 'trips.manage', 'trips.attendance'],
    'Sports Coach': ['sports.view', 'sports.attendance', 'sports.performance'],
    'Trips Coordinator': ['trips.view', 'trips.manage', 'trips.attendance'],
    'Receptionist': ['frontdesk.view', 'frontdesk.visitors', 'frontdesk.signout', 'frontdesk.appointments'],
    'Front Desk Officer': ['frontdesk.view', 'frontdesk.visitors', 'frontdesk.signout', 'frontdesk.appointments'],
    'Secretary': ['secretary.view', 'secretary.records', 'secretary.meetings', 'students.view', 'communications.send'],
};

/**
 * Resolve a staff member's effective permissions: the union of permissions from
 * each of their roles (the primary `designation` plus any `roles[]`). A role's
 * permissions come from the `roles` collection if configured, else the defaults.
 */
export async function resolveStaffPermissions(
    db: Db,
    staff: any,
    opts: { teacherFallback?: boolean; useRoleDefaults?: boolean } = {},
): Promise<string[]> {
    // teacherFallback: when true (default), teaching staff with no explicit
    // permissions get the full Teacher toolkit so the TEACHING PORTAL is never
    // empty. The ADMIN portal sidebar (my-permissions) passes false so a teacher
    // there sees ONLY what an admin explicitly granted — zero by default.
    // useRoleDefaults: when false, built-in DEFAULT_ROLE_PERMISSIONS are ignored —
    // only roles explicitly configured in the DB + per-staff perms count. The
    // admin portal passes false so a freshly-registered teacher has zero access.
    const teacherFallback = opts.teacherFallback !== false;
    const useRoleDefaults = opts.useRoleDefaults !== false;
    const roleNames: string[] = Array.from(new Set([
        ...(Array.isArray(staff?.roles) ? staff.roles : []),
        ...(staff?.designation ? [staff.designation] : []),
    ].filter(Boolean)));

    // Case/space-insensitive lookup: a role doc named "Records Clerk" matches a
    // derived "records clerk" designation, and key "records_clerk" too.
    const norm = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
    let configuredFlat: string[][] = [];
    try {
        const patterns = roleNames.map(n => new RegExp(`^\\s*${String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[_ ]/g, '[_ ]')}\\s*$`, 'i'));
        const docs = await db.collection('roles').find({ $or: [{ name: { $in: roleNames } }, { name: { $in: patterns } }, { key: { $in: roleNames.map(n => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '_')) } }] }).toArray();
        const wanted = new Set(roleNames.map(norm));
        docs.forEach((r: any) => {
            if (Array.isArray(r.permissions) && (wanted.has(norm(r.name || '')) || wanted.has(norm(r.key || '')))) {
                configuredFlat.push(r.permissions);
            }
        });
    } catch { /* ignore */ }

    const set = new Set<string>();
    if (configuredFlat.length) {
        // At least one configured role doc matched → use only configured perms.
        configuredFlat.forEach(arr => arr.forEach(p => set.add(p)));
    } else if (useRoleDefaults) {
        // No DB role configured → fall back to built-in defaults (if enabled).
        for (const name of roleNames) (DEFAULT_ROLE_PERMISSIONS[name] || []).forEach(p => set.add(p));
    }

    // Direct per-staff permissions (manual assignment) add on top of role permissions.
    if (Array.isArray(staff?.permissions)) staff.permissions.forEach((p: string) => set.add(p));
    if (set.has('*')) return ['*'];

    // Teaching-portal fallback ONLY. Teaching staff with no explicit permissions
    // get the full teacher toolkit so their teaching portal isn't empty. This is
    // intentionally skipped for the admin portal (teacherFallback:false) so a
    // teacher there starts with zero access until granted.
    if (teacherFallback) {
        const looksTeacher = /teacher/i.test(String(staff?.designation || ''))
            || roleNames.some(r => /teacher/i.test(r))
            || staff?.isTeachingStaff === true
            || (Array.isArray(staff?.subjectAssignments) && staff.subjectAssignments.length > 0)
            || (Array.isArray(staff?.specializedSubjects) && staff.specializedSubjects.length > 0);
        if (looksTeacher || set.size === 0) {
            DEFAULT_ROLE_PERMISSIONS['Teacher'].forEach(p => set.add(p));
        }
    }

    return Array.from(set);
}

// ── Permission code → sidebar module key(s) ───────────────────────────────────
// The sidebar (AppSidebar.navItems) filters each group by a `moduleKey`. A staff
// member's granular permission codes (e.g. "finance.payments") must be mapped to
// these module keys so the matching sidebar groups appear. One code can unlock
// several modules. "dashboard" is always granted by the resolver below.
// STRICT mapping: each permission code unlocks ONLY its own module(s). A module
// appears in the sidebar only when a permission that directly governs it is held —
// no broad "view" code reveals unrelated admin sections.
export const CODE_TO_MODULES: Record<string, string[]> = {
    // Finance → Fees only (Accounts has its own accounting.* codes)
    'finance.view': ['fees'],
    'finance.payments': ['fees'],
    'finance.invoices': ['fees'],
    'finance.wallet': ['fees'],
    'finance.discounts': ['fees'],
    'finance.reports': ['fees'],
    // Accounting → Accounts; payroll → Salary
    'accounting.income': ['accounting'],
    'accounting.expenses': ['accounting'],
    'accounting.payroll': ['salary'],
    'accounting.budget': ['accounting'],
    // Expense Management
    'expenses.view': ['expenses'],
    'expenses.manage': ['expenses'],
    'expenses.approve': ['expenses'],
    // CBC Assessment
    'cbc.view': ['cbc'],
    'cbc.assess': ['cbc'],
    'cbc.manage': ['cbc'],
    // Procurement
    'procurement.view': ['procurement'],
    'procurement.manage': ['procurement'],
    'procurement.approve': ['procurement'],
    // Accounting / General Ledger (full GL module)
    'accounting.ledger': ['accounting'],
    'accounting.journals': ['accounting'],
    'accounting.statements': ['accounting'],
    'accounting.manage': ['accounting'],
    // Academics — each section gated by its own code
    'classes.view': ['classes'],
    'subjects.view': ['subjects'],
    'timetable.view': ['timetable'],
    'academics.view': ['academics_content'],
    'exams.manage': ['exams'],
    'results.entry': ['exams'],
    'results.view': ['exams'],
    'content.manage': ['academics_content'],
    // Attendance
    'attendance.mark': ['attendance'],
    'attendance.view': ['attendance'],
    // Students & admissions
    'students.view': ['students'],
    'students.manage': ['students'],
    'admissions.manage': ['students'],
    // Students — page-level grants (each also reveals the Students group)
    'students.all': ['students'],
    'students.wallets': ['students'],
    'students.add': ['students'],
    'students.admissions': ['students'],
    'students.families': ['students'],
    'students.promote': ['students'],
    'students.transfer': ['students'],
    'students.discipline': ['students'],
    'students.medical': ['students'],
    'students.documents': ['students'],
    'students.id_cards': ['students'],
    'students.id_studio': ['students'],
    'students.admission_letter': ['students'],
    'students.manage_login': ['students'],
    'students.parent_login': ['students'],
    // Staff & HR
    'staff.view': ['employees'],
    'hr.manage': ['employees'],
    'departments.manage': ['employees'],
    // Operations
    'library.manage': ['library'],
    'transport.manage': ['transport'],
    'boarding.manage': ['hostel'],
    'health.manage': ['students'],
    // Cafeteria
    'cafeteria.serve': ['cafeteria'],
    'cafeteria.menu': ['cafeteria'],
    'cafeteria.history': ['cafeteria'],
    'canteen.sell': ['cafeteria'],
    'canteen.transactions': ['cafeteria'],
    'canteen.settings': ['cafeteria'],
    // Sports
    'sports.view': ['sports'],
    'sports.manage': ['sports'],
    'sports.attendance': ['sports'],
    'sports.performance': ['sports'],
    // Trips & Excursions
    'trips.view': ['trips'],
    'trips.manage': ['trips'],
    'trips.attendance': ['trips'],
    // Front Desk / Reception
    'frontdesk.view': ['frontdesk'],
    'frontdesk.visitors': ['frontdesk'],
    'frontdesk.signout': ['frontdesk'],
    'frontdesk.appointments': ['frontdesk'],
    // Secretary
    'secretary.view': ['secretary'],
    'secretary.records': ['secretary'],
    'secretary.meetings': ['secretary'],
    // Communication & reports
    'communications.send': ['communications'],
    'reports.view': ['reports'],
    'audit.view': ['employees'],
    // Administration
    'settings.manage': ['settings'],
    'roles.manage': ['settings'],
};

/**
 * Resolve a staff member's effective CRUD matrix: union of crud maps from each of
 * their roles (roles collection) plus the per-staff crud override. Shape:
 *   { moduleKey: ['create','update','delete'] }
 */
export async function resolveStaffCrud(db: Db, staff: any): Promise<Record<string, string[]>> {
    const roleNames: string[] = Array.from(new Set([
        ...(Array.isArray(staff?.roles) ? staff.roles : []),
        ...(staff?.designation ? [staff.designation] : []),
    ].filter(Boolean)));

    const merged: Record<string, Set<string>> = {};
    const add = (map: any) => {
        if (!map || typeof map !== 'object') return;
        for (const [mod, acts] of Object.entries(map)) {
            if (!Array.isArray(acts)) continue;
            merged[mod] = merged[mod] || new Set();
            (acts as string[]).forEach(a => merged[mod].add(a));
        }
    };
    try {
        // Case/space-insensitive name match so "Sports Manager" matches a derived
        // "sports manager" designation.
        const patterns = roleNames.map(n => new RegExp(`^\\s*${String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[_ ]/g, '[_ ]')}\\s*$`, 'i'));
        const docs = await db.collection('roles').find({ $or: [{ name: { $in: roleNames } }, { name: { $in: patterns } }, { key: { $in: roleNames.map(n => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '_')) } }] }).toArray();
        docs.forEach((r: any) => add(r.crud));
    } catch { /* ignore */ }
    add(staff?.crud); // per-staff override extends role crud

    const out: Record<string, string[]> = {};
    for (const [mod, set] of Object.entries(merged)) out[mod] = Array.from(set);
    return out;
}

/**
 * Map a list of permission codes to the set of sidebar module keys to show.
 * "*" → wildcard (everything). "dashboard" is always included.
 */
export function permsToModules(perms: string[] | undefined): string[] {
    if (!perms || perms.length === 0) return ['dashboard'];
    if (perms.includes('*')) return ['*'];
    const modules = new Set<string>(['dashboard']);
    for (const code of perms) {
        // A raw module key passed through directly (forward-compatible).
        if (!code.includes('.')) { modules.add(code); continue; }
        // "app.<key>" grants every module of that app (Roles & Permissions → Apps).
        if (code.startsWith('app.')) { (APP_MODULES[code.slice(4)] || []).forEach(m => modules.add(m)); continue; }
        const mapped = CODE_TO_MODULES[code];
        if (mapped) { mapped.forEach(m => modules.add(m)); continue; }
        // Page-level permission convention "<moduleKey>.<page>" → reveal the
        // module if the prefix is a known sidebar module key.
        const prefix = code.split('.')[0];
        if (KNOWN_MODULE_KEYS.has(prefix)) modules.add(prefix);
    }
    return Array.from(modules);
}

// Apps of the admin web app → the sidebar modules they contain (mirror of frontend lib/apps.ts).
export const APP_MODULES: Record<string, string[]> = {
    academics: ['classes', 'subjects', 'timetable', 'academics_content', 'calendar'],
    exams: ['exams', 'question_paper', 'certificates'],
    cbc: ['cbc'],
    elearning: ['live_class'],
    students: ['students'],
    frontdesk: ['frontdesk', 'secretary'],
    communication: ['communications'],
    attendance: ['attendance', 'behaviour'],
    boarding: ['hostel', 'cafeteria'],
    library: ['library'],
    transport: ['transport'],
    activities: ['sports', 'trips'],
    fees: ['fees'],
    accounting: ['accounting', 'expenses', 'procurement'],
    payroll: ['salary'],
    pos: ['pos'],
    overview: ['dashboard'],
    hr: ['employees'],
    reports: ['reports'],
    administration: ['settings', 'nemis'],
};

/** Apps every school keeps (needed to run and administer the school). */
export const CORE_APPS = ['overview', 'administration'];

/**
 * Apps the platform owner switched off for a school (Tenant.disabledApps) and the
 * modules they hide. Cached briefly: read on every API call by the app gate.
 */
const disabledCache = new Map<string, { at: number; apps: string[] }>();
export async function disabledAppsFor(tenantId?: string | null): Promise<string[]> {
    if (!tenantId) return [];
    const hit = disabledCache.get(tenantId);
    if (hit && Date.now() - hit.at < 30_000) return hit.apps;
    let apps: string[] = [];
    try {
        const t: any = await getMetaDb().collection('Tenant').findOne({ _id: new ObjectId(tenantId) }, { projection: { disabledApps: 1 } });
        apps = (Array.isArray(t?.disabledApps) ? t.disabledApps.map(String) : []).filter((a: string) => APP_MODULES[a] && !CORE_APPS.includes(a));
    } catch { /* treat as none */ }
    disabledCache.set(tenantId, { at: Date.now(), apps });
    return apps;
}
export const forgetDisabledApps = (tenantId: string) => disabledCache.delete(tenantId);
export const modulesOfApps = (apps: string[]) => Array.from(new Set(apps.flatMap(a => APP_MODULES[a] || [])));

// Every sidebar module key — page-perms "<moduleKey>.<page>" map to these.
const KNOWN_MODULE_KEYS = new Set<string>([
    'expenses', 'procurement', 'accounting', 'cbc', 'nemis', 'calendar',
    'dashboard', 'settings', 'classes', 'subjects', 'students', 'employees',
    'accounts', 'fees', 'salary', 'transport', 'attendance', 'cafeteria',
    'sports', 'trips', 'frontdesk', 'secretary', 'reports', 'timetable',
    'academic_system', 'academics_content', 'behaviour', 'certificates',
    'hostel', 'library', 'pos', 'communications', 'live_class', 'question_paper',
    'exams',
]);

// ── Shared CRUD-enforcement middleware ───────────────────────────────────────
// Blocks create/update/delete unless the caller's role/staff CRUD matrix grants
// the action for the module. Admins always pass; reads (GET) are never gated.
// The token is already authenticated upstream by tenancy middleware — here we
// only read its claims (role/staffId) to authorize the action.
const decodeClaims = (req: Request): any => {
    try {
        const auth = (req.headers as any).authorization;
        if (!auth) return {};
        return jwt.decode(String(auth).split(' ')[1]) || {};
    } catch { return {}; }
};

export const enforceCrud = (moduleKey: string, action: 'create' | 'update' | 'delete') =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const claims = decodeClaims(req);
            const role = String(claims.role || '').toLowerCase();
            // Admins bypass all CRUD checks.
            if (!role || role === 'school_admin' || role === 'super_admin') return next();

            const database: Db = (req as any).tenantDb || getMetaDb();
            let staff: any = null;
            const sid = claims.staffId || claims.sub || claims.userId;
            if (sid) { try { staff = await database.collection('staff').findOne({ _id: new ObjectId(sid) }); } catch { /* ignore */ } }
            if (!staff) staff = { designation: role.replace(/_/g, ' ') };

            // A role with full access ("*") may act everywhere, as the role editor promises.
            const codes = await resolveStaffPermissions(database, staff, { teacherFallback: false, useRoleDefaults: false });
            if (codes.includes('*')) return next();
            const crud = await resolveStaffCrud(database, staff);
            const allowed = Array.isArray(crud[moduleKey]) && crud[moduleKey].includes(action);
            if (!allowed) return res.status(403).json({ message: `Not allowed to ${action} in ${moduleKey}` });
            next();
        } catch {
            // Fail closed for writes on unexpected errors.
            res.status(403).json({ message: 'Permission check failed' });
        }
    };
