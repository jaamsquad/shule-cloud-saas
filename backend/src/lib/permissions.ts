import { Db } from 'mongodb';

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
};

/**
 * Resolve a staff member's effective permissions: the union of permissions from
 * each of their roles (the primary `designation` plus any `roles[]`). A role's
 * permissions come from the `roles` collection if configured, else the defaults.
 */
export async function resolveStaffPermissions(db: Db, staff: any): Promise<string[]> {
    const roleNames: string[] = Array.from(new Set([
        ...(Array.isArray(staff?.roles) ? staff.roles : []),
        ...(staff?.designation ? [staff.designation] : []),
    ].filter(Boolean)));

    let configured: Record<string, string[]> = {};
    try {
        const docs = await db.collection('roles').find({ name: { $in: roleNames } }).toArray();
        docs.forEach((r: any) => { if (Array.isArray(r.permissions)) configured[r.name] = r.permissions; });
    } catch { /* ignore */ }

    const set = new Set<string>();
    for (const name of roleNames) {
        const perms = configured[name] || DEFAULT_ROLE_PERMISSIONS[name] || [];
        perms.forEach(p => set.add(p));
    }

    // Direct per-staff permissions (manual assignment) add on top of role permissions.
    if (Array.isArray(staff?.permissions)) staff.permissions.forEach((p: string) => set.add(p));
    if (set.has('*')) return ['*'];

    // Teaching staff always get the full teacher toolkit (every original staff-portal
    // tab). Extra roles add their modules on top (multi-role). Legacy staff with no
    // recognised role also fall back to the teacher view so the portal is never empty.
    const looksTeacher = /teacher/i.test(String(staff?.designation || ''))
        || roleNames.some(r => /teacher/i.test(r))
        || staff?.isTeachingStaff === true
        || (Array.isArray(staff?.subjectAssignments) && staff.subjectAssignments.length > 0)
        || (Array.isArray(staff?.specializedSubjects) && staff.specializedSubjects.length > 0);
    if (looksTeacher || set.size === 0) {
        DEFAULT_ROLE_PERMISSIONS['Teacher'].forEach(p => set.add(p));
    }

    return Array.from(set);
}
