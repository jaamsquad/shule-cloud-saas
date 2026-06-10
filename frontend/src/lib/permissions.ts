// ── RBAC permission catalog ─────────────────────────────────────────────────
// Permission codes are grouped for the role editor. "*" is a wildcard that
// grants everything (used by Super Admin / Principal).

export interface Perm { code: string; name: string }
export interface PermGroup { group: string; perms: Perm[] }

export const PERMISSION_GROUPS: PermGroup[] = [
    { group: "Finance", perms: [
        { code: "finance.view", name: "View Finance" },
        { code: "finance.payments", name: "Record Payments / Receipts" },
        { code: "finance.invoices", name: "Manage Invoices & Fee Structures" },
        { code: "finance.wallet", name: "Manage Wallets" },
        { code: "finance.discounts", name: "Discounts & Scholarships" },
        { code: "finance.reports", name: "Finance & Revenue Reports" },
    ]},
    { group: "Accounting", perms: [
        { code: "accounting.income", name: "Income" },
        { code: "accounting.expenses", name: "Expenses" },
        { code: "accounting.payroll", name: "Payroll" },
        { code: "accounting.budget", name: "Budgeting" },
    ]},
    { group: "Academics", perms: [
        { code: "academics.view", name: "View Classes & Timetable" },
        { code: "exams.manage", name: "Manage Exams" },
        { code: "results.entry", name: "Marks Entry" },
        { code: "results.view", name: "View Results" },
        { code: "content.manage", name: "Lesson Plans / Schemes / Resources" },
    ]},
    { group: "Attendance", perms: [
        { code: "attendance.mark", name: "Mark Attendance" },
        { code: "attendance.view", name: "View Attendance" },
    ]},
    { group: "Students & Admissions", perms: [
        { code: "students.view", name: "View Students" },
        { code: "students.manage", name: "Manage Students" },
        { code: "admissions.manage", name: "Admissions" },
    ]},
    { group: "Staff & HR", perms: [
        { code: "staff.view", name: "View Staff" },
        { code: "hr.manage", name: "Manage HR" },
        { code: "departments.manage", name: "Manage Departments" },
    ]},
    { group: "Operations", perms: [
        { code: "library.manage", name: "Library" },
        { code: "transport.manage", name: "Transport" },
        { code: "boarding.manage", name: "Boarding" },
        { code: "health.manage", name: "Health / Clinic" },
    ]},
    { group: "Communication & Reports", perms: [
        { code: "communications.send", name: "Send Communications" },
        { code: "reports.view", name: "View Reports" },
        { code: "audit.view", name: "Audit Logs" },
    ]},
    { group: "Administration", perms: [
        { code: "settings.manage", name: "School Settings" },
        { code: "roles.manage", name: "Manage Roles & Permissions" },
    ]},
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.perms.map(p => p.code));
export const permName = (code: string) => PERMISSION_GROUPS.flatMap(g => g.perms).find(p => p.code === code)?.name || code;

// MIS roles (grouped) and their default permissions. Editable later via the
// Role Management screen.
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
    "Super Admin": ["*"],
    "School Admin": ["*"],
    "Principal": ["*"],
    "Deputy Principal": ["academics.view", "results.view", "attendance.view", "students.view", "staff.view", "reports.view", "communications.send"],
    "Academic Director": ["academics.view", "exams.manage", "results.entry", "results.view", "content.manage", "attendance.view", "departments.manage", "reports.view"],
    "HOD": ["academics.view", "results.entry", "results.view", "content.manage", "attendance.view", "departments.manage"],
    "Teacher": ["academics.view", "content.manage", "results.entry", "results.view", "attendance.mark", "communications.send"],
    "Class Teacher": ["academics.view", "content.manage", "results.entry", "results.view", "attendance.mark", "attendance.view", "communications.send"],
    "Exam Officer": ["academics.view", "exams.manage", "results.entry", "results.view", "reports.view"],
    "Finance Manager": ["finance.view", "finance.payments", "finance.invoices", "finance.wallet", "finance.discounts", "finance.reports", "accounting.income", "accounting.expenses", "accounting.budget", "reports.view"],
    "Accountant": ["finance.view", "finance.payments", "finance.invoices", "finance.reports", "accounting.income", "accounting.expenses", "reports.view"],
    "Bursar": ["finance.view", "finance.payments", "finance.invoices", "finance.wallet", "finance.reports", "reports.view"],
    "Cashier": ["finance.view", "finance.payments", "finance.wallet"],
    "HR Manager": ["staff.view", "hr.manage", "accounting.payroll"],
    "HR Officer": ["staff.view", "hr.manage"],
    "Registrar": ["students.view", "students.manage", "admissions.manage", "reports.view"],
    "Admissions Officer": ["students.view", "admissions.manage"],
    "Librarian": ["library.manage"],
    "Transport Officer": ["transport.manage"],
    "Driver": ["transport.manage"],
    "Boarding Master": ["boarding.manage", "attendance.view"],
    "Boarding Mistress": ["boarding.manage", "attendance.view"],
    "School Nurse": ["health.manage"],
    "ICT Administrator": ["settings.manage", "roles.manage", "communications.send"],
};

export const MIS_ROLE_GROUPS: { group: string; roles: string[] }[] = [
    { group: "Administration", roles: ["Super Admin", "School Admin", "Principal", "Deputy Principal"] },
    { group: "Academic", roles: ["Academic Director", "HOD", "Teacher", "Class Teacher", "Exam Officer"] },
    { group: "Finance", roles: ["Finance Manager", "Accountant", "Bursar", "Cashier"] },
    { group: "HR", roles: ["HR Manager", "HR Officer"] },
    { group: "Admissions", roles: ["Registrar", "Admissions Officer"] },
    { group: "Operations", roles: ["Librarian", "Transport Officer", "Driver", "Boarding Master", "Boarding Mistress", "School Nurse", "ICT Administrator"] },
];

export const MIS_ROLES = MIS_ROLE_GROUPS.flatMap(g => g.roles);

/** True if the permission set grants `code` (or holds the "*" wildcard). */
export const can = (perms: string[] | undefined, code: string) => !!perms && (perms.includes("*") || perms.includes(code));
