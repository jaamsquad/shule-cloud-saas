import { Db } from 'mongodb';
import { MeetingProvider, MeetingSettings, DEFAULT_MEETING_SETTINGS } from './MeetingProvider';
import { JitsiProvider } from './JitsiProvider';
import { BigBlueButtonProvider } from './BigBlueButtonProvider';

/** Load the tenant's live-meeting settings (merged with defaults). */
export async function getMeetingSettings(db: Db): Promise<MeetingSettings> {
    const s = await db.collection('meeting_settings').findOne({ _id: 'live' as any }).catch(() => null);
    return { ...DEFAULT_MEETING_SETTINGS, ...(s || {}) };
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
export async function resolveProvider(db: Db, override?: 'jitsi' | 'bigbluebutton') {
    const settings = await getMeetingSettings(db);
    return { settings, provider: buildProvider(settings, override) };
}
