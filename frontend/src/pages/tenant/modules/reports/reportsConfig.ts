import {
  GraduationCap, Users, CalendarCheck, Wallet, Briefcase, Boxes, BookOpen,
  Building2, Bus, HeartPulse, ShieldAlert, MessageSquare, LayoutDashboard,
  Landmark, ScrollText,
} from "lucide-react";

export type Col = { key: string; label: string; type?: "date" | "money" };
export type CollectionCfg = { title: string; collection: string; columns: Col[] };
export type ComputedCfg = { title: string; endpoint: string; examFilter?: boolean; classRequired?: boolean };
export type CustomCfg = { title: string; loader: () => Promise<{ default: React.ComponentType }> };

// ── Collection-backed reports: a tenant collection + columns, rendered by ReportViewer. ──
export const COLLECTION_REPORTS: Record<string, CollectionCfg> = {
  "class-lists": { title: "Class Lists", collection: "students", columns: [{ key: "registrationNo", label: "Reg No" }, { key: "studentName", label: "Name" }, { key: "studentClass", label: "Class" }, { key: "gender", label: "Gender" }, { key: "phone", label: "Contact" }] },
  "birthday-list": { title: "Birthday List", collection: "students", columns: [{ key: "studentName", label: "Name" }, { key: "studentClass", label: "Class" }, { key: "dob", label: "Date of Birth", type: "date" }, { key: "gender", label: "Gender" }] },
  "promotions": { title: "Promotions Report", collection: "student_enrollments", columns: [{ key: "studentName", label: "Student" }, { key: "className", label: "Class" }, { key: "streamName", label: "Stream" }, { key: "academicYear", label: "Year" }, { key: "status", label: "Status" }] },
  "staff-directory": { title: "Staff Directory", collection: "staff", columns: [{ key: "employeeId", label: "ID" }, { key: "name", label: "Name" }, { key: "designation", label: "Role" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }] },
  "staff-by-dept": { title: "Staff by Department", collection: "staff", columns: [{ key: "name", label: "Name" }, { key: "department", label: "Department" }, { key: "designation", label: "Role" }, { key: "phone", label: "Phone" }] },
  "contracts-expiry": { title: "Contracts Expiry", collection: "staff", columns: [{ key: "name", label: "Name" }, { key: "designation", label: "Role" }, { key: "contractEnd", label: "Contract End", type: "date" }] },
  "leave-report": { title: "Leave Report", collection: "leave_requests", columns: [{ key: "staffName", label: "Staff" }, { key: "type", label: "Type" }, { key: "startDate", label: "From", type: "date" }, { key: "endDate", label: "To", type: "date" }, { key: "status", label: "Status" }] },
  "salary-slips": { title: "Salary Summary", collection: "salary_payments", columns: [{ key: "staffName", label: "Staff" }, { key: "month", label: "Month" }, { key: "gross", label: "Gross", type: "money" }, { key: "net", label: "Net", type: "money" }, { key: "status", label: "Status" }] },
  "payroll-summary": { title: "Payroll Summary", collection: "salary_payments", columns: [{ key: "staffName", label: "Staff" }, { key: "month", label: "Month" }, { key: "gross", label: "Gross", type: "money" }, { key: "deductions", label: "Deductions", type: "money" }, { key: "net", label: "Net", type: "money" }] },
  "stock-levels": { title: "Stock Levels", collection: "pos_products", columns: [{ key: "name", label: "Product" }, { key: "sku", label: "SKU" }, { key: "price", label: "Price", type: "money" }, { key: "stock", label: "Stock" }, { key: "categoryName", label: "Category" }] },
  "low-stock": { title: "Low-Stock Alerts", collection: "pos_products", columns: [{ key: "name", label: "Product" }, { key: "sku", label: "SKU" }, { key: "stock", label: "Stock" }] },
  "asset-register": { title: "Asset Register", collection: "assets", columns: [{ key: "name", label: "Asset" }, { key: "category", label: "Category" }, { key: "value", label: "Value", type: "money" }, { key: "location", label: "Location" }] },
  "book-catalog": { title: "Book Catalog", collection: "library_books", columns: [{ key: "title", label: "Title" }, { key: "author", label: "Author" }, { key: "isbn", label: "ISBN" }, { key: "copies", label: "Copies" }] },
  "issued-books": { title: "Issued Books", collection: "library_issues", columns: [{ key: "bookTitle", label: "Book" }, { key: "memberName", label: "Member" }, { key: "issueDate", label: "Issued", type: "date" }, { key: "dueDate", label: "Due", type: "date" }] },
  "overdue-books": { title: "Overdue Books", collection: "library_issues", columns: [{ key: "bookTitle", label: "Book" }, { key: "memberName", label: "Member" }, { key: "dueDate", label: "Due", type: "date" }] },
  "clinic-visits": { title: "Clinic Visits", collection: "student_medical", columns: [{ key: "studentName", label: "Student" }, { key: "condition", label: "Condition" }, { key: "date", label: "Date", type: "date" }, { key: "treatment", label: "Treatment" }] },
  "immunization": { title: "Immunization Report", collection: "student_medical", columns: [{ key: "studentName", label: "Student" }, { key: "vaccine", label: "Vaccine" }, { key: "date", label: "Date", type: "date" }] },
  "medical-records": { title: "Medical Records", collection: "student_medical", columns: [{ key: "studentName", label: "Student" }, { key: "condition", label: "Condition" }, { key: "bloodGroup", label: "Blood Group" }, { key: "date", label: "Date", type: "date" }] },
  "incident-log": { title: "Discipline Incident Log", collection: "student_discipline", columns: [{ key: "studentName", label: "Student" }, { key: "incident", label: "Incident" }, { key: "date", label: "Date", type: "date" }, { key: "action", label: "Action" }] },
  "discipline-records": { title: "Discipline Records", collection: "student_discipline", columns: [{ key: "studentName", label: "Student" }, { key: "incident", label: "Incident" }, { key: "severity", label: "Severity" }, { key: "action", label: "Action" }, { key: "date", label: "Date", type: "date" }] },
  "behaviour-trends": { title: "Behaviour Trends", collection: "student_discipline", columns: [{ key: "studentName", label: "Student" }, { key: "incident", label: "Incident" }, { key: "date", label: "Date", type: "date" }] },
  "sms-logs": { title: "SMS Logs", collection: "sms_logs", columns: [{ key: "to", label: "Recipient" }, { key: "message", label: "Message" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Sent", type: "date" }] },
  "email-logs": { title: "Email Logs", collection: "email_logs", columns: [{ key: "to", label: "Recipient" }, { key: "subject", label: "Subject" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Sent", type: "date" }] },
  "announcements": { title: "Announcements", collection: "announcements", columns: [{ key: "title", label: "Title" }, { key: "audience", label: "Audience" }, { key: "createdAt", label: "Date", type: "date" }] },
  "delivery-report": { title: "Delivery Report", collection: "whatsapp_logs", columns: [{ key: "to", label: "Recipient" }, { key: "message", label: "Message" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Sent", type: "date" }] },
  "outstanding-balances": { title: "Outstanding Balances", collection: "reports/outstanding-balances-rows", columns: [{ key: "studentName", label: "Student" }, { key: "className", label: "Class" }, { key: "invoiceNo", label: "Invoice" }, { key: "balance", label: "Balance", type: "money" }, { key: "status", label: "Status" }] },
  "audit-trail": { title: "Audit Trail", collection: "audit_logs", columns: [{ key: "action", label: "Action" }, { key: "collection", label: "Entity" }, { key: "userId", label: "User" }, { key: "createdAt", label: "When", type: "date" }] },
  "login-history": { title: "Login History", collection: "login_logs", columns: [{ key: "userName", label: "User" }, { key: "role", label: "Role" }, { key: "ip", label: "IP" }, { key: "createdAt", label: "When", type: "date" }] },
  "data-change-log": { title: "Data Change Log", collection: "audit_logs", columns: [{ key: "action", label: "Action" }, { key: "collection", label: "Entity" }, { key: "documentId", label: "Record" }, { key: "userId", label: "User" }, { key: "changedAt", label: "When", type: "date" }] },
  "permission-matrix": { title: "Permission Matrix", collection: "roles", columns: [{ key: "name", label: "Role" }, { key: "description", label: "Description" }] },
  "admissions": { title: "Admissions Report", collection: "admissions", columns: [{ key: "applicationNo", label: "App No" }, { key: "applicantName", label: "Applicant" }, { key: "classApplied", label: "Class" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Date", type: "date" }] },
  "transfers": { title: "Transfers Report", collection: "student_transfers", columns: [{ key: "studentName", label: "Student" }, { key: "fromClass", label: "From" }, { key: "toSchool", label: "To School" }, { key: "reason", label: "Reason" }, { key: "date", label: "Date", type: "date" }] },
  "enrollment": { title: "Enrollment Report", collection: "student_enrollments", columns: [{ key: "studentName", label: "Student" }, { key: "className", label: "Class" }, { key: "streamName", label: "Stream" }, { key: "academicYear", label: "Year" }, { key: "status", label: "Status" }] },
  "daily-attendance": { title: "Daily Attendance Register", collection: "attendance", columns: [{ key: "studentName", label: "Student" }, { key: "studentClass", label: "Class" }, { key: "date", label: "Date", type: "date" }, { key: "status", label: "Status" }] },
  "absentees": { title: "Absentee Report", collection: "attendance", columns: [{ key: "studentName", label: "Student" }, { key: "studentClass", label: "Class" }, { key: "date", label: "Date", type: "date" }, { key: "status", label: "Status" }] },
  "class-wise-attendance": { title: "Class-wise Attendance", collection: "attendance", columns: [{ key: "studentName", label: "Student" }, { key: "studentClass", label: "Class" }, { key: "date", label: "Date", type: "date" }, { key: "status", label: "Status" }] },
  "income-expense": { title: "Income & Expense", collection: "reports/income-expense-rows", columns: [{ key: "date", label: "Date", type: "date" }, { key: "type", label: "Type" }, { key: "category", label: "Category" }, { key: "description", label: "Description" }, { key: "amount", label: "Amount", type: "money" }] },
  "mpesa-recon": { title: "M-PESA Reconciliation", collection: "mpesa_c2b_payments", columns: [{ key: "TransID", label: "Receipt" }, { key: "BillRefNumber", label: "Account" }, { key: "MSISDN", label: "Phone" }, { key: "TransAmount", label: "Amount", type: "money" }, { key: "receivedAt", label: "Received", type: "date" }] },
  "pos-sales": { title: "POS Sales Report", collection: "pos_orders", columns: [{ key: "orderNo", label: "Order" }, { key: "customerName", label: "Customer" }, { key: "total", label: "Total", type: "money" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Date", type: "date" }] },
  "purchase-report": { title: "Purchase Report", collection: "purchases", columns: [{ key: "supplier", label: "Supplier" }, { key: "item", label: "Item" }, { key: "quantity", label: "Qty" }, { key: "cost", label: "Cost", type: "money" }, { key: "date", label: "Date", type: "date" }] },
  "member-activity": { title: "Member Activity", collection: "library_members", columns: [{ key: "name", label: "Member" }, { key: "memberType", label: "Type" }, { key: "booksIssued", label: "Books Issued" }, { key: "joinedAt", label: "Joined", type: "date" }] },
  "hostel-occupancy": { title: "Hostel Occupancy", collection: "hostel_allocations", columns: [{ key: "studentName", label: "Student" }, { key: "hostelName", label: "Hostel" }, { key: "roomName", label: "Room" }, { key: "bedNo", label: "Bed" }] },
  "hostel-allocations": { title: "Hostel Allocations", collection: "hostel_allocations", columns: [{ key: "studentName", label: "Student" }, { key: "hostelName", label: "Hostel" }, { key: "roomName", label: "Room" }, { key: "allocatedAt", label: "Allocated", type: "date" }] },
  "hostel-fees": { title: "Hostel Fees", collection: "hostel_fees", columns: [{ key: "studentName", label: "Student" }, { key: "hostelName", label: "Hostel" }, { key: "amount", label: "Amount", type: "money" }, { key: "status", label: "Status" }] },
  "hostel-attendance": { title: "Hostel Attendance", collection: "hostel_attendance_records", columns: [{ key: "studentName", label: "Student" }, { key: "date", label: "Date", type: "date" }, { key: "status", label: "Status" }] },
  "transport-routes": { title: "Route & Driver Report", collection: "transport_zones", columns: [{ key: "name", label: "Zone / Route" }, { key: "driver", label: "Driver" }, { key: "coDriver", label: "Co-Driver" }, { key: "busNo", label: "Bus" }, { key: "fee", label: "Fee", type: "money" }] },
  "zone-assignments": { title: "Zone Assignments", collection: "students", columns: [{ key: "studentName", label: "Student" }, { key: "studentClass", label: "Class" }, { key: "transportZone", label: "Zone" }] },
  "bus-roster": { title: "Bus Roster", collection: "buses", columns: [{ key: "plateNo", label: "Plate" }, { key: "model", label: "Model" }, { key: "capacity", label: "Capacity" }, { key: "driver", label: "Driver" }] },
};

// ── Server-computed reports: uniform {title, cards?, columns, rows, chart?} from /reports/computed/:endpoint. ──
export const COMPUTED_REPORTS: Record<string, ComputedCfg> = {
  "subject-performance": { title: "Subject Performance", endpoint: "subject-performance", examFilter: true },
  "class-performance": { title: "Class Performance", endpoint: "class-performance", examFilter: true },
  "grade-distribution": { title: "Grade Distribution", endpoint: "grade-distribution", examFilter: true },
  "mark-sheets": { title: "Mark Sheets", endpoint: "mark-sheets", examFilter: true, classRequired: true },
  "cbc-competency": { title: "CBC Competency Report", endpoint: "cbc-competency", examFilter: true },
  "mean-score-trends": { title: "Mean Score Trends", endpoint: "mean-score-trends", examFilter: true },
  "attendance-summary": { title: "Attendance % Summary", endpoint: "attendance-summary" },
  "balance-sheet": { title: "Balance Sheet", endpoint: "balance-sheet" },
  "trial-balance": { title: "Trial Balance", endpoint: "trial-balance" },
  "revenue-overview": { title: "Revenue Overview", endpoint: "revenue-overview" },
  "enrollment-trends": { title: "Enrollment Trends", endpoint: "enrollment-trends" },
  "nemis-export": { title: "NEMIS Export", endpoint: "nemis-export" },
  "knec-registration": { title: "KNEC Registration", endpoint: "knec-registration" },
  "statutory-returns": { title: "Statutory Returns", endpoint: "statutory-returns" },
  "ministry-data": { title: "Ministry Data Submission", endpoint: "ministry-data" },
};

// ── Bespoke report pages, kept as-is but surfaced through the unified /reports/:reportKey route. ──
export const CUSTOM_REPORTS: Record<string, CustomCfg> = {
  "student-progress": { title: "Student Progress Report", loader: () => import("./StudentProgressReport") },
  "students-info": { title: "Students Info Report", loader: () => import("./StudentsInfoReport") },
  "parents-info": { title: "Parents Info Report", loader: () => import("./ParentsInfoReport") },
  "monthly-students-attendance": { title: "Students Monthly Attendance", loader: () => import("./StudentsMonthlyAttendanceReport") },
  "monthly-staff-attendance": { title: "Staff Monthly Attendance", loader: () => import("./StaffMonthlyAttendanceReport") },
  "fee-collection": { title: "Fee Collection Report", loader: () => import("./FeeCollectionReport") },
  "accounts": { title: "Accounts Report", loader: () => import("./AccountsReport") },
  "custom": { title: "Customised Reports", loader: () => import("./CustomisedReports") },
};

export type ReportKind = "collection" | "computed" | "custom" | "link";
export type ReportEntry = { key: string; label: string; kind: ReportKind; linkTo?: string };
export type ReportModule = { key: string; icon: any; color: string; reports: ReportEntry[] };

export const REPORT_MODULES: ReportModule[] = [
  { key: "Academic", icon: GraduationCap, color: "#2563EB", reports: [
    { key: "student-progress", label: "Student Progress Report", kind: "custom" },
    { key: "subject-performance", label: "Subject Performance", kind: "computed" },
    { key: "class-performance", label: "Class Performance", kind: "computed" },
    { key: "grade-distribution", label: "Grade Distribution", kind: "computed" },
    { key: "mark-sheets", label: "Mark Sheets", kind: "computed" },
    { key: "cbc-competency", label: "CBC Competency Report", kind: "computed" },
    { key: "mean-score-trends", label: "Mean Score Trends", kind: "computed" },
  ]},
  { key: "Students", icon: Users, color: "#7C3AED", reports: [
    { key: "students-info", label: "Students Info Report", kind: "custom" },
    { key: "parents-info", label: "Parents Info Report", kind: "custom" },
    { key: "enrollment", label: "Enrollment Report", kind: "collection" },
    { key: "admissions", label: "Admissions Report", kind: "collection" },
    { key: "promotions", label: "Promotions Report", kind: "collection" },
    { key: "transfers", label: "Transfers Report", kind: "collection" },
    { key: "class-lists", label: "Class Lists", kind: "collection" },
    { key: "birthday-list", label: "Birthday List", kind: "collection" },
  ]},
  { key: "Attendance", icon: CalendarCheck, color: "#0EA5E9", reports: [
    { key: "monthly-students-attendance", label: "Students Monthly Attendance", kind: "custom" },
    { key: "monthly-staff-attendance", label: "Staff Monthly Attendance", kind: "custom" },
    { key: "class-wise-attendance", label: "Class-wise Attendance", kind: "collection" },
    { key: "daily-attendance", label: "Daily Attendance Register", kind: "collection" },
    { key: "absentees", label: "Absentee Report", kind: "collection" },
    { key: "attendance-summary", label: "Attendance % Summary", kind: "computed" },
  ]},
  { key: "Finance", icon: Wallet, color: "#10B981", reports: [
    { key: "fee-collection", label: "Fee Collection Report", kind: "custom" },
    { key: "accounts", label: "Accounts Report", kind: "custom" },
    { key: "outstanding-balances", label: "Fees Defaulters", kind: "collection" },
    { key: "accounts", label: "Fees Report", kind: "custom" },
    { key: "income-expense", label: "Income & Expense", kind: "collection" },
    { key: "balance-sheet", label: "Balance Sheet", kind: "computed" },
    { key: "trial-balance", label: "Trial Balance", kind: "computed" },
    { key: "mpesa-recon", label: "M-PESA Reconciliation", kind: "collection" },
    { key: "outstanding-balances", label: "Outstanding Balances", kind: "collection" },
  ]},
  { key: "HR & Payroll", icon: Briefcase, color: "#F59E0B", reports: [
    { key: "staff-directory", label: "Staff Directory", kind: "collection" },
    { key: "payroll-summary", label: "Payroll Summary", kind: "collection" },
    { key: "salary-slips", label: "Salary Slips", kind: "collection" },
    { key: "leave-report", label: "Leave Report", kind: "collection" },
    { key: "contracts-expiry", label: "Contracts Expiry", kind: "collection" },
    { key: "staff-by-dept", label: "Staff by Department", kind: "collection" },
  ]},
  { key: "Inventory & Assets", icon: Boxes, color: "#EC4899", reports: [
    { key: "pos-sales", label: "POS Sales Report", kind: "collection" },
    { key: "stock-levels", label: "Stock Levels", kind: "collection" },
    { key: "asset-register", label: "Asset Register", kind: "collection" },
    { key: "low-stock", label: "Low-Stock Alerts", kind: "collection" },
    { key: "purchase-report", label: "Purchase Report", kind: "collection" },
  ]},
  { key: "Library", icon: BookOpen, color: "#8B5CF6", reports: [
    { key: "book-catalog", label: "Book Catalog", kind: "collection" },
    { key: "issued-books", label: "Issued Books", kind: "collection" },
    { key: "overdue-books", label: "Overdue Books", kind: "collection" },
    { key: "member-activity", label: "Member Activity", kind: "collection" },
  ]},
  { key: "Hostel", icon: Building2, color: "#14B8A6", reports: [
    { key: "hostel-occupancy", label: "Occupancy Report", kind: "collection" },
    { key: "hostel-allocations", label: "Allocations", kind: "collection" },
    { key: "hostel-fees", label: "Hostel Fees", kind: "collection" },
    { key: "hostel-attendance", label: "Hostel Attendance", kind: "collection" },
  ]},
  { key: "Transport", icon: Bus, color: "#F97316", reports: [
    { key: "transport-routes", label: "Route & Driver Report", kind: "collection" },
    { key: "zone-assignments", label: "Zone Assignments", kind: "collection" },
    { key: "bus-roster", label: "Bus Roster", kind: "collection" },
  ]},
  { key: "Health", icon: HeartPulse, color: "#EF4444", reports: [
    { key: "medical-records", label: "Medical Records", kind: "collection" },
    { key: "clinic-visits", label: "Clinic Visits", kind: "collection" },
    { key: "immunization", label: "Immunization Report", kind: "collection" },
  ]},
  { key: "Discipline", icon: ShieldAlert, color: "#DC2626", reports: [
    { key: "discipline-records", label: "Discipline Records", kind: "collection" },
    { key: "incident-log", label: "Incident Log", kind: "collection" },
    { key: "behaviour-trends", label: "Behaviour Trends", kind: "collection" },
  ]},
  { key: "Communication", icon: MessageSquare, color: "#06B6D4", reports: [
    { key: "sms-logs", label: "SMS Logs", kind: "collection" },
    { key: "email-logs", label: "Email Logs", kind: "collection" },
    { key: "announcements", label: "Announcements", kind: "collection" },
    { key: "delivery-report", label: "Delivery Report", kind: "collection" },
  ]},
  { key: "Management", icon: LayoutDashboard, color: "#2563EB", reports: [
    { key: "custom", label: "Customised Reports", kind: "custom" },
    { key: "dashboard", label: "Executive Dashboard", kind: "link", linkTo: "/dashboard" },
    { key: "enrollment-trends", label: "Enrollment Trends", kind: "computed" },
    { key: "revenue-overview", label: "Revenue Overview", kind: "computed" },
  ]},
  { key: "Compliance & Government", icon: Landmark, color: "#475569", reports: [
    { key: "nemis-export", label: "NEMIS Export", kind: "computed" },
    { key: "knec-registration", label: "KNEC Registration", kind: "computed" },
    { key: "statutory-returns", label: "Statutory Returns", kind: "computed" },
    { key: "ministry-data", label: "Ministry Data Submission", kind: "computed" },
  ]},
  { key: "Audit & Security", icon: ScrollText, color: "#0F172A", reports: [
    { key: "audit-trail", label: "Audit Trail", kind: "collection" },
    { key: "login-history", label: "Login History", kind: "collection" },
    { key: "data-change-log", label: "Data Change Log", kind: "collection" },
    { key: "permission-matrix", label: "Permission Matrix", kind: "collection" },
  ]},
];

export const reportPath = (r: ReportEntry) => (r.kind === "link" ? r.linkTo! : `/reports/${r.key}`);
