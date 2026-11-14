/**
 * A single-gender school (School Profile → Gender Type: Boys / Girls only) only admits
 * students of that gender — the opposite gender is rejected at creation/import time.
 */
import { ObjectId } from 'mongodb';
import { getMetaDb } from './mongodb';

export const isGirl = (g: any) => /^(f|female|girl)/i.test(String(g || ''));
export const isBoy = (g: any) => /^(m|male|boy)/i.test(String(g || ''));

const cache = new Map<string, { at: number; genderComposition: string }>();

/** 'Boys' | 'Girls' | 'Mixed' | '' (unset → no restriction) for this tenant, cached briefly. */
export async function genderCompositionFor(tenantId?: string | null): Promise<string> {
    if (!tenantId) return '';
    const hit = cache.get(tenantId);
    if (hit && Date.now() - hit.at < 30_000) return hit.genderComposition;
    let genderComposition = '';
    try {
        const t: any = await getMetaDb().collection('Tenant').findOne({ _id: new ObjectId(tenantId) }, { projection: { genderComposition: 1 } });
        genderComposition = String(t?.genderComposition || '');
    } catch { /* treat as unrestricted */ }
    cache.set(tenantId, { at: Date.now(), genderComposition });
    return genderComposition;
}
export const forgetGenderComposition = (tenantId: string) => cache.delete(tenantId);

/** null when allowed, else the rejection message. */
export function genderViolation(genderComposition: string, studentGender: any): string | null {
    if (genderComposition === 'Boys' && isGirl(studentGender)) return 'This school admits boys only.';
    if (genderComposition === 'Girls' && isBoy(studentGender)) return 'This school admits girls only.';
    return null;
}
