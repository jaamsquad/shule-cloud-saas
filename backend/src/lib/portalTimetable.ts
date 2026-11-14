/**
 * Which timetable lessons a learner, parent or teacher sees in their portal.
 * Used by the /student-portal, /parent-portal and /staff-portal timetable routes.
 */
import { Db, ObjectId } from 'mongodb';

const isObjId = (v: any) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

/** Each id as a string and, when it is one, as an ObjectId (slots store either). */
export const idForms = (ids: any[]) => {
    const out: any[] = [];
    for (const v of ids) {
        if (v === null || v === undefined || v === '') continue;
        const str = String(v);
        out.push(str);
        if (isObjId(str)) out.push(new ObjectId(str));
    }
    return out;
};

/**
 * Slots can come from several timetables (drafts, last term's, the published one). Show
 * only one: the published timetable (newest first), else the active/current one, else the
 * one with the most lessons. Slots with no timetable id are kept as they are.
 */
export const onePublishedTimetable = async (db: Db, slots: any[]) => {
    const ids = [...new Set(slots.map(s => String(s.timetableId || '')).filter(Boolean))];
    if (ids.length <= 1) return slots;
    const tts: any[] = await db.collection('timetables').find({ _id: { $in: idForms(ids).filter(x => typeof x !== 'string') } }).toArray().catch(() => []);
    const when = (t: any) => new Date(t.updatedAt || t.publishedAt || t.createdAt || 0).getTime() || 0;
    const pick = (list: any[]) => list.sort((a, b) => when(b) - when(a))[0];
    const chosen = pick(tts.filter(t => /publish/i.test(String(t.status || ''))))
        || pick(tts.filter(t => t.isActive || t.isCurrent || /active|current/i.test(String(t.status || ''))));
    let keep = chosen ? String(chosen._id) : '';
    if (!keep) {
        const count: Record<string, number> = {};
        slots.forEach(s => { const k = String(s.timetableId || ''); if (k) count[k] = (count[k] || 0) + 1; });
        keep = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
    }
    return slots.filter(s => !s.timetableId || String(s.timetableId) === keep);
};

/**
 * Timetable filter for a learner's class: the class id saved on the learner AND every class
 * whose name matches their class ("GRADE 2 North" = level "GRADE 2" + stream "North"), in
 * both string and ObjectId form — so a learner still sees the timetable when their saved
 * class id is out of date or stored differently from the timetable's.
 */
export const studentClassSlotFilter = async (db: Db, student: any) => {
    const norm = (v: any) => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const name = norm(student?.studentClass || student?.currentClass || student?.className);
    const ids: any[] = [student?.classId];
    if (name) {
        const classes: any[] = await db.collection('classes').find({}).toArray().catch(() => []);
        for (const c of classes) {
            const combined = norm(`${c.levelName || ''}${c.streamName && c.streamName !== 'General' ? ' ' + c.streamName : ''}`);
            if ([combined, norm(c.name), norm(c.className)].includes(name)) ids.push(c._id);
        }
    }
    const forms = idForms(ids);
    const or: any[] = [];
    if (forms.length) or.push({ classId: { $in: forms } });
    if (name && student) or.push({ className: student.studentClass || student.currentClass || student.className });
    return or.length ? { $or: or } : { classId: '___none___' };
};
