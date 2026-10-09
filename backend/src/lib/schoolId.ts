import { randomInt } from 'crypto';
import { Db } from 'mongodb';

/**
 * ShuleCloud School ID — the public code a school's teachers, parents,
 * students and drivers type into the mobile apps to pick their school.
 *
 * Format: "A" + 6 random digits + "M", e.g. A482917M. Stored on the meta-DB
 * Tenant as `shulecloudId` and unique across all schools.
 */
export const SCHOOL_ID_PATTERN = /^A\d{6}M$/;

/** Normalise user input ("a482917m", " A482917M ") to the stored form. */
export const normalizeSchoolId = (raw: string): string => raw.trim().toUpperCase();

export const isSchoolId = (raw: string): boolean => SCHOOL_ID_PATTERN.test(normalizeSchoolId(raw));

const randomSchoolId = (): string => `A${String(randomInt(0, 1_000_000)).padStart(6, '0')}M`;

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
 * conditional on the field still being unset, so concurrent runs can't
 * overwrite an ID that was already handed out.
 */
export async function backfillSchoolIds(metaDb: Db): Promise<number> {
    await metaDb.collection('Tenant').createIndex(
        { shulecloudId: 1 },
        { unique: true, partialFilterExpression: { shulecloudId: { $type: 'string' } } },
    );
    const missing = await metaDb.collection('Tenant')
        .find({ $or: [{ shulecloudId: { $exists: false } }, { shulecloudId: null }] }, { projection: { _id: 1 } })
        .toArray();
    let assigned = 0;
    for (const t of missing) {
        const id = await generateUniqueSchoolId(metaDb);
        const r = await metaDb.collection('Tenant').updateOne(
            { _id: t._id, $or: [{ shulecloudId: { $exists: false } }, { shulecloudId: null }] },
            { $set: { shulecloudId: id } },
        );
        assigned += r.modifiedCount;
    }
    return assigned;
}
