/**
 * Student lifecycle status (Active / Transferred / Graduated).
 *
 * Class membership lives directly on the student (classId / studentClass / stream…),
 * so a Transferred or Graduated student is taken OUT of their class by clearing those
 * fields — every class roster, attendance sheet and marks list then drops them with no
 * per-query filtering. The class they left is kept in `classHistory` and `statusPrevClass`,
 * so the record still shows where they were, and setting them back to Active restores it.
 */
export const STUDENT_STATUSES = ['Active', 'Transferred', 'Graduated'];
export const STUDENT_CLASS_FIELDS = ['classId', 'className', 'studentClass', 'currentClass', 'streamId', 'stream', 'streamName'];

export const hasClassFields = (student: any) => STUDENT_CLASS_FIELDS.some(f => student?.[f]);

/** 'transferred' / 'TRANSFERRED' → 'Transferred' (records written by older code used lower case). */
export const canonicalStatus = (raw: any): string =>
    STUDENT_STATUSES.find(s => s.toLowerCase() === String(raw || 'Active').toLowerCase()) || 'Active';

/**
 * The Mongo update that moves `student` to `status`. `nothingToDo` is true when they are
 * already there AND already out of their class (so callers can answer "already X").
 * A student already marked Transferred/Graduated who still sits in a class (older records)
 * is repaired: the class is cleared and remembered.
 */
export function buildStatusUpdate(
    student: any, status: string,
    opts: { reason?: string; by?: string; extraSet?: any } = {},
): { update: any; nothingToDo: boolean } {
    const now = new Date();
    const from = canonicalStatus(student.status);
    const reason = String(opts.reason || '').trim();
    const leavingClass = status !== 'Active' && hasClassFields(student);
    if (from === status && !leavingClass && !opts.extraSet) return { update: null, nothingToDo: true };

    const set: any = { status, statusChangedAt: now, statusReason: reason, updatedAt: now, ...(opts.extraSet || {}) };
    const update: any = { $set: set, $push: {} as any };
    if (from !== status) update.$push.statusHistory = { from, to: status, reason, at: now, by: opts.by || 'admin' };

    if (status === 'Active') {
        // Back into the class they left — unless they've been placed in a new one since.
        const prev = student.statusPrevClass;
        if (prev && !hasClassFields(student)) Object.assign(set, prev);
        update.$unset = { statusPrevClass: '', transfer: '' };   // back at school: no transfer any more
    } else if (leavingClass) {
        const prev: any = {};
        for (const f of STUDENT_CLASS_FIELDS) if (student[f] !== undefined) prev[f] = student[f];
        set.statusPrevClass = prev;
        for (const f of STUDENT_CLASS_FIELDS) set[f] = f === 'streamId' ? null : '';
        update.$push.classHistory = {
            className: student.studentClass || student.currentClass || '', classId: student.classId || '',
            streamId: student.streamId || '', streamName: student.stream || student.streamName || '',
            academicYear: student.academicYear || '', leftAt: now, reason: status,
        };
    }
    if (!Object.keys(update.$push).length) delete update.$push;
    return { update, nothingToDo: false };
}

/** Next reference number for a transfer letter: TL/2026/001 (per calendar year, never repeats). */
export async function nextTransferRef(db: any): Promise<string> {
    const year = new Date().getFullYear();
    const doc: any = await db.collection('letter_counters').findOneAndUpdate(
        { _id: `transfer:${year}` }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' },
    );
    return `TL/${year}/${String(doc?.seq || 1).padStart(3, '0')}`;
}
