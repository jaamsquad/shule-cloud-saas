// ── RBAC permission catalog ─────────────────────────────────────────────────
// Permission codes are grouped for the role editor. "*" is a wildcard that
// grants everything (used by Super Admin / Principal).

import { PAGE_PERMISSIONS } from "@/components/navItems";

export interface Perm { code: string; name: string }
export interface PermGroup { group: string; perms: Perm[] }

// Capabilities: finer rights used inside an app (record payments, enter marks…).
// Every capability belongs to exactly ONE app and only opens that app's modules
// (the server's CODE_TO_MODULES in backend/src/lib/permissions.ts must agree —
// checked by frontend/scripts/check-permissions.ts).
export interface Capability extends Perm { app: string }
export const CAPABILITIES: Capability[] = [
    // Fees
    { app: "fees", code: "finance.view", name: "View fees" },
    { app: "fees", code: "finance.payments", name: "Record payments / receipts" },
    { app: "fees", code: "finance.invoices", name: "Manage invoices & fee structures" },
    { app: "fees", code: "finance.wallet", name: "Manage wallets" },
    { app: "fees", code: "finance.discounts", name: "Discounts & scholarships" },
    { app: "fees", code: "finance.reports", name: "Fee reports" },
    // Accounting
    { app: "accounting", code: "accounting.income", name: "Income" },
    { app: "accounting", code: "accounting.expenses", name: "Expenses" },
    { app: "accounting", code: "accounting.budget", name: "Budgeting" },
    { app: "accounting", code: "accounting.ledger", name: "General ledger" },
    { app: "accounting", code: "accounting.journals", name: "Journal entries" },
    { app: "accounting", code: "accounting.statements", name: "Financial statements" },
    { app: "accounting", code: "expenses.view", name: "View expense requests" },
    { app: "accounting", code: "expenses.manage", name: "Manage expense requests" },
    { app: "accounting", code: "expenses.approve", name: "Approve expenses" },
    { app: "accounting", code: "procurement.view", name: "View procurement" },
    { app: "accounting", code: "procurement.manage", name: "Manage procurement" },
    { app: "accounting", code: "procurement.approve", name: "Approve purchases" },
    // Payroll
    { app: "payroll", code: "accounting.payroll", name: "Run payroll" },
    // Academics
    { app: "academics", code: "classes.view", name: "Classes" },
    { app: "academics", code: "subjects.view", name: "Subjects" },
    { app: "academics", code: "timetable.view", name: "Timetable" },
    { app: "academics", code: "academics.view", name: "Academic content" },
    { app: "academics", code: "content.manage", name: "Lesson plans, schemes & resources" },
    // Exams
    { app: "exams", code: "exams.manage", name: "Manage exams" },
    { app: "exams", code: "results.entry", name: "Marks entry" },
    { app: "exams", code: "results.view", name: "View results" },
    // CBC
    { app: "cbc", code: "cbc.view", name: "View CBC assessment" },
    { app: "cbc", code: "cbc.assess", name: "Assess learners" },
    { app: "cbc", code: "cbc.manage", name: "Manage strands & rubrics" },
    // Attendance & discipline
    { app: "attendance", code: "attendance.mark", name: "Mark attendance" },
    { app: "attendance", code: "attendance.view", name: "View attendance" },
    // Students
    { app: "students", code: "students.view", name: "View learners" },
    { app: "students", code: "students.manage", name: "Manage learners" },
    { app: "students", code: "admissions.manage", name: "Admissions" },
    { app: "students", code: "health.manage", name: "Medical records" },
    // Human resources
    { app: "hr", code: "staff.view", name: "View staff" },
    { app: "hr", code: "hr.manage", name: "Manage HR" },
    { app: "hr", code: "departments.manage", name: "Manage departments" },
    { app: "hr", code: "audit.view", name: "Audit log" },
    // Student life
    { app: "library", code: "library.manage", name: "Run the library" },
    { app: "transport", code: "transport.manage", name: "Run transport" },
    { app: "boarding", code: "boarding.manage", name: "Run boarding" },
    { app: "boarding", code: "cafeteria.serve", name: "Serve meals (kitchen)" },
    { app: "boarding", code: "cafeteria.menu", name: "Weekly menu" },
    { app: "boarding", code: "cafeteria.history", name: "Meal history" },
    { app: "boarding", code: "canteen.sell", name: "Canteen quick sale" },
    { app: "boarding", code: "canteen.transactions", name: "Canteen transactions" },
    { app: "boarding", code: "canteen.settings", name: "Canteen settings" },
    { app: "activities", code: "sports.view", name: "View sports" },
    { app: "activities", code: "sports.manage", name: "Manage sports & enrolments" },
    { app: "activities", code: "sports.attendance", name: "Sports attendance" },
    { app: "activities", code: "sports.performance", name: "Performance & awards" },
    { app: "activities", code: "trips.view", name: "View trips" },
    { app: "activities", code: "trips.manage", name: "Manage trips & participants" },
    { app: "activities", code: "trips.attendance", name: "Trip attendance" },
    // Front office
    { app: "frontdesk", code: "frontdesk.view", name: "View front desk" },
    { app: "frontdesk", code: "frontdesk.visitors", name: "Visitors" },
    { app: "frontdesk", code: "frontdesk.signout", name: "Learner sign-out" },
    { app: "frontdesk", code: "frontdesk.appointments", name: "Appointments" },
    { app: "frontdesk", code: "secretary.view", name: "Secretary office" },
    { app: "frontdesk", code: "secretary.records", name: "Learner records (secretary)" },
    { app: "frontdesk", code: "secretary.meetings", name: "Meetings (secretary)" },
    { app: "communication", code: "communications.send", name: "Send messages" },
    // Back office
    { app: "reports", code: "reports.view", name: "View reports" },
    { app: "administration", code: "settings.manage", name: "School settings" },
    { app: "administration", code: "roles.manage", name: "Roles & permissions" },
];

// Kept for older screens: capabilities grouped by app name.
const MODULE_PERMISSION_GROUPS: PermGroup[] = Array.from(new Set(CAPABILITIES.map(c => c.app))).map(app => ({
    group: app.charAt(0).toUpperCase() + app.slice(1),
    perms: CAPABILITIES.filter(c => c.app === app).map(({ code, name }) => ({ code, name })),
}));

// Fine-grained per-page permission groups, auto-generated from the sidebar so
// every page in every group is individually grantable. Labelled "<Group> — Pages".
const PAGE_PERMISSION_GROUPS: PermGroup[] = PAGE_PERMISSIONS.map((g) => ({
    group: `${g.group} — Pages`,
    perms: g.perms,
}));

// The full catalog shown in the Roles editor = module-level + per-page groups.
export const PERMISSION_GROUPS: PermGroup[] = [...MODULE_PERMISSION_GROUPS, ...PAGE_PERMISSION_GROUPS];

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
    // Cafeteria / store
    "Kitchen": ["cafeteria.serve", "cafeteria.menu", "cafeteria.history"],
    "Kitchen Staff": ["cafeteria.serve", "cafeteria.history"],
    "Cook": ["cafeteria.serve", "cafeteria.history"],
    "Catering Supervisor": ["cafeteria.serve", "cafeteria.menu", "cafeteria.history", "canteen.transactions"],
    "Canteen Manager": ["canteen.sell", "canteen.transactions", "canteen.settings", "cafeteria.history"],
    "Canteen Cashier": ["canteen.sell", "canteen.transactions"],
    "Canteen Attendant": ["canteen.sell"],
    "Storekeeper": ["canteen.transactions"],
    "Store Manager": ["canteen.transactions", "canteen.settings"],
    "Inventory Officer": ["canteen.transactions"],
    // Sports / Trips / Front Desk / Secretary
    "Sports Coordinator": ["sports.view", "sports.manage", "sports.attendance", "sports.performance", "trips.view", "trips.manage", "trips.attendance"],
    "Sports Coach": ["sports.view", "sports.attendance", "sports.performance"],
    "Trips Coordinator": ["trips.view", "trips.manage", "trips.attendance"],
    "Receptionist": ["frontdesk.view", "frontdesk.visitors", "frontdesk.signout", "frontdesk.appointments"],
    "Front Desk Officer": ["frontdesk.view", "frontdesk.visitors", "frontdesk.signout", "frontdesk.appointments"],
    "Secretary": ["secretary.view", "secretary.records", "secretary.meetings", "students.view", "communications.send"],
};

export const MIS_ROLE_GROUPS: { group: string; roles: string[] }[] = [
    { group: "Administration", roles: ["Super Admin", "School Admin", "Principal", "Deputy Principal"] },
    { group: "Academic", roles: ["Academic Director", "HOD", "Teacher", "Class Teacher", "Exam Officer"] },
    { group: "Finance", roles: ["Finance Manager", "Accountant", "Bursar", "Cashier"] },
    { group: "HR", roles: ["HR Manager", "HR Officer"] },
    { group: "Admissions", roles: ["Registrar", "Admissions Officer"] },
    { group: "Operations", roles: ["Librarian", "Transport Officer", "Driver", "Boarding Master", "Boarding Mistress", "School Nurse", "ICT Administrator"] },
    { group: "Sports & Trips", roles: ["Sports Coordinator", "Sports Coach", "Trips Coordinator"] },
    { group: "Front Office", roles: ["Receptionist", "Front Desk Officer", "Secretary"] },
];

export const MIS_ROLES = MIS_ROLE_GROUPS.flatMap(g => g.roles);

/** True if the permission set grants `code` (or holds the "*" wildcard). */
export const can = (perms: string[] | undefined, code: string) => !!perms && (perms.includes("*") || perms.includes(code));
