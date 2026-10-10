/**
 * Student sign-outs (Front Desk → Student Sign Out) in the attendance registers.
 *
 * A student signed out on a date shows in that day's class register and subject/lesson
 * registers as "Excused (reason)": students not yet marked are pre-filled with Excused and the
 * sign-out reason; a status a teacher already saved is never changed.
 * A lesson register with a known time only counts if the lesson ends after the student left.
 */
import { Db } from 'mongodb';

export interface SignoutInfo { id: string; reason: string; timeOut: string; pickedBy: string }

const hhmm = (v: any) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(v || '').trim()); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''; };

/** The day's sign-outs for these students (earliest one per student). */
export async function signoutsOn(db: Db, date: string, studentIds: string[]): Promise<Map<string, SignoutInfo>> {
    const out = new Map<string, SignoutInfo>();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !studentIds.length) return out;
    const rows: any[] = await db.collection('student_signouts')
        .find({ date, studentId: { $in: studentIds.map(String) } })
        .toArray().catch(() => []);
    for (const r of rows) {
        const info: SignoutInfo = { id: String(r._id), reason: String(r.reason || '').trim(), timeOut: hhmm(r.timeOut), pickedBy: String(r.parentName || '').trim() };
        const prev = out.get(String(r.studentId));
        if (!prev || (info.timeOut && (!prev.timeOut || info.timeOut < prev.timeOut))) out.set(String(r.studentId), info);
    }
    return out;
}

/** Whether a sign-out affects a register. No lesson time (daily/subject register) → it does. */
export function affectsLesson(s: SignoutInfo, lessonEnd?: string | null): boolean {
    const end = hhmm(lessonEnd);
    if (!end || !s.timeOut) return true;
    return end > s.timeOut;
}

export const excusedLabel = (s: SignoutInfo) => `Excused (${s.reason || 'signed out'})`;
