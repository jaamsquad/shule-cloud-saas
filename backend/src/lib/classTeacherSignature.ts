/**
 * A class's own homeroom/class teacher can have their signature printed on that class's
 * report cards, alongside the principal's. The signature image lives on the staff record
 * (`staff.signature`, set from Employees → <teacher> → Signature) and the class→teacher
 * link is `classes.classTeacherId` (set via Classes & Streams). Matched defensively since
 * `classTeacherId` can be stored as either a string or an ObjectId.
 */
import { Db, ObjectId } from 'mongodb';

export async function classTeacherSignatureFor(db: Db, className: string): Promise<string | null> {
    if (!className) return null;
    try {
        const cls: any = await db.collection('classes').findOne({ $or: [{ levelName: className }, { name: className }, { className }] });
        const teacherId = cls?.classTeacherId;
        if (!teacherId) return null;
        let oid: ObjectId | null = null;
        try { oid = new ObjectId(String(teacherId)); } catch { /* not an ObjectId string */ }
        const staff: any = await db.collection('staff').findOne({ $or: [{ _id: teacherId }, ...(oid ? [{ _id: oid }] : [])] }).catch(() => null);
        return staff?.signature || null;
    } catch { return null; }
}
