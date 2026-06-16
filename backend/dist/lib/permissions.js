"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ROLE_PERMISSIONS = void 0;
exports.resolveStaffPermissions = resolveStaffPermissions;
exports.resolveStaffCrud = resolveStaffCrud;
exports.permsToModules = permsToModules;
// Default role → permission map (mirrors the frontend catalog). Used when a role
// has no explicit permissions configured in the `roles` collection yet.
exports.DEFAULT_ROLE_PERMISSIONS = {
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
async function resolveStaffPermissions(db, staff) {
    const roleNames = Array.from(new Set([
        ...(Array.isArray(staff?.roles) ? staff.roles : []),
        ...(staff?.designation ? [staff.designation] : []),
    ].filter(Boolean)));
    let configured = {};
    try {
        const docs = await db.collection('roles').find({ name: { $in: roleNames } }).toArray();
        docs.forEach((r) => { if (Array.isArray(r.permissions))
            configured[r.name] = r.permissions; });
    }
    catch { /* ignore */ }
    const set = new Set();
    for (const name of roleNames) {
        const perms = configured[name] || exports.DEFAULT_ROLE_PERMISSIONS[name] || [];
        perms.forEach(p => set.add(p));
    }
    // Direct per-staff permissions (manual assignment) add on top of role permissions.
    if (Array.isArray(staff?.permissions))
        staff.permissions.forEach((p) => set.add(p));
    if (set.has('*'))
        return ['*'];
    // Teaching staff always get the full teacher toolkit (every original staff-portal
    // tab). Extra roles add their modules on top (multi-role). Legacy staff with no
    // recognised role also fall back to the teacher view so the portal is never empty.
    const looksTeacher = /teacher/i.test(String(staff?.designation || ''))
        || roleNames.some(r => /teacher/i.test(r))
        || staff?.isTeachingStaff === true
        || (Array.isArray(staff?.subjectAssignments) && staff.subjectAssignments.length > 0)
        || (Array.isArray(staff?.specializedSubjects) && staff.specializedSubjects.length > 0);
    if (looksTeacher || set.size === 0) {
        exports.DEFAULT_ROLE_PERMISSIONS['Teacher'].forEach(p => set.add(p));
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
const CODE_TO_MODULES = {
    // Finance → Fees only (Accounts has its own accounting.* codes)
    'finance.view': ['fees'],
    'finance.payments': ['fees'],
    'finance.invoices': ['fees'],
    'finance.wallet': ['fees'],
    'finance.discounts': ['fees'],
    'finance.reports': ['fees'],
    // Accounting → Accounts; payroll → Salary
    'accounting.income': ['accounts'],
    'accounting.expenses': ['accounts'],
    'accounting.payroll': ['salary'],
    'accounting.budget': ['accounts'],
    // Academics — each section gated by its own code
    'classes.view': ['classes'],
    'subjects.view': ['subjects'],
    'timetable.view': ['timetable'],
    'academics.view': ['academic_system'],
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
    'canteen.sell': ['cafeteria', 'pos'],
    'canteen.transactions': ['cafeteria', 'pos'],
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
    'secretary.records': ['secretary', 'students'],
    'secretary.meetings': ['secretary'],
    // Communication & reports
    'communications.send': ['communications'],
    'reports.view': ['reports'],
    'audit.view': ['reports'],
    // Administration
    'settings.manage': ['settings'],
    'roles.manage': ['settings'],
};
/**
 * Resolve a staff member's effective CRUD matrix: union of crud maps from each of
 * their roles (roles collection) plus the per-staff crud override. Shape:
 *   { moduleKey: ['create','update','delete'] }
 */
async function resolveStaffCrud(db, staff) {
    const roleNames = Array.from(new Set([
        ...(Array.isArray(staff?.roles) ? staff.roles : []),
        ...(staff?.designation ? [staff.designation] : []),
    ].filter(Boolean)));
    const merged = {};
    const add = (map) => {
        if (!map || typeof map !== 'object')
            return;
        for (const [mod, acts] of Object.entries(map)) {
            if (!Array.isArray(acts))
                continue;
            merged[mod] = merged[mod] || new Set();
            acts.forEach(a => merged[mod].add(a));
        }
    };
    try {
        // Case/space-insensitive name match so "Sports Manager" matches a derived
        // "sports manager" designation.
        const patterns = roleNames.map(n => new RegExp(`^\\s*${String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[_ ]/g, '[_ ]')}\\s*$`, 'i'));
        const docs = await db.collection('roles').find({ $or: [{ name: { $in: roleNames } }, { name: { $in: patterns } }, { key: { $in: roleNames.map(n => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '_')) } }] }).toArray();
        docs.forEach((r) => add(r.crud));
    }
    catch { /* ignore */ }
    add(staff?.crud); // per-staff override extends role crud
    const out = {};
    for (const [mod, set] of Object.entries(merged))
        out[mod] = Array.from(set);
    return out;
}
/**
 * Map a list of permission codes to the set of sidebar module keys to show.
 * "*" → wildcard (everything). "dashboard" is always included.
 */
function permsToModules(perms) {
    if (!perms || perms.length === 0)
        return ['dashboard'];
    if (perms.includes('*'))
        return ['*'];
    const modules = new Set(['dashboard']);
    for (const code of perms) {
        // A raw module key passed through directly (forward-compatible).
        if (!code.includes('.'))
            modules.add(code);
        (CODE_TO_MODULES[code] || []).forEach(m => modules.add(m));
    }
    return Array.from(modules);
}
