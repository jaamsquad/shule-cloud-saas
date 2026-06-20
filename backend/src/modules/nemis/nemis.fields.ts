/**
 * NEMIS field definitions — the single source of truth for the NEMIS Assistant.
 *
 * Each field maps a NEMIS column to one or more candidate keys on the tenant's
 * `students` document (schools store the same datum under varying names), states
 * whether it's required, and supplies the official NEMIS export header/order.
 */
export type Severity = 'required' | 'recommended';

export interface NemisField {
    key: string;            // canonical field key used by the Assistant
    label: string;          // human label
    nemisHeader: string;    // exact header used in the NEMIS export
    severity: Severity;     // required → red when missing; recommended → yellow
    /** Candidate keys to read the value from a student doc (first non-empty wins). */
    sources: string[];
    group: 'student' | 'parent' | 'guardian' | 'academic' | 'location';
}

const v = (s: any): string => (s === null || s === undefined ? '' : String(s).trim());

/** Read the first non-empty candidate value from a student doc. */
export function readField(student: any, f: NemisField): string {
    for (const src of f.sources) {
        const val = v(student?.[src]);
        if (val) return val;
    }
    return '';
}

// Official NEMIS field order (export columns follow this sequence).
export const NEMIS_FIELDS: NemisField[] = [
    { key: 'admissionNo',   label: 'Admission Number',         nemisHeader: 'ADM_NO',           severity: 'required',    sources: ['registrationNo', 'admNo', 'admissionNo'], group: 'student' },
    { key: 'upi',           label: 'UPI Number',               nemisHeader: 'UPI',              severity: 'required',    sources: ['upi', 'upiNumber', 'nemisUpi'], group: 'student' },
    { key: 'studentName',   label: 'Student Name',             nemisHeader: 'STUDENT_NAME',     severity: 'required',    sources: ['studentName', 'name'], group: 'student' },
    { key: 'birthCertNo',   label: 'Birth Certificate Number', nemisHeader: 'BIRTH_CERT_NO',    severity: 'required',    sources: ['birthCertNo', 'birthCertificateNo', 'birthFormId'], group: 'student' },
    { key: 'dob',           label: 'Date of Birth',            nemisHeader: 'DOB',              severity: 'required',    sources: ['dob', 'dateOfBirth'], group: 'student' },
    { key: 'gender',        label: 'Gender',                   nemisHeader: 'GENDER',           severity: 'required',    sources: ['gender', 'sex'], group: 'student' },
    { key: 'nationality',   label: 'Nationality',              nemisHeader: 'NATIONALITY',      severity: 'recommended', sources: ['nationality'], group: 'student' },
    { key: 'county',        label: 'County',                   nemisHeader: 'COUNTY',           severity: 'recommended', sources: ['county'], group: 'location' },
    { key: 'subCounty',     label: 'Sub County',               nemisHeader: 'SUB_COUNTY',       severity: 'recommended', sources: ['subCounty', 'subcounty'], group: 'location' },
    { key: 'ward',          label: 'Ward',                     nemisHeader: 'WARD',             severity: 'recommended', sources: ['ward'], group: 'location' },
    { key: 'grade',         label: 'Grade',                    nemisHeader: 'GRADE',            severity: 'required',    sources: ['currentClass', 'studentClass', 'grade', 'className'], group: 'academic' },
    { key: 'class',         label: 'Class / Stream',           nemisHeader: 'CLASS',            severity: 'recommended', sources: ['streamName', 'stream', 'currentClass', 'studentClass'], group: 'academic' },
    { key: 'admissionDate', label: 'Admission Date',           nemisHeader: 'ADMISSION_DATE',   severity: 'recommended', sources: ['admissionDate', 'dateOfAdmission'], group: 'academic' },
    { key: 'parentName',    label: 'Parent Name',              nemisHeader: 'PARENT_NAME',      severity: 'required',    sources: ['parentName', 'fatherName', 'motherName', 'guardianName'], group: 'parent' },
    { key: 'parentPhone',   label: 'Parent Phone',             nemisHeader: 'PARENT_PHONE',     severity: 'required',    sources: ['parentPhone', 'fatherPhone', 'motherPhone', 'phone'], group: 'parent' },
    { key: 'guardianName',  label: 'Guardian Name',            nemisHeader: 'GUARDIAN_NAME',    severity: 'recommended', sources: ['guardianName', 'motherName', 'fatherName'], group: 'guardian' },
    { key: 'guardianPhone', label: 'Guardian Phone',           nemisHeader: 'GUARDIAN_PHONE',   severity: 'recommended', sources: ['guardianPhone', 'motherPhone', 'fatherPhone'], group: 'guardian' },
    { key: 'disability',    label: 'Disability Status',        nemisHeader: 'DISABILITY',       severity: 'recommended', sources: ['disability', 'disabilityStatus', 'specialNeeds'], group: 'student' },
    { key: 'passportPhoto', label: 'Passport Photo',           nemisHeader: 'PHOTO',            severity: 'recommended', sources: ['avatar', 'photo', 'passportPhoto'], group: 'student' },
];

export const FIELD_BY_KEY: Record<string, NemisField> = Object.fromEntries(NEMIS_FIELDS.map(f => [f.key, f]));

export interface FieldStatus { key: string; label: string; value: string; status: 'ready' | 'warning' | 'missing'; severity: Severity; }
export interface StudentValidation {
    studentId: string;
    studentName: string;
    admissionNo: string;
    grade: string;
    class: string;
    fields: FieldStatus[];
    missingRequired: string[];   // labels
    missingRecommended: string[];
    score: number;               // 0-100
    ready: boolean;              // no required field missing
}

/** Validate a single student against the NEMIS field set. */
export function validateStudent(student: any): StudentValidation {
    const fields: FieldStatus[] = NEMIS_FIELDS.map(f => {
        const value = readField(student, f);
        const status: FieldStatus['status'] = value ? 'ready' : (f.severity === 'required' ? 'missing' : 'warning');
        return { key: f.key, label: f.label, value, status, severity: f.severity };
    });
    const missingRequired = fields.filter(f => f.status === 'missing').map(f => f.label);
    const missingRecommended = fields.filter(f => f.status === 'warning').map(f => f.label);
    const present = fields.filter(f => f.value).length;
    const score = Math.round((present / fields.length) * 100);
    return {
        studentId: String(student?._id || ''),
        studentName: readField(student, FIELD_BY_KEY.studentName) || 'Student',
        admissionNo: readField(student, FIELD_BY_KEY.admissionNo),
        grade: readField(student, FIELD_BY_KEY.grade),
        class: readField(student, FIELD_BY_KEY.class),
        fields,
        missingRequired,
        missingRecommended,
        score,
        ready: missingRequired.length === 0,
    };
}
