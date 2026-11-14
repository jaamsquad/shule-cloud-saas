import { randomInt } from 'crypto';
import { Db } from 'mongodb';

/**
 * ShuleCloud School ID — the public code a school's teachers, parents,
 * students and drivers type into the mobile apps to pick their school.
 *
 * Format: "S" + 5 random digits, e.g. S48291. Stored on the meta-DB
 * Tenant as `shulecloudId` and unique across all schools.
 */
export const SCHOOL_ID_PATTERN = /^S\d{5}$/;

/** Normalise user input ("s48291", " S48291 ") to the stored form. */
export const normalizeSchoolId = (raw: string): string => raw.trim().toUpperCase();

export const isSchoolId = (raw: string): boolean => SCHOOL_ID_PATTERN.test(normalizeSchoolId(raw));

const randomSchoolId = (): string => `S${String(randomInt(0, 100_000)).padStart(5, '0')}`;

/** A School ID no other Tenant uses yet. */
export async function generateUniqueSchoolId(metaDb: Db): Promise<string> {
    for (let i = 0; i < 25; i++) {
        const id = randomSchoolId();
        if (!(await metaDb.collection('Tenant').findOne({ shulecloudId: id }, { projection: { _id: 1 } }))) return id;
    }
    throw new Error('Could not allocate a unique School ID');
}

/**
 * Give every existing school a School ID (run once at startup). Each update is
 * conditional on the field still matching what we read, so concurrent runs can't
 * overwrite an ID that was already handed out. Also re-issues any ID left over from
 * the old "A######M" format so every school ends up on the current S##### format.
 */
export async function backfillSchoolIds(metaDb: Db): Promise<number> {
    await metaDb.collection('Tenant').createIndex(
        { shulecloudId: 1 },
        { unique: true, partialFilterExpression: { shulecloudId: { $type: 'string' } } },
    );
    const needsId = await metaDb.collection('Tenant')
        .find({ $or: [{ shulecloudId: { $exists: false } }, { shulecloudId: null }, { shulecloudId: { $not: SCHOOL_ID_PATTERN } }] }, { projection: { _id: 1, shulecloudId: 1 } })
        .toArray();
    let assigned = 0;
    for (const t of needsId) {
        const id = await generateUniqueSchoolId(metaDb);
        const r = await metaDb.collection('Tenant').updateOne(
            { _id: t._id, shulecloudId: t.shulecloudId ?? null },
            { $set: { shulecloudId: id } },
        );
        assigned += r.modifiedCount;
    }
    return assigned;
}
