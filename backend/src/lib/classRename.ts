/**
 * The class name is copied into other records ("Form 1 East" on a stream, "studentClass" on every student, the class
 * on generated report cards …). When a class or stream is renamed, this carries the new name to those copies, so the
 * streams, students and reports keep following the class instead of keeping the old name.
 *
 * Only a value that IS the old name (ignoring case and spacing) is changed — anything else is left alone.
 */
import { Db, ObjectId } from 'mongodb';

const escRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = (s: string) => new RegExp(`^\\s*${escRx(s.trim()).replace(/\s+/g, '\\s+')}\\s*$`, 'i');

// collection → the fields that hold a class label
const TEXT_FIELDS: Record<string, string[]> = {
    students: ['studentClass', 'currentClass', 'className', 'class'],
    classes: ['name', 'levelName', 'className'],
    report_card_generations: ['className'],
    exams: ['className', 'class'],
    exam_marks: ['className'],
    invoices: ['class_name'],
    student_enrollments: ['className', 'studentClass'],
    enrollments: ['className', 'studentClass'],
};

/** Rename every class label equal to `from` into `to`. Returns how many records changed. */
export async function renameClassText(db: Db, from: string, to: string): Promise<number> {
    if (!from.trim() || !to.trim() || from.trim().toLowerCase() === to.trim().toLowerCase() && from.trim() === to.trim()) return 0;
    let changed = 0;
    for (const [coll, fields] of Object.entries(TEXT_FIELDS)) {
        for (const f of fields) {
            try {
                const r = await db.collection(coll).updateMany({ [f]: exact(from) }, { $set: { [f]: to.trim() } });
                changed += r.modifiedCount || 0;
            } catch { /* a collection this school doesn't have */ }
        }
    }
    return changed;
}

/** A class was renamed: its streams ("Form 1 East"), and every copy of the old name, follow it. */
export async function cascadeClassRename(db: Db, classId: string, oldName: string, newName: string) {
    if (!oldName || !newName || oldName.trim() === newName.trim()) return { streams: 0, records: 0 };
    const ids: any[] = [classId]; try { ids.push(new ObjectId(classId)); } catch { /* not an ObjectId */ }
    const streams: any[] = await db.collection('v2_streams').find({ classId: { $in: ids } }).toArray().catch(() => []);
    let records = 0;
    // streams first: "Form 1 East" → "Grade 1 East" (before the plain class name, which is a prefix of it)
    for (const s of streams) {
        records += await renameClassText(db, `${oldName} ${s.name}`, `${newName} ${s.name}`);
        await db.collection('v2_streams').updateOne({ _id: s._id }, { $set: { className: newName.trim(), fullName: `${newName.trim()} ${s.name}` } });
    }
    records += await renameClassText(db, oldName, newName);
    // the class's learners keep pointing at it by id; make sure their class label matches too
    await db.collection('students').updateMany({ classId: { $in: ids }, $or: [{ streamId: { $exists: false } }, { streamId: null }, { streamId: '' }] }, { $set: { className: newName.trim() } }).catch(() => {});
    return { streams: streams.length, records };
}

/** A stream was renamed (East → Blue): "Form 1 East" becomes "Form 1 Blue" everywhere it was copied. */
export async function cascadeStreamRename(db: Db, stream: any, newName: string) {
    const oldFull = String(stream.fullName || `${stream.className || ''} ${stream.name}`).trim();
    const newFull = `${stream.className || ''} ${newName}`.trim();
    if (!stream.name || stream.name === newName) return { records: 0 };
    const records = await renameClassText(db, oldFull, newFull);
    const sid = String(stream._id);
    await db.collection('students').updateMany({ streamId: sid }, { $set: { stream: newName, streamName: newName } }).catch(() => {});
    return { records };
}

/**
 * Repair for a class that was renamed before names followed it: a stream still called "Form 1 East" under a class now
 * named "Grade 1" is brought in line ("Grade 1 East"), and so are its learners' class labels and the reports.
 */
export async function healStreamNames(db: Db): Promise<number> {
    const classes: any[] = await db.collection('v2_classes').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
    const byId = new Map(classes.map(c => [String(c._id), c]));
    const streams: any[] = await db.collection('v2_streams').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
    let fixed = 0;
    const classText = new Map<string, string>();     // old class label → current class name
    for (const s of streams) {
        const c = byId.get(String(s.classId));
        if (!c?.name) continue;
        const full = `${c.name} ${s.name}`;
        if (s.className === c.name && s.fullName === full) continue;
        if (s.fullName && s.fullName !== full) await renameClassText(db, s.fullName, full);
        if (s.className && s.className !== c.name) classText.set(s.className, c.name);
        await db.collection('v2_streams').updateOne({ _id: s._id }, { $set: { className: c.name, fullName: full } });
        await db.collection('students').updateMany({ streamId: String(s._id) }, { $set: { className: c.name, studentClass: full } }).catch(() => {});
        fixed++;
    }
    for (const [from, to] of classText) await renameClassText(db, from, to);
    return fixed;
}
