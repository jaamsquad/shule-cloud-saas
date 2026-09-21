import { useState, useRef, useEffect } from "react";
import { Home, RefreshCcw, Check, Calendar, Loader2, Upload, Download, X, AlertCircle, CheckCircle2, FileSpreadsheet, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import api from "@/lib/api";
import { downloadStyledTemplate } from "@/lib/excelTemplate";
import DataAccessSection from "./DataAccessSection";
import { toast } from "sonner";
import { SCHOOL_ROLES, SCHOOL_ROLE_GROUPS } from "@/lib/schoolRoles";
import { groupDashboardOptions } from "@/components/AppSidebar";
import { useNumbering, NUMBERING_KEY } from "./NumberingSettings";

// ── Excel column → staff field mapping ──────────────────────────────────────
const EXCEL_COLUMNS: { header: string; field: string; required?: boolean }[] = [
    { header: "Employee Name",       field: "employeeName",  required: true },
    { header: "Mobile No",           field: "phone",         required: true },
    { header: "Email Address",       field: "email" },
    { header: "Role / Designation",  field: "designation",   required: true },
    { header: "National ID",         field: "nationalId" },
    { header: "Date of Birth",       field: "dob" },
    { header: "Gender",              field: "gender" },
    { header: "Date of Joining",     field: "joiningDate" },
    { header: "Monthly Salary",      field: "salary" },
    { header: "Father / Spouse",     field: "fatherName" },
    { header: "Religion",            field: "religion" },
    { header: "Blood Group",         field: "bloodGroup" },
    { header: "Education",           field: "education" },
    { header: "Experience",          field: "experience" },
    { header: "Address",             field: "address" },
    { header: "KRA PIN",             field: "kraPin" },
    { header: "NSSF Number",         field: "nssfNo" },
    { header: "NHIF Number",         field: "nhifNo" },
    { header: "Bank Name",           field: "bankName" },
    { header: "Bank Branch",         field: "bankBranch" },
    { header: "Account Number",      field: "accountNo" },
    { header: "Employee No",         field: "staffNo" },   // leave blank to have it generated (when automatic numbering is on)
];

// Styled Excel template: coloured headers, drop-downs, no demo rows
const STAFF_DROPDOWNS: Record<string, { options: string[]; strict?: boolean }> = {
    "Gender": { options: ["Male", "Female"] },
    "Role / Designation": { options: SCHOOL_ROLE_GROUPS.flatMap(g => g.roles), strict: false },
    "Religion": { options: ["Christianity", "Islam", "Hinduism", "Other"], strict: false },
    "Blood Group": { options: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] },
    "Education": { options: ["Certificate", "Diploma", "Bachelor's Degree", "Master's Degree", "PhD"], strict: false },
    "Bank Name": { options: ["Equity Bank", "KCB Bank", "Co-operative Bank", "Absa Bank", "Standard Chartered", "NCBA Bank", "Family Bank", "I&M Bank", "Stanbic Bank", "DTB", "M-Pesa"], strict: false },
};
const STAFF_TEXT = new Set(["Mobile No", "National ID", "Date of Birth", "Date of Joining", "KRA PIN", "NSSF Number", "NHIF Number", "Account Number", "Employee No"]);
const STAFF_HINTS: Record<string, string> = {
    "Date of Birth": "YYYY-MM-DD", "Date of Joining": "YYYY-MM-DD", "Monthly Salary": "Number, e.g. 45000",
    "Mobile No": "e.g. +254712345678", "Employee No": "Leave blank to have it generated (when automatic numbering is on).",
};
function downloadTemplate() {
    void downloadStyledTemplate({
        fileName: "staff_import_template.xlsx", sheetName: "Staff", title: "Employee import — how to fill this sheet",
        columns: EXCEL_COLUMNS.map(c => ({
            header: c.header, required: c.required, text: STAFF_TEXT.has(c.header), hint: STAFF_HINTS[c.header],
            options: STAFF_DROPDOWNS[c.header]?.options, strict: STAFF_DROPDOWNS[c.header]?.strict,
            width: c.header === "Employee Name" || c.header === "Role / Designation" ? 26 : undefined,
        })),
    }).catch(() => toast.error("Failed to generate Excel template"));
}

export default function AddEmployee() {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>(); // present when editing
    const isEditMode = !!id;
    const qc = useQueryClient();
    const { createItem, isCreating } = useItems("staff");
    const { items: subjects } = useItems("subjects");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dataLoaded, setDataLoaded] = useState(false);

    // Roles are the fixed, predefined school roles — no custom role creation.
    const roleOptions = SCHOOL_ROLES;

    // ── Single-add form state ──────────────────────────────────────────────
    const [formData, setFormData] = useState({
        employeeName: "", fatherName: "", email: "", phone: "", dob: "",
        gender: "Male", designation: "", joiningDate: "", salary: "", address: "",
        specializedSubjects: [] as string[],
        roles: [] as string[], portalAccess: "both", landingPage: "",
        experience: "", nationalId: "", religion: "", education: "", bloodGroup: "",
        department: "", reportsTo: "",
        dataAccess: { studentScope: "all", staffScope: "all" } as any,
        kraPin: "", nssfNo: "", nhifNo: "", bankName: "", bankBranch: "", accountNo: "",
        staffNo: ""
    });
    const { data: numbering } = useNumbering();
    const autoStaffNo = !!numbering?.staff.enabled && !isEditMode;   // employee number is assigned on save

    // Eligible supervisors for the "Reports To" routing field (other staff).
    const { data: supervisors = [] } = useQuery({
        queryKey: ["req_supervisors"],
        queryFn: async () => { try { return (await api.get("/requests/supervisors")).data as any[]; } catch { return []; } },
    });

    const toggleRole = (r: string) =>
        setFormData(prev => ({ ...prev, roles: prev.roles.includes(r) ? prev.roles.filter(x => x !== r) : [...prev.roles, r] }));

    // ── Import state ──────────────────────────────────────────────────────
    const [showImport, setShowImport] = useState(false);
    const [parsedRows, setParsedRows] = useState<any[]>([]);
    const [importErrors, setImportErrors] = useState<string[]>([]);
    const [importing, setImporting] = useState(false);
    const [importDone, setImportDone] = useState<{ success: number; failed: number } | null>(null);
    const [previewExpanded, setPreviewExpanded] = useState(true);

    const toggleSubject = (id: string) =>
        setFormData(prev => ({
            ...prev,
            specializedSubjects: prev.specializedSubjects.includes(id)
                ? prev.specializedSubjects.filter(s => s !== id)
                : [...prev.specializedSubjects, id],
        }));

    // ── Fetch existing data in edit mode ──────────────────────────────────────
    const { data: existingStaff } = useQuery({
        queryKey: ["staff_edit", id],
        queryFn: async () => (await api.get(`/staff/${id}`)).data,
        enabled: isEditMode,
    });

    // Pre-fill form when existing data loads
    useEffect(() => {
        if (!existingStaff || dataLoaded) return;
        setDataLoaded(true);
        setFormData({
            employeeName:        existingStaff.employeeName || existingStaff.name || "",
            fatherName:          existingStaff.fatherName || "",
            email:               existingStaff.email || "",
            phone:               existingStaff.phone || "",
            dob:                 existingStaff.dob?.split("T")[0] || "",
            gender:              existingStaff.gender || "Male",
            designation:         existingStaff.designation || "",
            roles:               existingStaff.roles || (existingStaff.designation ? [existingStaff.designation] : []),
            portalAccess:        existingStaff.portalAccess || "both",
            landingPage:         existingStaff.landingPage || "",
            joiningDate:         existingStaff.joiningDate?.split("T")[0] || "",
            salary:              existingStaff.salary || "",
            address:             existingStaff.address || "",
            specializedSubjects: existingStaff.specializedSubjects || [],
            department:          existingStaff.department || "",
            reportsTo:           existingStaff.reportsTo ? String(existingStaff.reportsTo) : "",
            dataAccess:          existingStaff.dataAccess || { studentScope: "all", staffScope: "all" },
            experience:          existingStaff.experience || "",
            nationalId:          existingStaff.nationalId || "",
            religion:            existingStaff.religion || "",
            education:           existingStaff.education || "",
            bloodGroup:          existingStaff.bloodGroup || "",
            kraPin:              existingStaff.kraPin || "",
            nssfNo:              existingStaff.nssfNo || "",
            nhifNo:              existingStaff.nhifNo || "",
            bankName:            existingStaff.bankName || "",
            bankBranch:          existingStaff.bankBranch || "",
            accountNo:           existingStaff.accountNo || "",
            staffNo:             existingStaff.staffNo || "",
        });
    }, [existingStaff, dataLoaded]);

    // ── Update mutation (edit mode) ────────────────────────────────────────────
    const updateMut = useMutation({
        mutationFn: (data: any) => api.patch(`/staff/${id}`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["staff"] });
            qc.invalidateQueries({ queryKey: ["staff_profile", id] });
            toast.success("Employee record updated successfully");
            navigate(`/staff/profile/${id}`);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to update"),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditMode) {
            updateMut.mutate(formData);
        } else {
            createItem(formData, { onSuccess: () => { qc.invalidateQueries({ queryKey: NUMBERING_KEY }); navigate("/staff"); } });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    // ── Parse uploaded Excel ──────────────────────────────────────────────
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const wb = XLSX.read(ev.target?.result, { type: "binary", cellDates: true });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
                if (rawRows.length < 2) {
                    setImportErrors(["The file is empty or has no data rows."]);
                    setParsedRows([]);
                    return;
                }

                // Normalize headers
                const fileHeaders: string[] = rawRows[0].map((h: any) => String(h || "").trim().toLowerCase());
                const colMap: Record<string, number> = {};
                EXCEL_COLUMNS.forEach(c => {
                    const idx = fileHeaders.findIndex(h =>
                        h === c.header.toLowerCase() ||
                        h.includes(c.field.toLowerCase()) ||
                        h.includes(c.header.toLowerCase().split(" ")[0])
                    );
                    if (idx !== -1) colMap[c.field] = idx;
                });

                const errors: string[] = [];
                const rows = rawRows.slice(1).filter((r: any[]) => r.some(cell => cell !== "")).map((row: any[], rowIdx) => {
                    const obj: any = {};
                    EXCEL_COLUMNS.forEach(c => {
                        const idx = colMap[c.field];
                        let val = idx !== undefined ? row[idx] : "";
                        // Format dates
                        if (val instanceof Date) {
                            val = val.toISOString().split("T")[0];
                        } else {
                            val = String(val ?? "").trim();
                        }
                        obj[c.field] = val;
                    });

                    // Validate required fields
                    EXCEL_COLUMNS.filter(c => c.required).forEach(c => {
                        if (!obj[c.field]) errors.push(`Row ${rowIdx + 2}: "${c.header}" is required.`);
                    });

                    return obj;
                });

                setParsedRows(rows);
                setImportErrors(errors);
                setImportDone(null);
            } catch (err: any) {
                setImportErrors([`Failed to parse file: ${err.message}`]);
                setParsedRows([]);
            }
        };
        reader.readAsBinaryString(file);
        // Reset input so same file can be re-selected
        e.target.value = "";
    };

    const handleBulkImport = async () => {
        if (parsedRows.length === 0) return;
        setImporting(true);
        let success = 0, failed = 0;
        // Use bulk endpoint if available, else fall back to sequential
        try {
            const res = await api.post("/staff/bulk", { items: parsedRows });
            success = res.data?.count || parsedRows.length;
        } catch (err: any) {
            // Fall back to one-by-one
            for (const row of parsedRows) {
                try {
                    await api.post("/staff", row);
                    success++;
                } catch {
                    failed++;
                }
            }
        }
        setImporting(false);
        setImportDone({ success, failed });
        if (success > 0) toast.success(`${success} staff member${success > 1 ? "s" : ""} imported successfully!`);
        if (failed > 0) toast.error(`${failed} row${failed > 1 ? "s" : ""} failed to import.`);
    };

    const previewCols = ["employeeName", "phone", "email", "designation", "salary"];

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center pb-20">

            {/* ── Breadcrumb ───────────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <div className="flex items-center gap-2">
                    {isEditMode && (
                        <button onClick={() => navigate(`/staff/profile/${id}`)} className="text-gray-400 hover:text-[#5C67F2] transition-colors mr-1">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <span className="font-bold text-gray-800 text-lg">Employees</span>
                    <span className="text-gray-300 mx-1">|</span>
                    <span className="text-gray-500 font-medium">{isEditMode ? `Edit — ${existingStaff?.employeeName || existingStaff?.name || "Staff"}` : "New Staff Profile"}</span>
                </div>
                {/* Import button — only shown in create mode */}
                {!isEditMode && (
                    <button
                        onClick={() => { setShowImport(v => !v); setImportDone(null); setParsedRows([]); setImportErrors([]); }}
                        className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${
                            showImport
                                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                : "bg-[#5C67F2] text-white hover:bg-[#4a54c4]"
                        }`}>
                        <FileSpreadsheet className="w-4 h-4" />
                        {showImport ? "Back to Form" : "Import from Excel"}
                    </button>
                )}
            </div>

            <div className="w-full max-w-5xl px-6 mt-4 space-y-6">

                {/* ── Excel Import Panel ───────────────────────────────────── */}
                {showImport && (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Bulk Import Staff</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Upload an Excel file (.xlsx / .xls) to import multiple staff members at once.</p>
                            </div>
                            <button onClick={downloadTemplate}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full font-bold text-xs transition-all">
                                <Download className="w-3.5 h-3.5" /> Download Template
                            </button>
                        </div>

                        {/* How to use */}
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">How to use</p>
                            <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                                <li>Download the Excel template above.</li>
                                <li>Fill in staff data — each row is one employee. Do not change the column headers.</li>
                                <li>Required columns: <strong>Employee Name, Mobile No, Role / Designation</strong>.</li>
                                <li>Upload the filled file below, review the preview, then click <strong>Import All</strong>.</li>
                            </ol>
                        </div>

                        {/* Upload zone */}
                        {!importDone ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-[#5C67F2]/30 hover:border-[#5C67F2] bg-[#5C67F2]/2 hover:bg-[#5C67F2]/5 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all group"
                            >
                                <div className="w-14 h-14 bg-[#5C67F2]/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#5C67F2]/15 transition-all">
                                    <Upload className="w-7 h-7 text-[#5C67F2]" strokeWidth={1.5} />
                                </div>
                                <p className="text-sm font-bold text-gray-700">Click to upload Excel file</p>
                                <p className="text-xs text-gray-400 mt-1">.xlsx or .xls — max 5 MB</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </div>
                        ) : (
                            <div className={`rounded-2xl p-6 border flex items-center gap-4 ${
                                importDone.failed === 0
                                    ? "bg-emerald-50 border-emerald-200"
                                    : "bg-amber-50 border-amber-200"
                            }`}>
                                {importDone.failed === 0
                                    ? <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                                    : <AlertCircle className="w-8 h-8 text-amber-500 flex-shrink-0" />
                                }
                                <div>
                                    <p className="font-bold text-gray-800">
                                        Import complete — {importDone.success} added
                                        {importDone.failed > 0 ? `, ${importDone.failed} failed` : ""}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">Staff records are now available in the All Employees list.</p>
                                </div>
                                <button onClick={() => navigate("/staff")}
                                    className="ml-auto px-5 py-2 bg-[#5C67F2] text-white font-bold text-sm rounded-full hover:bg-[#4a54c4] transition-all">
                                    View Staff →
                                </button>
                            </div>
                        )}

                        {/* Validation errors */}
                        {importErrors.length > 0 && (
                            <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                    <p className="text-xs font-bold text-red-600 uppercase tracking-wide">
                                        {importErrors.length} Validation Issue{importErrors.length > 1 ? "s" : ""} Found
                                    </p>
                                </div>
                                <ul className="space-y-1 max-h-36 overflow-y-auto">
                                    {importErrors.map((err, i) => (
                                        <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                                            <span className="mt-0.5 flex-shrink-0">•</span> {err}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Preview table */}
                        {parsedRows.length > 0 && !importDone && (
                            <div className="mt-6">
                                <div className="flex items-center justify-between mb-3">
                                    <button
                                        onClick={() => setPreviewExpanded(v => !v)}
                                        className="flex items-center gap-2 text-sm font-bold text-gray-700"
                                    >
                                        {previewExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        Preview — {parsedRows.length} row{parsedRows.length > 1 ? "s" : ""} detected
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => { setParsedRows([]); setImportErrors([]); }}
                                            className="text-xs text-gray-400 hover:text-red-500 font-bold flex items-center gap-1 transition-colors">
                                            <X className="w-3.5 h-3.5" /> Clear
                                        </button>
                                        <button
                                            onClick={handleBulkImport}
                                            disabled={importing || importErrors.length > 0}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-[#5C67F2] hover:bg-[#4a54c4] disabled:opacity-50 text-white font-bold text-sm rounded-full shadow-md transition-all"
                                        >
                                            {importing
                                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                                                : <><Upload className="w-4 h-4" /> Import All {parsedRows.length} Staff</>
                                            }
                                        </button>
                                    </div>
                                </div>

                                {previewExpanded && (
                                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50 border-b border-gray-100">
                                                <tr>
                                                    <th className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide">#</th>
                                                    {previewCols.map(f => (
                                                        <th key={f} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide">
                                                            {EXCEL_COLUMNS.find(c => c.field === f)?.header || f}
                                                        </th>
                                                    ))}
                                                    <th className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {parsedRows.map((row, i) => {
                                                    const rowNum = i + 2;
                                                    const hasError = importErrors.some(e => e.startsWith(`Row ${rowNum}:`));
                                                    return (
                                                        <tr key={i} className={`${hasError ? "bg-red-50" : "hover:bg-gray-50"} transition-colors`}>
                                                            <td className="px-3 py-2.5 text-gray-400 font-mono">{rowNum}</td>
                                                            {previewCols.map(f => (
                                                                <td key={f} className="px-3 py-2.5 text-gray-700 font-medium max-w-[140px] truncate">
                                                                    {row[f] || <span className="text-gray-300">—</span>}
                                                                </td>
                                                            ))}
                                                            <td className="px-3 py-2.5">
                                                                {hasError
                                                                    ? <span className="inline-flex items-center gap-1 text-red-600 font-bold"><AlertCircle className="w-3 h-3" /> Error</span>
                                                                    : <span className="inline-flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 className="w-3 h-3" /> Ready</span>
                                                                }
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {importErrors.length > 0 && (
                                    <p className="text-xs text-amber-600 font-bold mt-2 flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        Fix the errors above before importing. Rows with errors will be skipped.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Single Staff Form ────────────────────────────────────── */}
                {!showImport && (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10">
                        <div className="text-center mb-10">
                            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Employee Form</h2>
                            <div className="flex items-center justify-center gap-4 mt-2 text-sm">
                                <div className="flex items-center gap-1.5 text-[#5C67F2] font-bold">
                                    <div className="w-3.5 h-1.5 bg-[#5C67F2] rounded-full" /> Required*
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-400 font-bold">
                                    <div className="w-3.5 h-1.5 bg-gray-300 rounded-full" /> Optional
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-10">
                            {/* 1. Personal */}
                            <div>
                                <SectionHeader num="1" title="Personal & Contact Information" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                                    <InputField name="employeeName" value={formData.employeeName} onChange={handleChange} label="Employee Name*" placeholder="Full Name of Employee" required />
                                    {autoStaffNo
                                        ? <InputField name="staffNo" value="" readOnly label="Employee No (automatic)" placeholder={`Assigned on save — next: ${numbering?.staff.preview || ""}`} />
                                        : <InputField name="staffNo" value={formData.staffNo} onChange={handleChange} label="Employee No" placeholder="e.g. EMP-0001" />}
                                    <InputField name="phone" value={formData.phone} onChange={handleChange} label="Mobile No*" placeholder="e.g. +254xxxxxxxxx" required />
                                    <InputField name="email" value={formData.email} onChange={handleChange} label="Email Address*" placeholder="email@school.com" required />
                                    <SelectField name="designation" value={formData.designation} onChange={handleChange} label="Employee Role*" placeholder="Select Role*" required
                                        options={roleOptions} />
                                    {/* Reports To — first approver for this employee's requests. */}
                                    <div className="relative">
                                        <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">Reports To (Supervisor)</div>
                                        <select name="reportsTo" value={formData.reportsTo} onChange={handleChange}
                                            className="w-full h-12 px-5 bg-white border border-[#5C67F2]/40 rounded-full text-sm font-semibold text-gray-700 focus:outline-none focus:border-[#5C67F2]">
                                            <option value="">— Select supervisor —</option>
                                            {supervisors.filter((s: any) => s._id !== id).map((s: any) => (
                                                <option key={s._id} value={s._id}>{s.name}{s.role ? ` – ${s.role}` : ""}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <InputField name="department" value={formData.department} onChange={handleChange} label="Department" placeholder="e.g. Sciences" color="gray" />
                                    <InputField name="nationalId" value={formData.nationalId} onChange={handleChange} label="National ID / Passport*" placeholder="ID or Passport Number" required />
                                    <DateField name="dob" value={formData.dob} onChange={handleChange} label="Date of Birth*" required />
                                    <SelectField name="gender" value={formData.gender} onChange={handleChange} label="Gender*" placeholder="Select Gender" required options={['Male','Female','Other']} />
                                    <DateField name="joiningDate" value={formData.joiningDate} onChange={handleChange} label="Date of Joining*" required />
                                    <InputField name="salary" value={formData.salary} onChange={handleChange} label="Monthly Salary (KES)*" placeholder="Salary in KES" required />
                                    <InputField name="fatherName" value={formData.fatherName} onChange={handleChange} label="Father / Spouse Name" placeholder="Father or Spouse Name" color="gray" />
                                    <SelectField name="religion" value={formData.religion} onChange={handleChange} label="Religion" placeholder="Select" color="gray" options={['Islam','Christianity','Hinduism','Other']} />
                                    <SelectField name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} label="Blood Group" placeholder="Select" color="gray" options={['A+','A-','B+','B-','O+','O-','AB+','AB-']} />
                                    <InputField name="education" value={formData.education} onChange={handleChange} label="Highest Education" placeholder="e.g. Bachelor of Education" color="gray" />
                                    <InputField name="experience" value={formData.experience} onChange={handleChange} label="Years of Experience" placeholder="e.g. 5 Years" color="gray" />
                                    <div className="relative">
                                        <div className="absolute -top-3 left-6 bg-gray-400 text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">Picture - Optional</div>
                                        <div className="w-full h-12 border border-[#5C67F2]/40 rounded-full flex items-center overflow-hidden bg-white px-2">
                                            <button type="button" className="h-8 px-4 bg-gray-200 text-gray-700 text-xs font-bold rounded-full mr-2 hover:bg-gray-300 transition-colors">Choose File</button>
                                            <span className="text-gray-500 text-sm">No file chosen</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-[#FFC165] bg-[#FFC165]/10 px-2 py-0.5 rounded-full absolute -bottom-5 left-6">Max size 100KB</span>
                                    </div>
                                    <div className="lg:col-span-3">
                                        <InputField name="address" value={formData.address} onChange={handleChange} label="Home / Postal Address" placeholder="e.g. P.O Box 12345, Nairobi" color="gray" />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Statutory & Bank */}
                            <div>
                                <SectionHeader num="2" title="Statutory & Bank Accounts Details" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                                    <InputField name="kraPin" value={formData.kraPin} onChange={handleChange} label="KRA PIN" placeholder="e.g. A012345678B" color="gray" />
                                    <InputField name="nssfNo" value={formData.nssfNo} onChange={handleChange} label="NSSF Number" placeholder="NSSF Number" color="gray" />
                                    <InputField name="nhifNo" value={formData.nhifNo} onChange={handleChange} label="NHIF Number" placeholder="NHIF Number" color="gray" />
                                    <InputField name="bankName" value={formData.bankName} onChange={handleChange} label="Bank Name" placeholder="e.g. KCB, Equity" color="gray" />
                                    <InputField name="bankBranch" value={formData.bankBranch} onChange={handleChange} label="Bank Branch" placeholder="e.g. Westlands" color="gray" />
                                    <InputField name="accountNo" value={formData.accountNo} onChange={handleChange} label="Account Number" placeholder="Bank Account Number" color="gray" />
                                </div>
                            </div>

                            {/* Portal Access & Roles */}
                            <div>
                                <SectionHeader num="3" title="Portal Access & Roles" />
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-2">Assigned Portal *</label>
                                        <div className="space-y-2">
                                            {[
                                                { v: "both", t: "Both portals", d: "Can use the admin app and the teacher portal" },
                                                { v: "admin", t: "Admin app only", d: "Main school system — blocked from the teacher portal" },
                                                { v: "staff", t: "Teacher portal only", d: "Redirected to the teacher portal on login; no admin access" },
                                            ].map(o => (
                                                <label key={o.v} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${formData.portalAccess === o.v ? "border-[#5C67F2] bg-[#5C67F2]/5" : "border-gray-200 hover:border-gray-300"}`}>
                                                    <input type="radio" name="portalAccess" checked={formData.portalAccess === o.v} onChange={() => setFormData(p => ({ ...p, portalAccess: o.v }))} className="mt-1 accent-[#5C67F2]" />
                                                    <div><p className="text-sm font-bold text-gray-700">{o.t}</p><p className="text-xs text-gray-400">{o.d}</p></div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-2">Roles (select one or more)</label>
                                        <p className="text-[11px] text-gray-400 mb-2">A staff member can hold multiple roles. The primary role is set in “Employee Role” above.</p>
                                        <div className="border border-gray-200 rounded-xl p-3 max-h-72 overflow-y-auto space-y-3">
                                            {SCHOOL_ROLE_GROUPS.map(g => (
                                                <div key={g.group}>
                                                    <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-1">{g.group}</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {g.roles.map(r => (
                                                            <button type="button" key={r} onClick={() => toggleRole(r)}
                                                                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${formData.roles.includes(r) ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-gray-600 border-gray-200 hover:border-[#5C67F2]"}`}>
                                                                {r}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border border-[#5C67F2]/20 rounded-2xl p-4 bg-[#5C67F2]/[0.03]">
                                        <label className="block text-xs font-black text-[#5C67F2] uppercase tracking-wide mb-3">Data Access (which students & staff this user can see)</label>
                                        <DataAccessSection value={formData.dataAccess} onChange={(da) => setFormData(p => ({ ...p, dataAccess: da }))} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-2">Default Landing Page</label>
                                        <p className="text-[11px] text-gray-400 mb-2">The page this user opens on first after login. Leave on “Auto” to use the role default (e.g. Kitchen → Meal Service).</p>
                                        <select value={formData.landingPage} onChange={e => setFormData(p => ({ ...p, landingPage: e.target.value }))}
                                            className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2] bg-white">
                                            <option value="">Auto (role default / dashboard)</option>
                                            <option value="/dashboard">Main Dashboard</option>
                                            <optgroup label="Group Dashboards">
                                                {groupDashboardOptions().map(o => (
                                                    <option key={o.path} value={o.path}>{o.label}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Direct Pages">
                                                <option value="/students">All Students</option>
                                                <option value="/staff">All Employees</option>
                                                <option value="/attendance-scanner">Attendance Scanner</option>
                                                <option value="/cafeteria/meal-service">Meal Service (Kitchen)</option>
                                                <option value="/canteen/quick-sale">Quick Sale (Canteen)</option>
                                                <option value="/fees/collect">Collect Fees</option>
                                                <option value="/pos-admin/new-order">POS New Order</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Subject Specialization */}
                            {formData.designation === "Teacher" && (
                                <div className="pt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-2">
                                        <div className="w-6 h-6 rounded-full bg-[#5C67F2] text-white flex items-center justify-center text-xs font-bold">★</div>
                                        <h3 className="text-gray-800 font-bold text-lg">Subject Specialization</h3>
                                    </div>
                                    <p className="text-xs text-gray-500 font-semibold mb-4">Select the curriculum subjects this teacher is specialized in and permitted to teach:</p>
                                    {!subjects?.length ? (
                                        <div className="text-sm text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center font-medium">
                                            No subjects registered yet. Create subjects in the Subjects module first.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {subjects?.map((sub: any) => {
                                                const sel = formData.specializedSubjects.includes(sub._id);
                                                return (
                                                    <button key={sub._id} type="button" onClick={() => toggleSubject(sub._id)}
                                                        className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all h-20 ${sel ? "border-[#5C67F2] bg-[#5C67F2]/5 text-[#5C67F2]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50/50"}`}>
                                                        <span className="font-bold text-xs line-clamp-2 leading-snug">{sub.name || sub.subjectName}</span>
                                                        <span className={`text-[8px] font-black uppercase tracking-widest self-end ${sel ? "text-[#5C67F2]" : "text-gray-400"}`}>
                                                            {sel ? "✓ Assigned" : "Unassigned"}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-center gap-4 pt-10">
                                <button type="button"
                                    onClick={() => setFormData({
                                        employeeName: "", fatherName: "", email: "", phone: "", dob: "",
                                        gender: "Male", designation: "", joiningDate: "", salary: "", address: "",
                                        specializedSubjects: [], experience: "", nationalId: "", religion: "",
                                        education: "", bloodGroup: "", kraPin: "", nssfNo: "", nhifNo: "",
                                        bankName: "", bankBranch: "", accountNo: "", staffNo: ""
                                    })}
                                    className="h-12 px-8 bg-[#FFC165] hover:bg-[#e0a855] text-gray-800 font-bold rounded-full shadow-md flex items-center gap-2 transition-colors">
                                    <RefreshCcw className="w-4 h-4" /> Reset
                                </button>
                                <button type="submit" disabled={isEditMode ? updateMut.isPending : isCreating}
                                    className="h-12 px-8 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold rounded-full shadow-md flex items-center gap-2 transition-colors disabled:opacity-50">
                                    {(isEditMode ? updateMut.isPending : isCreating) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {isEditMode ? "Save Changes" : "Submit"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionHeader({ num, title }: { num: string; title: string }) {
    return (
        <div className="flex items-center gap-2 mb-8 border-b border-gray-200 pb-2">
            <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold">{num}</div>
            <h3 className="text-gray-800 font-bold text-lg">{title}</h3>
        </div>
    );
}

function InputField({ label, placeholder, required, color = "blue", name, value, onChange, readOnly }: {
    label: string; placeholder: string; required?: boolean; color?: "blue" | "purple" | "gray";
    name?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; readOnly?: boolean;
}) {
    const bg = (label.includes("*") || required) ? (color === "purple" ? "bg-[#868DF4]" : "bg-[#5C67F2]") : "bg-gray-400";
    return (
        <div className="relative">
            <div className={`absolute -top-3 left-6 ${bg} text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm`}>{label}</div>
            <input type="text" name={name} value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly}
                className={`w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 placeholder-gray-400 text-sm ${readOnly ? "bg-gray-50 cursor-not-allowed" : "bg-white"}`} />
        </div>
    );
}

function SelectField({ label, placeholder, required, color = "blue", name, value, onChange, options = [] }: {
    label: string; placeholder: string; required?: boolean; color?: "blue" | "purple" | "gray";
    name?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; options?: string[];
}) {
    const bg = (label.includes("*") || required) ? (color === "purple" ? "bg-[#868DF4]" : "bg-[#5C67F2]") : "bg-gray-400";
    return (
        <div className="relative">
            <div className={`absolute -top-3 left-6 ${bg} text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm`}>{label}</div>
            <select name={name} value={value} onChange={onChange}
                className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 bg-white appearance-none cursor-pointer text-sm">
                <option value="" disabled>{placeholder}</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
        </div>
    );
}

function DateField({ label, placeholder, value, onChange, required, color = "blue", name }: {
    label: string; placeholder?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean; color?: "blue" | "purple" | "gray"; name?: string;
}) {
    const bg = (label.includes("*") || required) ? (color === "purple" ? "bg-[#868DF4]" : "bg-[#5C67F2]") : "bg-gray-400";
    return (
        <div className="relative">
            <div className={`absolute -top-3 left-6 ${bg} text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm`}>{label}</div>
            <div className="relative w-full h-12 border border-[#5C67F2]/40 rounded-full overflow-hidden flex items-center bg-white pr-4">
                <input type="date" name={name} value={value} onChange={onChange} placeholder={placeholder}
                    className="w-full h-full px-6 focus:outline-none text-gray-700 text-sm bg-transparent" />
                <Calendar className="w-4 h-4 text-gray-800" />
            </div>
        </div>
    );
}
