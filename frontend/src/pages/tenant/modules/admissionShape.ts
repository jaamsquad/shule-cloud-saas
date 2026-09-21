/** Applications come from two places — the public application form (applicantName, contactPhone…) and staff entering one
 *  (firstName, lastName, parentPhone…). This reads either into one shape so every screen shows the details correctly. */
export interface AdmissionView {
    id: string; name: string; firstName: string; lastName: string; gender: string; dob: string; classApplied: string; previousSchool: string;
    parentName: string; relation: string; phone: string; email: string; address: string; notes: string;
    appNo: string; date: any; status: string; source: string; document: string; documentName: string;
    approval?: { by: string; title: string; signedAt: string }; studentId?: string; enrolledClass?: string;
}

export function normAdmission(a: any): AdmissionView {
    const full = String(a.applicantName || `${a.firstName || ""} ${a.lastName || ""}` || "").trim();
    const [first, ...rest] = full.split(/\s+/);
    return {
        id: String(a._id || ""), name: full || "Applicant", firstName: a.firstName || first || "", lastName: a.lastName || rest.join(" "),
        gender: a.gender || "", dob: a.dob || "", classApplied: a.classApplied || "", previousSchool: a.previousSchool || "",
        parentName: a.parentName || a.guardianName || "", relation: a.parentRelation || "", phone: a.parentPhone || a.contactPhone || "", email: a.parentEmail || a.contactEmail || "",
        address: a.address || "", notes: a.notes || "", appNo: a.applicationNo || a.admissionNumber || "", date: a.applicationDate || a.createdAt,
        status: a.status || "Pending", source: a.source || "", document: a.document || "", documentName: a.documentName || "",
        approval: a.approval, studentId: a.studentId, enrolledClass: a.enrolledClass,
    };
}
