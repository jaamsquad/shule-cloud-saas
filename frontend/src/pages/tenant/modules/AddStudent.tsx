import { useState, useRef, useEffect, useMemo } from "react";
import { Home, Settings, Plus, RotateCcw, Check, Download, Loader2, Upload, X, ArrowLeft, AlertTriangle, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useItems } from "@/hooks/useItems";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { downloadStyledTemplate } from "@/lib/excelTemplate";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { useNumbering, NUMBERING_KEY } from "./NumberingSettings";

const normTxt = (v: any) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Spreadsheet dates arrive as Excel serial numbers, Date objects or text — bring them to YYYY-MM-DD.
const toIsoDate = (v: any): string => {
    if (v === undefined || v === null || String(v).trim() === "") return "";
    if (v instanceof Date) return isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10);
    if (typeof v === "number") { const d = new Date(Math.round((v - 25569) * 86400 * 1000)); return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10); }
    const s = String(v).trim();
    if (ISO_DATE.test(s)) return s;
    const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);   // DD/MM/YYYY
    return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : s;   // otherwise leave as typed — the preview flags it
};
const toGender = (v: string): string => { const g = normTxt(v); return g.startsWith("f") ? "Female" : g.startsWith("m") ? "Male" : g ? "Other" : "Male"; };

// One spreadsheet row → student fields. Portal login details are added at import time, once the registration number is final.
// Column names are matched loosely (case, spaces, "_", "/" ignored), so both the ShuleCloud template and
// other systems' exports (ADMNO, NAME, GRADE/FORM, STREAM, UPI, SHA, KCPE_SCORE, PRIMARY_PHONE …) import.
const keyOf = (k: string) => String(k).toLowerCase().replace(/[^a-z0-9]/g, "");
const mapSheetRow = (raw: any) => {
    const item: Record<string, any> = {};
    Object.entries(raw || {}).forEach(([k, v]) => { item[keyOf(k)] = v; });
    const pick = (...keys: string[]) => { for (const k of keys) { const v = item[keyOf(k)]; if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim(); } return ""; };
    const father = { phone: pick("Father Phone", "Father Mobile", "fatherPhone"), email: pick("Father Email", "fatherEmail") };
    const mother = { phone: pick("Mother Phone", "Mother Mobile", "motherPhone"), email: pick("Mother Email", "motherEmail") };
    const primaryPhone = pick("PRIMARY_PHONE", "Guardian Phone", "Parent Phone");
    const guardianName = pick("GUARDIAN_NAME", "Guardian Name", "Guardian", "Parent Name");
    // "GRADE/FORM" + "STREAM" → "Form 3 North"; a single "Class" column is used as is
    const grade = pick("Class", "GRADE/FORM", "Grade", "Form", "studentClass");
    const stream = pick("STREAM", "Stream");
    const studentClass = grade && stream && !normTxt(grade).endsWith(normTxt(stream)) ? `${grade} ${stream}` : grade;
    const reg = pick("Registration No", "ADMNO", "Adm No", "Admission Number", "registrationNo", "admNo");
    return {
        studentName: pick("Student Name", "NAME", "Full Name", "studentName"),
        registrationNo: reg,
        admNo: pick("Admission No", "ADMNO", "Adm No", "admNo"),
        studentClass,
        gender: toGender(pick("Gender", "Sex")),
        dob: toIsoDate(raw["Date of Birth"] ?? raw["DATE_OF_BIRTH"] ?? raw["DOB"] ?? raw.dob),
        email: pick("Email", "Student Email"),
        phone: pick("Phone", "Mobile"),
        address: pick("Address", "Postal Address"),
        bloodGroup: pick("Blood Group"),
        religion: pick("Religion"),
        nationality: pick("Nationality"),
        previousSchool: pick("Previous School", "PREVIOUS_SCHOOL"),
        primarySchool: pick("PRIMARY_SCHOOL", "Primary School"),
        transportZone: pick("Transport Zone"),
        admissionDate: toIsoDate(raw["Admission Date"] ?? raw["DATE_OF_ADMISSION"] ?? raw.admissionDate) || new Date().toISOString().split("T")[0],
        // national / exam numbers and other details
        upi: pick("UPI", "UPI Number", "NEMIS UPI"),
        shaNumber: pick("SHA", "SHA Number", "NHIF", "NHIF Number"),
        indexNumber: pick("INDEX NUMBER", "Index No", "KCSE Index"),
        birthCertNo: pick("BIRTH_CERT_NUMBER", "Birth Certificate No", "Birth Cert No"),
        placeOfBirth: pick("PLACE_OF_BIRTH", "Place of Birth"),
        enrollmentForm: pick("ENROLLMENT_FORM", "Enrollment Form", "Entry Class"),
        entryPosition: pick("ENTRY_POSITION", "Entry Position"),
        kcpeYear: pick("KCPE_YEAR", "KCPE Year", "KPSEA Year"),
        kcpeScore: pick("KCPE_SCORE", "KCPE Score", "KCPE Marks", "KPSEA Score"),
        kcpeIndex: pick("KCPE_INDEX", "KCPE Index", "KPSEA Index"),
        kcpeGrade: pick("KCPE_GRADE", "KCPE Grade"),
        comments: pick("GENERALCOMMENTS", "General Comments", "Comments", "Remarks"),
        // Father / Guardian
        fatherName: pick("Father Name", "fatherName"),
        fatherNationalId: pick("Father National ID", "Father ID"),
        fatherPhone: father.phone,
        fatherOccupation: pick("Father Occupation"),
        fatherEmail: father.email,
        // Mother
        motherName: pick("Mother Name"),
        motherNationalId: pick("Mother National ID", "Mother ID"),
        motherPhone: mother.phone,
        motherOccupation: pick("Mother Occupation"),
        motherEmail: mother.email,
        guardianName,
        guardianRelation: pick("GUARDIAN_RELATION", "Guardian Relation", "Relationship"),
        guardianPhone: primaryPhone,
        parentPhone2: pick("PRIMARY_PHONE_2"),
        secondaryPhone: pick("SECONDARY_PHONE", "Secondary Phone"),
        secondaryPhone2: pick("SECONDARY_PHONE_2"),
        // General parent contact (used by receipts / result emails / SMS)
        parentName: guardianName || pick("Father Name") || pick("Mother Name"),
        parentEmail: father.email || mother.email || pick("Parent Email"),
        parentPhone: father.phone || mother.phone || primaryPhone || pick("SECONDARY_PHONE"),
        status: pick("Status") || "Active",
        balance: Number(pick("Balance")) || 0,
        discount: pick("Discount") || "0",
        avatar: pick("Avatar"),
    };
};

export default function AddStudent() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { items: existingStudents, createItem, isCreating } = useItems("students");
    const { data: numbering } = useNumbering();
    const autoReg = !!numbering?.student.enabled;   // registration numbers are generated automatically
    const [formData, setFormData] = useState({
        studentName: "",
        registrationNo: "",
        studentClass: "",
        admissionDate: "2026-05-15",
        discount: "0",
        phone: "",
        dob: "",
        gender: "Male",
        avatar: "",
        transportZone: "",
        boarding: "",   // Boarder | Day Scholar
        previousSchool: "", shaNumber: "", upi: "", birthCertNo: "", indexNumber: "", kcpeIndex: "", kcpeScore: "", kcpeYear: "", placeOfBirth: "",
    });

    // School profile drives the residence options (boarding / day / mixed).
    const { data: schoolProfile } = useQuery({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => (await api.get("/auth/tenant/profile")).data,
    });
    const schoolType = schoolProfile?.schoolType || "Mixed"; // Boarding | Day | Mixed
    const [showParents, setShowParents] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showQuickAdd, setShowQuickAdd] = useState(false);   // Customize → quick table
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: classesData = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/academics/classes"); return r.data; },
    });
    const { data: zones = [] } = useQuery({
        queryKey: ["transport_zones"],
        queryFn: async () => {
            const r = await api.get("/transport_zones");
            return r.data || [];
        },
    });
    const classNames = classesData.map((c: any) => c.name || c.levelName).filter(Boolean);

    // ── V2 enrollment (replaces the old "Select Class") ──────────────────
    const [enroll, setEnroll] = useState({ classId: "", streamId: "" });
    const { data: v2Years = [] } = useQuery<any[]>({ queryKey: ["v2_years_add"], queryFn: async () => (await api.get("/v2/academic-years")).data || [] });
    const { data: v2Classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes_add"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const { data: v2Streams = [] } = useQuery<any[]>({
        queryKey: ["v2_streams_add", enroll.classId],
        queryFn: async () => enroll.classId ? (await api.get(`/v2/streams?classId=${enroll.classId}`)).data || [] : [],
        enabled: !!enroll.classId,
    });
    const activeYear = v2Years.find((y: any) => y.isActive) || v2Years[0];
    // All streams (for the Quick Add table — pick class then its streams per row).
    const { data: v2AllStreams = [] } = useQuery<any[]>({ queryKey: ["v2_streams_all"], queryFn: async () => (await api.get("/v2/streams")).data || [] });

    // For single-type schools the residence is fixed; for mixed schools the admin picks.
    useEffect(() => {
        if (formData.boarding) return;
        if (schoolType === "Boarding") setFormData(p => ({ ...p, boarding: "Boarder" }));
        else if (schoolType === "Day") setFormData(p => ({ ...p, boarding: "Day Scholar" }));
    }, [schoolType]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Auto-generate portal credentials
        const cleanReg = formData.registrationNo?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || "student";
        const portalUsername = formData.registrationNo || formData.studentName.toLowerCase().replace(/\s+/g, ".").slice(0, 15);
        const portalPassword = `shule@${cleanReg}`;

        // Save the chosen class + stream directly on the student record.
        const cls = v2Classes.find((c: any) => String(c._id) === String(enroll.classId));
        const stream = v2Streams.find((s: any) => String(s._id) === String(enroll.streamId));
        const fullClass = stream ? (stream.fullName || `${cls?.name || ""} ${stream.name}`) : (cls?.name || formData.studentClass);

        createItem({
            ...formData,
            studentClass: fullClass,
            classId: enroll.classId || undefined,
            className: cls?.name || "",
            streamId: enroll.streamId || null,
            stream: stream?.name || "",
            streamName: stream?.name || "",
            portalUsername,
            portalPassword,
            credentialsGenerated: true,
            lastPasswordReset: new Date().toISOString()
        }, {
            onSuccess: (created: any) => {
                // With automatic numbering the server assigns the number and login, so read them from the reply.
                queryClient.invalidateQueries({ queryKey: NUMBERING_KEY });   // the "next number" moved on
                toast.success(`Student added${created?.registrationNo ? ` — Reg No ${created.registrationNo}` : ""}. Login password: ${created?.portalPassword || portalPassword}`);
                navigate("/students");
            }
        });
    };

    // File Import Logics
    const processFile = async (file: File) => {
        setIsProcessing(true);
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const { read, utils } = await import('xlsx');
                const wb = read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast.error("The selected file appears to be empty.");
                    setIsProcessing(false);
                    return;
                }

                // Nothing is saved yet — show the rows in a table so they can be checked first.
                setPreviewRows(data.map((item: any) => mapSheetRow(item)));
                setPreviewFile(file.name);
            } catch (error: any) {
                console.error("Import Error:", error);
                toast.error("Could not read that file. Use the template and save it as .xlsx or .csv.");
            } finally {
                setIsProcessing(false);
            }
        };

        reader.readAsBinaryString(file);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
        e.target.value = "";   // lets the same file be chosen again after fixing it
    };

    // ── Import preview ────────────────────────────────────────────────────────
    const [previewRows, setPreviewRows] = useState<any[] | null>(null);
    const [previewFile, setPreviewFile] = useState("");
    const [importing, setImporting] = useState(false);
    const closeImport = () => { setShowImportModal(false); setPreviewRows(null); setPreviewFile(""); };
    // Put every row without a (recognised) class — or all rows — into one class + stream at once
    const [bulkClassId, setBulkClassId] = useState("");
    const [bulkStreamId, setBulkStreamId] = useState("");
    const [bulkAll, setBulkAll] = useState(false);
    const applyBulkClass = () => {
        const cls = v2Classes.find((c: any) => String(c._id) === bulkClassId); if (!cls) return;
        const st = v2AllStreams.find((x: any) => String(x._id) === bulkStreamId);
        const full = st ? (st.fullName || `${cls.name} ${st.name}`) : cls.name;
        const n = (previewRows || []).filter(r => bulkAll || !resolveClass(r.studentClass)).length;
        setPreviewRows(rs => rs ? rs.map(r => (bulkAll || !resolveClass(r.studentClass) ? { ...r, studentClass: full } : r)) : rs);
        toast.success(`${n} student${n === 1 ? "" : "s"} put in ${full}`);
    };
    const updatePreviewRow = (i: number, patch: any) => setPreviewRows(rs => rs ? rs.map((r, j) => j === i ? { ...r, ...patch } : r) : rs);

    // Match the typed class ("Form 1 East" / "Form 1") to the school's real class + stream.
    const resolveClass = (text: string) => {
        const t = normTxt(text);
        if (!t) return null;
        let stream = v2AllStreams.find((s: any) => normTxt(s.fullName || `${s.className || ""} ${s.name}`) === t);
        let cls = stream ? v2Classes.find((c: any) => String(c._id) === String(stream.classId)) : v2Classes.find((c: any) => normTxt(c.name) === t);
        if (!cls) {
            // "Form 3 N" → class "Form 3" + the stream whose name starts with "N" (North)
            cls = [...v2Classes].sort((a: any, b: any) => String(b.name).length - String(a.name).length).find((c: any) => t.startsWith(normTxt(c.name) + " "));
            if (!cls) return null;
            const rest = t.slice(normTxt(cls.name).length).trim();
            const inClass = v2AllStreams.filter((s: any) => String(s.classId) === String(cls._id));
            const hits = inClass.filter((s: any) => normTxt(s.name) === rest);
            const starts = hits.length ? hits : inClass.filter((s: any) => normTxt(s.name).startsWith(rest));
            if (starts.length !== 1) return null;
            stream = starts[0];
        }
        return {
            classId: String(cls._id), className: cls.name,
            streamId: stream ? String(stream._id) : null, stream: stream?.name || "", streamName: stream?.name || "",
            studentClass: stream ? (stream.fullName || `${cls.name} ${stream.name}`) : cls.name,
        };
    };

    // Problems per row. Errors stop a row being imported; warnings don't.
    const rowIssues = useMemo(() => {
        if (!previewRows) return [];
        const taken = new Set(existingStudents.map((s: any) => normTxt(s.registrationNo)).filter(Boolean));
        const seen = new Set<string>();
        return previewRows.map(r => {
            const errors: string[] = [], warnings: string[] = [];
            if (!String(r.studentName).trim()) errors.push("Name is missing");
            const reg = normTxt(r.registrationNo);
            if (reg) {
                if (taken.has(reg)) errors.push("Registration no. already exists");
                else if (seen.has(reg)) errors.push("Repeated registration no. in this file");
                seen.add(reg);
            } else if (!autoReg) warnings.push("No registration no.");
            if (!String(r.studentClass).trim()) warnings.push("No class");
            else if (!resolveClass(r.studentClass)) warnings.push("Class not found");
            if (r.dob && !ISO_DATE.test(r.dob)) warnings.push("Date of birth should be YYYY-MM-DD");
            return { errors, warnings };
        });
    }, [previewRows, existingStudents, v2Classes, v2AllStreams, autoReg]); // eslint-disable-line react-hooks/exhaustive-deps

    const okCount = rowIssues.filter(x => !x.errors.length).length;
    const errorCount = rowIssues.filter(x => x.errors.length).length;
    const warnCount = rowIssues.filter(x => !x.errors.length && x.warnings.length).length;

    // The row as it will be saved: linked to the real class/stream, plus portal login from the reg no.
    const toStudent = (r: any) => {
        const reg = String(r.registrationNo || "").trim();
        const student: any = { ...r, registrationNo: reg, ...(resolveClass(r.studentClass) || {}) };
        if (reg || !autoReg) {   // with automatic numbers the server makes the login once it has assigned the number
            student.portalUsername = reg || String(r.studentName).toLowerCase().replace(/\s+/g, ".").slice(0, 15);
            student.portalPassword = `shule@${reg.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "student"}`;
            student.credentialsGenerated = true;
            student.lastPasswordReset = new Date().toISOString();
        }
        return student;
    };

    const confirmImport = async () => {
        if (!previewRows) return;
        const items = previewRows.filter((_, i) => !rowIssues[i]?.errors.length).map(toStudent);
        if (!items.length) return;
        setImporting(true);
        try {
            await api.post("/students/bulk", { items });
            toast.success(`Imported ${items.length} student${items.length > 1 ? "s" : ""}${errorCount ? ` · ${errorCount} skipped` : ""}`);
            queryClient.invalidateQueries({ queryKey: ["students"] });
            queryClient.invalidateQueries({ queryKey: ["students-list"] });
            queryClient.invalidateQueries({ queryKey: NUMBERING_KEY });
            closeImport();
            navigate("/students");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to import the student list.");
        } finally {
            setImporting(false);
        }
    };

    // Styled Excel template: coloured headers, drop-downs (class list = this school's own classes), no demo rows
    const downloadSample = async () => {
        try {
            const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
            const classChoices: string[] = [];
            v2Classes.forEach((c: any) => {
                classChoices.push(c.name);
                v2AllStreams.filter((s: any) => String(s.classId) === String(c._id)).forEach((s: any) => classChoices.push(s.fullName || `${c.name} ${s.name}`));
            });
            await downloadStyledTemplate({
                fileName: "ShuleCloud_Student_Import_Template.xlsx", sheetName: "Students", title: "Student import — how to fill this sheet",
                columns: [
                    { header: "Student Name", required: true, width: 26 },
                    { header: "Registration No", text: true, hint: autoReg ? "Leave blank — numbers are generated automatically." : "Must be unique." },
                    { header: "Admission No", text: true },
                    { header: "Class", required: true, options: classChoices, strict: false, width: 22, hint: "Use the school's class names (with the stream if it has one)." },
                    { header: "Gender", options: ["Male", "Female"] },
                    { header: "Date of Birth", text: true, hint: "YYYY-MM-DD" },
                    { header: "Email" }, { header: "Phone", text: true },
                    { header: "Address", width: 28 },
                    { header: "Blood Group", options: bloodGroups },
                    { header: "Religion", options: ["Christianity", "Islam", "Hinduism", "Other"], strict: false },
                    { header: "Nationality" }, { header: "Previous School", width: 24 }, { header: "Transport Zone" },
                    { header: "Admission Date", text: true, hint: "YYYY-MM-DD" },
                    { header: "UPI", text: true, hint: "NEMIS UPI number." }, { header: "SHA Number", text: true, hint: "Social Health Authority number." },
                    { header: "Index Number", text: true, hint: "KCSE / KJSEA index number." }, { header: "Birth Certificate No", text: true }, { header: "Place of Birth" },
                    { header: "Enrollment Form", hint: "Class the student joined in." }, { header: "Entry Position", text: true },
                    { header: "KCPE Year", text: true }, { header: "KCPE Score", text: true }, { header: "KCPE Index", text: true }, { header: "KCPE Grade" }, { header: "Primary School", width: 24 },
                    { header: "Guardian Name", width: 22 }, { header: "Guardian Relation", options: ["Father", "Mother", "Guardian", "Uncle", "Aunt", "Grandparent", "Sibling", "Other"], strict: false }, { header: "Guardian Phone", text: true }, { header: "Secondary Phone", text: true },
                    { header: "Comments", width: 28 },
                    { header: "Father Name", width: 22 }, { header: "Father National ID", text: true }, { header: "Father Phone", text: true }, { header: "Father Occupation" }, { header: "Father Email" },
                    { header: "Mother Name", width: 22 }, { header: "Mother National ID", text: true }, { header: "Mother Phone", text: true }, { header: "Mother Occupation" }, { header: "Mother Email" },
                    { header: "Balance", hint: "Opening fee balance (number)." }, { header: "Discount", hint: "Percentage, e.g. 10." },
                ],
            });
            toast.success("Excel template downloaded successfully!");
        } catch (err) {
            toast.error("Failed to generate Excel template");
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
                processFile(file);
            } else {
                toast.error("Unsupported file format. Please upload Excel or CSV.");
            }
        }
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl flex-wrap gap-4">
                <div className="flex items-center flex-1">
                    <span className="font-bold text-gray-800 text-lg mr-2">Students</span>
                    <span className="text-gray-300 mx-2">|</span>
                    <Home className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-gray-500 font-medium">
                        - Admission Form
                    </span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowQuickAdd(true)} className="px-4 py-2 bg-[#ff5e5e] text-white text-xs font-bold rounded-md shadow-sm">Customize</button>
                    <button 
                        onClick={() => setShowImportModal(true)}
                        className="px-4 py-2 bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-xs font-bold rounded-md shadow-sm flex items-center gap-2 transition-all"
                    >
                        <Download className="w-3.5 h-3.5" /> Import Students
                    </button>
                </div>
            </div>

            <div className="px-6 pb-6">
                <div className="max-w-[1000px] mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 p-8 relative">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Admission Form</h2>
                        <div className="flex items-center justify-center gap-4 mt-2 text-sm">
                            <div className="flex items-center gap-1.5 text-[#5C67F2] font-bold">
                                <div className="w-3.5 h-1.5 bg-[#5C67F2] rounded-full"></div>
                                Required*
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-400 font-bold">
                                <div className="w-3.5 h-1.5 bg-gray-300 rounded-full"></div>
                                Optional
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10">
                        {/* Section 1 */}
                        <div>
                            <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-6">
                                <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs">1</div>
                                Student Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <InputField name="studentName" value={formData.studentName} onChange={handleChange} label="Student Name*" placeholder="Name of Student" required />
                                {autoReg
                                    ? <InputField name="registrationNo" value="" readOnly label="Registration No (automatic)" placeholder={`Assigned on save — next: ${numbering?.student.preview || ""}`} />
                                    : <InputField name="registrationNo" value={formData.registrationNo} onChange={handleChange} label="Last Registration*" placeholder="Registration No" required />}
                                {/* Enrollment class (V2) */}
                                <div className="relative">
                                    <div className="absolute -top-3 left-6 bg-indigo-500 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest z-10 shadow-sm">Class *</div>
                                    <select value={enroll.classId} onChange={e => setEnroll({ classId: e.target.value, streamId: "" })}
                                        className="w-full h-12 px-6 border border-gray-200 rounded-full bg-white focus:outline-none focus:border-[#5C67F2] text-sm text-gray-700 font-bold appearance-none cursor-pointer">
                                        <option value="">Select class…</option>
                                        {v2Classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                                {/* Stream (depends on class) */}
                                <div className="relative">
                                    <div className="absolute -top-3 left-6 bg-indigo-500 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest z-10 shadow-sm">Stream *</div>
                                    <select value={enroll.streamId} onChange={e => setEnroll(p => ({ ...p, streamId: e.target.value }))} disabled={!enroll.classId}
                                        className="w-full h-12 px-6 border border-gray-200 rounded-full bg-white focus:outline-none focus:border-[#5C67F2] text-sm text-gray-700 font-bold appearance-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-300">
                                        <option value="">{enroll.classId ? "Select stream…" : "Pick class first"}</option>
                                        {v2Streams.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                </div>
                                
                                <div className="relative">
                                    <div className="absolute -top-3 left-6 bg-indigo-500 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest z-10 shadow-sm border border-white/20">
                                        Student Photo
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full border-2 border-[#5C67F2]/20 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-inner">
                                            {formData.avatar ? (
                                                <img src={formData.avatar} alt="Student" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-[#5C67F2] font-black text-xs uppercase tracking-tighter opacity-30">IMG</div>
                                            )}
                                        </div>
                                        <label className="flex-1 h-12 border border-gray-200 rounded-full flex items-center px-4 bg-white cursor-pointer hover:border-[#5C67F2] transition-colors group">
                                            <span className="text-xs text-gray-400 group-hover:text-[#5C67F2] font-bold">
                                                {formData.avatar ? 'Change Photo' : 'Choose Photo...'}
                                            </span>
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setFormData({ ...formData, avatar: reader.result as string });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <InputField name="admissionDate" value={formData.admissionDate} onChange={handleChange} label="Date of Admission*" placeholder="15/05/2026" required isDate />
                                <InputField name="discount" value={formData.discount} onChange={handleChange} label="Discount In Fee*" placeholder="In %" required />
                                <div className="md:col-start-3">
                                    <InputField name="phone" value={formData.phone} onChange={handleChange} label="Mobile No. For SMS/WhatsApp" placeholder="e.g +44xxxxxxxxxx" />
                                </div>
                                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                    <SelectField 
                                        name="transportZone" 
                                        value={formData.transportZone} 
                                        onChange={handleChange} 
                                        label="Transport Zone" 
                                        placeholder="No Transport Zone (Select to Assign)" 
                                        options={zones.map((z: any) => z.name)} 
                                    />
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* Section 2 */}
                        <div>
                            <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-6">
                                <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs">2</div>
                                Other Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <InputField name="dob" value={formData.dob} onChange={handleChange} label="Date Of Birth" placeholder="dd/mm/yyyy" isDate />
                                <InputField label="Student Birth Form ID / NIC" placeholder="Student Birth Form ID / NIC" />
                                <SelectField label="Orphan Student" placeholder="Select" options={['Yes', 'No']} />
                                
                                <SelectField name="gender" value={formData.gender} onChange={handleChange} label="Gender" placeholder="Gender" options={['Male', 'Female', 'Other']} />
                                {/* Residence — boarder vs day scholar (driven by School Type in profile) */}
                                <div className="relative">
                                    <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[10px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                        Residence{schoolType === "Mixed" ? "*" : ""}
                                    </div>
                                    <select
                                        name="boarding" value={formData.boarding} onChange={handleChange}
                                        disabled={schoolType !== "Mixed"}
                                        className="w-full h-12 px-5 border border-gray-300 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 bg-white appearance-none cursor-pointer text-sm disabled:bg-slate-50 disabled:text-slate-500"
                                    >
                                        <option value="" disabled>Select residence</option>
                                        <option value="Boarder">Boarder</option>
                                        <option value="Day Scholar">Day Scholar</option>
                                    </select>
                                    {schoolType !== "Mixed" && (
                                        <p className="text-[9px] text-slate-400 mt-1 ml-6 font-bold">Fixed by school type ({schoolType}). Change it in General Settings → Institute Profile.</p>
                                    )}
                                </div>
                                <InputField label="Cast" placeholder="Cast" />
                                <SelectField label="OSC" placeholder="Select" options={['Yes', 'No']} />
                                
                                <InputField label="Any Identification Mark?" placeholder="Any Identification Mark?" />
                                <InputField name="previousSchool" value={formData.previousSchool} onChange={handleChange} label="Previous School" placeholder="Previous School" />
                                <InputField name="shaNumber" value={formData.shaNumber} onChange={handleChange} label="SHA Number" placeholder="Social Health Authority number" />
                                <InputField name="upi" value={formData.upi} onChange={handleChange} label="UPI Number" placeholder="NEMIS UPI" />
                                <InputField name="birthCertNo" value={formData.birthCertNo} onChange={handleChange} label="Birth Certificate No" placeholder="Birth certificate number" />
                                <InputField name="placeOfBirth" value={formData.placeOfBirth} onChange={handleChange} label="Place of Birth" placeholder="Place of birth" />
                                <InputField name="indexNumber" value={formData.indexNumber} onChange={handleChange} label="KCSE / KJSEA Index No" placeholder="Index number" />
                                <InputField name="kcpeIndex" value={formData.kcpeIndex} onChange={handleChange} label="KCPE / KPSEA Index" placeholder="Primary exam index" />
                                <InputField name="kcpeScore" value={formData.kcpeScore} onChange={handleChange} label="KCPE / KPSEA Score" placeholder="Marks" />
                                <InputField name="kcpeYear" value={formData.kcpeYear} onChange={handleChange} label="KCPE / KPSEA Year" placeholder="e.g. 2023" />
                                <SelectField label="Religion" placeholder="Religion" options={['Islam', 'Christianity', 'Other']} />

                                <SelectField label="Blood Group" placeholder="Blood Group" options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} />
                                <InputField label="Previous ID / Board Roll No" placeholder="Previous ID / Board Roll No" />
                                <SelectField label="Select Family" placeholder="Select" />

                                <InputField label="Disease If Any?" placeholder="Disease If Any?" />
                                <InputField label="Any Additional Note" placeholder="Any Additional Note" />
                                <InputField label="Total Siblings" placeholder="Total Siblings" />

                                <InputField label="Address" placeholder="Address" />
                                <div className="flex items-end">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowParents(!showParents)}
                                        className={`h-12 px-6 ${showParents ? 'bg-gray-500' : 'bg-[#FF9A5A] hover:bg-[#FF8A40]'} text-white rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-2`}
                                    >
                                        <Plus className={`w-4 h-4 transition-transform duration-300 ${showParents ? 'rotate-45' : ''}`} /> 
                                        {showParents ? 'Hide Parents' : 'Add Parents'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {showParents && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
                                <hr className="border-gray-100" />
                                {/* Section 3 */}
                                <div>
                                    <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-6">
                                        <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs">3</div>
                                        Father/Guardien Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <InputField label="Father Name" placeholder="Father Name" />
                                        <InputField label="Father National ID" placeholder="Father National ID" />
                                        <InputField label="Occupation" placeholder="Occupation" />
                                        <InputField label="Education" placeholder="Education" />
                                        <InputField label="Mobile No" placeholder="Mobile No" />
                                        <InputField label="Profession" placeholder="Profession" />
                                        <div className="lg:col-start-3">
                                            <InputField label="Income" placeholder="Income" />
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-gray-100" />

                                {/* Section 4 */}
                                <div>
                                    <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-6">
                                        <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs">4</div>
                                        Mother Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <InputField label="Mother Name" placeholder="Mother Name" />
                                        <InputField label="Mother National ID" placeholder="Mother National ID" />
                                        <InputField label="Occupation" placeholder="Occupation" />
                                        <InputField label="Education" placeholder="Education" />
                                        <InputField label="Mobile No" placeholder="Mobile No" />
                                        <InputField label="Profession" placeholder="Profession" />
                                        <div className="lg:col-start-3">
                                            <InputField label="Income" placeholder="Income" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-center gap-4 pt-6 border-t border-gray-100">
                            <button 
                                type="button" 
                                onClick={() => setFormData({
                                    studentName: "", registrationNo: "", studentClass: "",
                                    admissionDate: "2026-05-15", discount: "0", phone: "", dob: "", gender: "Male",
                                    avatar: "", transportZone: "", previousSchool: "", shaNumber: "", upi: "", birthCertNo: "", indexNumber: "", kcpeIndex: "", kcpeScore: "", kcpeYear: "", placeOfBirth: "",
                                    boarding: schoolType === "Boarding" ? "Boarder" : schoolType === "Day" ? "Day Scholar" : ""
                                })}
                                className="h-12 px-8 bg-[#FFC165] hover:bg-[#e0a855] text-gray-800 font-bold rounded-full shadow-sm flex items-center gap-2 transition-colors"
                            >
                                <RotateCcw className="w-4 h-4" /> Reset
                            </button>
                            <button 
                                type="submit" 
                                disabled={isCreating}
                                className="h-12 px-10 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold rounded-full shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all disabled:opacity-50"
                            >
                                {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} 
                                Submit
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Import Students Dialog */}
            <Dialog open={showImportModal} onOpenChange={v => v ? setShowImportModal(true) : closeImport()}>
                <DialogContent showCloseButton={false} className={`p-0 border-none overflow-hidden rounded-[24px] shadow-2xl bg-white ${previewRows ? "max-w-6xl" : "max-w-2xl"}`}>
                    <DialogHeader className="bg-gradient-to-r from-[#5C67F2] to-[#7A85F7] p-6 text-white flex flex-row items-center justify-between space-y-0">
                        <div className="flex flex-col">
                            <DialogTitle className="text-xl font-bold tracking-tight">{previewRows ? "Review before importing" : "Bulk Student Import"}</DialogTitle>
                            <DialogDescription className="text-indigo-100 text-xs mt-1">
                                {previewRows
                                    ? `${previewFile} — nothing is saved until you press Import. Fix or remove rows below.`
                                    : "Upload a CSV or Excel spreadsheet of student admission details."}
                            </DialogDescription>
                        </div>
                        <button
                            onClick={closeImport}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all shadow-sm"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </DialogHeader>

                    {previewRows ? (
                        <div className="flex flex-col">
                            {/* Summary */}
                            <div className="px-6 pt-5 pb-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600">{previewRows.length} rows</span>
                                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">{okCount - warnCount} ready</span>
                                {warnCount > 0 && <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700">{warnCount} with warnings</span>}
                                {errorCount > 0 && <span className="px-3 py-1 rounded-full bg-red-50 text-red-600">{errorCount} with errors — will be skipped</span>}
                                {autoReg && <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600">Blank registration numbers are generated automatically</span>}
                            </div>

                            {/* Assign a class to rows that have none */}
                            {(() => {
                                const missing = previewRows.filter(r => !resolveClass(r.studentClass)).length;
                                const streamsOf = v2AllStreams.filter((x: any) => String(x.classId) === bulkClassId);
                                return (
                                    <div className="mx-6 mb-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                                        <span className="font-bold text-slate-700 mr-1">{missing ? `${missing} row${missing === 1 ? " has" : "s have"} no class (or one we couldn't find).` : "Every row has a class."} Put {bulkAll ? "all rows" : "them"} in:</span>
                                        <select value={bulkClassId} onChange={e => { setBulkClassId(e.target.value); setBulkStreamId(""); }} className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs">
                                            <option value="">Class…</option>
                                            {v2Classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                        <select value={bulkStreamId} onChange={e => setBulkStreamId(e.target.value)} disabled={!bulkClassId} className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs disabled:bg-slate-100">
                                            <option value="">{streamsOf.length ? "No stream" : "—"}</option>
                                            {streamsOf.map((x: any) => <option key={x._id} value={x._id}>{x.name}</option>)}
                                        </select>
                                        <label className="flex items-center gap-1.5 text-slate-600"><input type="checkbox" checked={bulkAll} onChange={e => setBulkAll(e.target.checked)} className="w-3.5 h-3.5" /> all rows</label>
                                        <button type="button" onClick={applyBulkClass} disabled={!bulkClassId || (!missing && !bulkAll)} className="h-9 px-4 rounded-lg bg-slate-900 text-white font-bold disabled:opacity-40">Apply</button>
                                    </div>
                                );
                            })()}

                            {/* Table */}
                            <div className="px-6 overflow-auto max-h-[52vh]">
                                <table className="w-full text-xs border-separate border-spacing-0">
                                    <thead className="sticky top-0 bg-white z-10">
                                        <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                            {["#", "Student name", "Reg no.", "Class", "Gender", "Date of birth", "Phone", "Guardian", "Guardian phone", "Issues", ""].map(h => <th key={h} className="py-2 pr-3 border-b border-slate-100 whitespace-nowrap">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewRows.map((r, i) => {
                                            const { errors, warnings } = rowIssues[i] || { errors: [], warnings: [] };
                                            const cell = "py-1.5 pr-3 border-b border-slate-50";
                                            const box = "h-8 px-2 border border-gray-200 rounded-md bg-white text-xs w-full focus:outline-none focus:border-[#5C67F2]";
                                            return (
                                                <tr key={i} className={errors.length ? "bg-red-50/60" : warnings.length ? "bg-amber-50/40" : ""}>
                                                    <td className={`${cell} pl-1 text-slate-400`}>{i + 1}</td>
                                                    <td className={`${cell} min-w-[160px]`}><input value={r.studentName} onChange={e => updatePreviewRow(i, { studentName: e.target.value })} className={box} /></td>
                                                    <td className={`${cell} min-w-[110px]`}><input value={r.registrationNo} onChange={e => updatePreviewRow(i, { registrationNo: e.target.value })} placeholder={autoReg ? "Auto" : ""} className={box} /></td>
                                                    <td className={`${cell} min-w-[120px]`}><input value={r.studentClass} onChange={e => updatePreviewRow(i, { studentClass: e.target.value })} className={box} /></td>
                                                    <td className={cell}>
                                                        <select value={r.gender} onChange={e => updatePreviewRow(i, { gender: e.target.value })} className={box}>
                                                            <option>Male</option><option>Female</option><option>Other</option>
                                                        </select>
                                                    </td>
                                                    <td className={`${cell} whitespace-nowrap text-slate-600`}>{r.dob || "—"}</td>
                                                    <td className={`${cell} whitespace-nowrap text-slate-600`}>{r.phone || "—"}</td>
                                                    <td className={`${cell} whitespace-nowrap text-slate-600`}>{r.fatherName || r.motherName || "—"}</td>
                                                    <td className={`${cell} whitespace-nowrap text-slate-600`}>{r.fatherPhone || r.motherPhone || "—"}</td>
                                                    <td className={`${cell} min-w-[170px]`}>
                                                        {errors.map(m => <div key={m} className="text-red-600 font-bold">{m}</div>)}
                                                        {warnings.map(m => <div key={m} className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3 shrink-0" />{m}</div>)}
                                                        {!errors.length && !warnings.length && <span className="text-emerald-600 font-bold">OK</span>}
                                                    </td>
                                                    <td className={cell}>
                                                        <button onClick={() => setPreviewRows(rs => rs ? rs.filter((_, j) => j !== i) : rs)} title="Remove row" className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {previewRows.length === 0 && <tr><td colSpan={11} className="py-10 text-center text-slate-400 font-bold">No rows left to import.</td></tr>}
                                    </tbody>
                                </table>
                            </div>

                            {/* Actions */}
                            <div className="p-6 flex items-center justify-between gap-3 border-t border-slate-100 mt-3">
                                <button type="button" onClick={() => { setPreviewRows(null); setPreviewFile(""); }} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-full hover:border-[#5C67F2] hover:text-[#5C67F2] transition-colors inline-flex items-center gap-2">
                                    <ArrowLeft className="w-3.5 h-3.5" /> Choose another file
                                </button>
                                <button type="button" onClick={confirmImport} disabled={importing || okCount === 0} className="px-6 py-2.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-xs font-bold rounded-full shadow-sm inline-flex items-center gap-2 disabled:opacity-50 transition-colors">
                                    {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    Import {okCount} student{okCount === 1 ? "" : "s"}
                                </button>
                            </div>
                        </div>
                    ) : (
                    <div className="p-6 space-y-6">
                        {/* Drag and Drop Zone */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-[20px] p-8 text-center transition-all ${
                                isDragging 
                                    ? "border-[#5C67F2] bg-indigo-50/50 scale-[0.98]" 
                                    : "border-gray-200 hover:border-gray-300 bg-slate-50/30"
                            }`}
                        >
                            <div className="max-w-md mx-auto space-y-4">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100">
                                    <Upload className={`w-8 h-8 ${isDragging ? 'text-[#5C67F2] animate-bounce' : 'text-slate-400'}`} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-base font-bold text-gray-800">Drag and drop your spreadsheet here</h3>
                                    <p className="text-xs text-gray-400">Supports .xlsx, .xls, and .csv files</p>
                                </div>
                                
                                <div className="pt-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept=".xlsx, .xls, .csv"
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isProcessing}
                                        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-full hover:border-[#5C67F2] hover:text-[#5C67F2] transition-colors inline-flex items-center gap-2 shadow-sm disabled:opacity-50"
                                    >
                                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                        {isProcessing ? 'Processing File...' : 'Select File Manually'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Excel Template & Guidelines */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-between">
                                <div className="space-y-1">
                                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Excel Template</h4>
                                    <p className="text-[11px] text-gray-400">Download the standard spreadsheet formatting schema to structure your records.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={downloadSample}
                                    className="mt-4 w-full py-2.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-xs font-bold rounded-full shadow-sm flex items-center justify-center gap-2 transition-all"
                                >
                                    <Download className="w-3.5 h-3.5" /> Download Template
                                </button>
                            </div>

                            <div className="bg-slate-50 p-5 rounded-2xl border border-gray-100 space-y-3">
                                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Import Guidelines</h4>
                                <ul className="text-[11px] text-gray-500 space-y-2 list-disc list-inside">
                                    <li>Column headers must match the template exactly.</li>
                                    <li>Registration No must be unique.</li>
                                    <li>Class names must match existing class levels.</li>
                                    <li>Date fields must follow YYYY-MM-DD.</li>
                                    <li>You can review every row before anything is saved.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Quick Add table (Customize) — record basic info for many students fast */}
            <QuickAddStudents
                open={showQuickAdd}
                onOpenChange={setShowQuickAdd}
                classes={v2Classes}
                allStreams={v2AllStreams}
                activeYear={activeYear}
                onDone={() => { queryClient.invalidateQueries({ queryKey: ["students"] }); queryClient.invalidateQueries({ queryKey: ["students-list"] }); queryClient.invalidateQueries({ queryKey: NUMBERING_KEY }); }}
            />
        </div>
    );
}

// ── Quick Add table ──────────────────────────────────────────────────────────
// A simple grid to capture students' basic info — Name, Class, Stream, Reg/Adm No,
// Gender — and admit them all at once (creates the student + v2 enrollment).
function QuickAddStudents({ open, onOpenChange, classes, allStreams, activeYear, onDone }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    classes: any[];
    allStreams: any[];
    activeYear: any;
    onDone: () => void;
}) {
    const { data: numbering } = useNumbering();   // blank reg numbers are generated when automatic numbering is on
    type Row = { name: string; classId: string; streamId: string; reg: string; gender: string };
    const blank = (): Row => ({ name: "", classId: "", streamId: "", reg: "", gender: "Male" });
    const [rows, setRows] = useState<Row[]>([blank(), blank(), blank()]);
    const [saving, setSaving] = useState(false);

    const setRow = (i: number, patch: Partial<Row>) => setRows(rs => rs.map((r, j) => j === i ? { ...r, ...patch } : r));
    const addRow = () => setRows(rs => [...rs, blank()]);
    const removeRow = (i: number) => setRows(rs => rs.length > 1 ? rs.filter((_, j) => j !== i) : rs);
    const streamsFor = (classId: string) => allStreams.filter((s: any) => String(s.classId) === String(classId));

    const save = async () => {
        const filled = rows.filter(r => r.name.trim() && r.classId);
        if (!filled.length) { toast.error("Add at least one student with a name and class."); return; }
        setSaving(true);
        let ok = 0, fail = 0;
        let lastError = "";
        for (const r of filled) {
            try {
                const cls = classes.find((c: any) => String(c._id) === String(r.classId));
                const stream = allStreams.find((s: any) => String(s._id) === String(r.streamId));
                const fullClass = stream ? (stream.fullName || `${cls?.name || ""} ${stream.name}`) : (cls?.name || "");
                const cleanReg = (r.reg || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "student";
                const portalUsername = r.reg || r.name.toLowerCase().replace(/\s+/g, ".").slice(0, 15);
                await api.post("/students", {
                    studentName: r.name.trim(),
                    registrationNo: r.reg.trim(),
                    admNo: r.reg.trim(),
                    studentClass: fullClass,
                    classId: r.classId,
                    streamId: r.streamId || null,
                    stream: stream?.name || "",
                    streamName: stream?.name || "",
                    gender: r.gender,
                    admissionDate: new Date().toISOString().split("T")[0],
                    status: "Active",
                    portalUsername,
                    portalPassword: `shule@${cleanReg}`,
                    credentialsGenerated: true,
                    lastPasswordReset: new Date().toISOString(),
                });
                ok++;
            } catch (e: any) { fail++; lastError = e?.response?.data?.message || lastError; }
        }
        setSaving(false);
        if (ok) toast.success(`Admitted ${ok} student${ok > 1 ? "s" : ""}${fail ? ` · ${fail} failed` : ""}.`);
        else toast.error(lastError || "Could not admit students.");
        if (ok) { setRows([blank(), blank(), blank()]); onDone(); onOpenChange(false); }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="p-0 border-none overflow-hidden rounded-[24px] max-w-4xl shadow-2xl bg-white">
                <DialogHeader className="bg-gradient-to-r from-[#5C67F2] to-[#7A85F7] p-6 text-white flex flex-row items-center justify-between space-y-0">
                    <div className="flex flex-col">
                        <DialogTitle className="text-xl font-bold tracking-tight">Quick Add Students</DialogTitle>
                        <DialogDescription className="text-indigo-100 text-xs mt-1">Record basic info — name, class, stream, reg/adm no, gender — and admit them all at once.</DialogDescription>
                    </div>
                    <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"><X className="w-4 h-4" /></button>
                </DialogHeader>

                <div className="p-5 max-h-[60vh] overflow-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">
                                <th className="py-2 pr-2 w-8">#</th>
                                <th className="py-2 pr-2">Name *</th>
                                <th className="py-2 pr-2">Reg / Adm No</th>
                                <th className="py-2 pr-2">Class *</th>
                                <th className="py-2 pr-2">Stream</th>
                                <th className="py-2 pr-2">Gender</th>
                                <th className="py-2 w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={i} className="border-b border-slate-50">
                                    <td className="py-1.5 pr-2 text-slate-400 font-bold">{i + 1}</td>
                                    <td className="py-1.5 pr-2"><input value={r.name} onChange={e => setRow(i, { name: e.target.value })} placeholder="Student name" className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" /></td>
                                    <td className="py-1.5 pr-2"><input value={r.reg} onChange={e => setRow(i, { reg: e.target.value })} placeholder={numbering?.student.enabled ? "Auto" : "e.g. BS120"} className="w-28 h-9 px-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" /></td>
                                    <td className="py-1.5 pr-2">
                                        <select value={r.classId} onChange={e => setRow(i, { classId: e.target.value, streamId: "" })} className="w-32 h-9 px-2 rounded-lg border border-slate-200 text-sm bg-white">
                                            <option value="">— Class —</option>
                                            {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="py-1.5 pr-2">
                                        <select value={r.streamId} onChange={e => setRow(i, { streamId: e.target.value })} disabled={!r.classId} className="w-28 h-9 px-2 rounded-lg border border-slate-200 text-sm bg-white disabled:bg-slate-50">
                                            <option value="">—</option>
                                            {streamsFor(r.classId).map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="py-1.5 pr-2">
                                        <select value={r.gender} onChange={e => setRow(i, { gender: e.target.value })} className="w-24 h-9 px-2 rounded-lg border border-slate-200 text-sm bg-white">
                                            <option>Male</option><option>Female</option>
                                        </select>
                                    </td>
                                    <td className="py-1.5"><button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={addRow} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#5C67F2] hover:text-[#4a54c4]"><Plus className="w-4 h-4" /> Add row</button>
                </div>

                <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-bold">{rows.filter(r => r.name.trim() && r.classId).length} ready to admit</p>
                    <div className="flex gap-2">
                        <button onClick={() => onOpenChange(false)} className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-500">Cancel</button>
                        <button onClick={save} disabled={saving} className="h-10 px-5 rounded-xl bg-[#5C67F2] text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-50">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Admit Students
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function InputField({ label, placeholder, required, isDate, name, value, onChange, readOnly }: { label: string, placeholder: string, required?: boolean, isDate?: boolean, name?: string, value?: string, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void, readOnly?: boolean }) {
    const isReq = label.includes('*') || required;
    const colorClass = isReq ? "bg-[#5C67F2]" : "bg-gray-400";
    return (
        <div className="relative">
            <div className={`absolute -top-3 left-6 ${colorClass} text-white text-[10px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm`}>
                {label}
            </div>
            <input 
                type={isDate ? "date" : "text"} 
                name={name}
                value={value}
                onChange={onChange}
                readOnly={readOnly}
                placeholder={placeholder}
                className={`w-full h-12 px-5 border border-gray-300 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 placeholder-gray-400 text-sm ${readOnly ? "bg-gray-50 cursor-not-allowed" : "bg-white"}`}
            />
        </div>
    );
}

function SelectField({ label, placeholder, required, name, value, onChange, options = [] }: { label: string, placeholder: string, required?: boolean, name?: string, value?: string, onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void, options?: string[] }) {
    const isReq = label.includes('*') || required;
    const colorClass = isReq ? "bg-[#5C67F2]" : "bg-gray-400";
    return (
        <div className="relative">
            <div className={`absolute -top-3 left-6 ${colorClass} text-white text-[10px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm`}>
                {label}
            </div>
            <select 
                name={name}
                value={value}
                onChange={onChange}
                className="w-full h-12 px-5 border border-gray-300 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 bg-white appearance-none cursor-pointer text-sm"
            >
                <option value="" disabled>{placeholder}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
    );
}
