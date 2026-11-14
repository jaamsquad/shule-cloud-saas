/**
 * Gates the owner-uploaded shared resource library (global_resources, meta DB — see
 * ownerLibrary.routes.ts) to the schools it's actually relevant to: a resource tagged with
 * a subject and/or class is only visible to a school that offers that subject AND has that
 * class/grade on file. An untagged field (no subject, or no class) means "every school".
 */
import { Db } from 'mongodb';
import { levelKey } from './examPublish';

const norm = (v: any) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

export interface SchoolScope { subjects: Set<string>; classLevels: Set<string> }

export async function schoolScope(db: Db): Promise<SchoolScope> {
    const [subjects, v2subjects, classes, v2classes] = await Promise.all([
        db.collection('subjects').find({}).toArray().catch(() => [] as any[]),
        db.collection('v2_subjects').find({ deletedAt: { $exists: false } }).toArray().catch(() => [] as any[]),
        db.collection('classes').find({}).toArray().catch(() => [] as any[]),
        db.collection('v2_classes').find({}).toArray().catch(() => [] as any[]),
    ]);
    const subjectNames = new Set<string>();
    [...subjects, ...v2subjects].forEach((s: any) => { const n = norm(s.name || s.subjectName); if (n) subjectNames.add(n); });
    const classLevels = new Set<string>();
    [...classes, ...v2classes].forEach((c: any) => { const n = levelKey(c.name || c.levelName); if (n) classLevels.add(n); });
    return { subjects: subjectNames, classLevels };
}

export const visibleToSchool = (r: any, scope: SchoolScope): boolean =>
    (!r.subjectName || scope.subjects.has(norm(r.subjectName))) && (!r.className || scope.classLevels.has(levelKey(r.className)));
