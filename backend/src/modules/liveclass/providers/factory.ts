import { Db } from 'mongodb';
import { getMetaDb } from '../../../lib/mongodb';
import { MeetingProvider, MeetingSettings, DEFAULT_MEETING_SETTINGS } from './MeetingProvider';
import { JitsiProvider } from './JitsiProvider';
import { BigBlueButtonProvider } from './BigBlueButtonProvider';

export interface ResolveContext {
    /** Per-school namespace so rooms never collide across tenants (the subdomain). */
    tenantNs?: string;
}

/**
 * The platform-wide Jitsi/JaaS account, configured once by the super owner and
 * shared by every school. Stored in the meta DB. These credentials are LOCKED —
 * they always override any per-tenant Jitsi credentials, so schools can't (and
 * needn't) supply their own. Room isolation is achieved by namespacing rooms
 * with the tenant subdomain, not by separate accounts.
 */
export interface PlatformMeetingSettings {
    jitsiEnabled?: boolean;
    jitsiDomain?: string;       // usually 8x8.vc for JaaS, or a self-hosted host
    jitsiAppId?: string;        // vpaas-magic-cookie-…
    jitsiKeyId?: string;        // the part after "/" in the API key name
    jitsiAppSecret?: string;    // RSA private key (PEM)
}

export async function getPlatformMeetingSettings(): Promise<PlatformMeetingSettings> {
    try {
        const s = await getMetaDb().collection('platform_meeting_settings').findOne({ key: 'jitsi' as any });
        return (s as any) || {};
    } catch { return {}; }
}

/**
 * Load the effective live-meeting settings for a tenant. Tenant settings cover
 * room prefix / toggles / BBB; the Jitsi credentials are injected from the
 * locked platform account. `tenantNs` namespaces the room per school.
 */
export async function getMeetingSettings(db: Db, ctx: ResolveContext = {}): Promise<MeetingSettings> {
    const [tenant, platform] = await Promise.all([
        db.collection('meeting_settings').findOne({ _id: 'live' as any }).catch(() => null),
        getPlatformMeetingSettings(),
    ]);
    const merged: MeetingSettings = { ...DEFAULT_MEETING_SETTINGS, ...(tenant || {}) };
    // Locked platform Jitsi credentials win over anything the tenant stored.
    if (platform.jitsiEnabled && platform.jitsiAppId && platform.jitsiAppSecret) {
        merged.jitsiAppId = platform.jitsiAppId;
        merged.jitsiKeyId = platform.jitsiKeyId;
        merged.jitsiAppSecret = platform.jitsiAppSecret;
        if (platform.jitsiDomain) merged.jitsiDomain = platform.jitsiDomain;
    } else {
        // No platform JaaS configured → ensure tenants can't use stale creds.
        merged.jitsiAppId = undefined;
        merged.jitsiKeyId = undefined;
        merged.jitsiAppSecret = undefined;
    }
    merged.tenantNs = ctx.tenantNs;
    return merged;
}

/** Build the active provider strategy. `override` lets a teacher pick when allowed. */
export function buildProvider(settings: MeetingSettings, override?: 'jitsi' | 'bigbluebutton'): MeetingProvider {
    const chosen = (settings.allowTeacherOverride && override) ? override : settings.provider;
    switch (chosen) {
        case 'bigbluebutton': return new BigBlueButtonProvider(settings);
        case 'jitsi':
        default: return new JitsiProvider(settings);
    }
}

/** Convenience: resolve settings + provider for a tenant DB in one call. */
export async function resolveProvider(db: Db, override?: 'jitsi' | 'bigbluebutton', ctx: ResolveContext = {}) {
    const settings = await getMeetingSettings(db, ctx);
    return { settings, provider: buildProvider(settings, override) };
}
