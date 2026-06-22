import crypto from 'crypto';
import { MeetingProvider, MeetingSettings, CreateMeetingInput, JoinMeetingInput, ProviderRecording } from './MeetingProvider';

/**
 * BigBlueButton provider. BBB's API is XML over HTTP, where each call is signed
 * with a SHA-1 checksum of `<apiCall><queryString><secret>`. We implement
 * create / join / end / getMeetingInfo / getRecordings / deleteRecordings.
 */
export class BigBlueButtonProvider implements MeetingProvider {
    readonly name = 'bigbluebutton' as const;
    constructor(private s: MeetingSettings) {}

    private base() { return (this.s.bbbUrl || '').replace(/\/$/, ''); }

    /** Build a signed BBB API URL. */
    private url(apiCall: string, params: Record<string, string | number | boolean>) {
        const query = Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join('&');
        const checksum = crypto.createHash('sha1').update(apiCall + query + this.s.bbbSecret).digest('hex');
        return `${this.base()}/api/${apiCall}?${query}&checksum=${checksum}`;
    }

    private async call(apiCall: string, params: Record<string, string | number | boolean>): Promise<any> {
        const resp = await fetch(this.url(apiCall, params));
        const text = await resp.text();
        return this.parseXml(text);
    }

    // Minimal XML parsing — pull tag values without a heavy dependency.
    private parseXml(xml: string): Record<string, any> {
        const out: Record<string, any> = {};
        const re = /<(\w+)>([\s\S]*?)<\/\1>/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(xml)) !== null) {
            const [, tag, val] = m;
            if (/<\w+>/.test(val)) {
                (out[tag] ||= []).push(this.parseXml(val));
            } else {
                out[tag] = val.trim();
            }
        }
        return out;
    }

    async createMeeting(input: CreateMeetingInput) {
        if (!this.base() || !this.s.bbbSecret) return { ok: false, message: 'BigBlueButton server URL and secret are not configured.' };
        const res = await this.call('create', {
            name: input.title,
            meetingID: input.meetingId,
            attendeePW: input.password || 'ap-' + input.meetingId,
            moderatorPW: 'mp-' + input.meetingId,
            welcome: input.welcomeMessage || this.s.bbbWelcome,
            record: String(!!(input.record && this.s.bbbAllowRecording)),
            autoStartRecording: 'false',
            allowStartStopRecording: 'true',
            muteOnStart: String(input.autoMute ?? this.s.bbbAutoMute),
            lockSettingsDisableCam: 'false',
            guestPolicy: this.s.bbbGuestAccess ? 'ALWAYS_ACCEPT' : 'ALWAYS_DENY',
            duration: input.durationMinutes || 0,
        }).catch((e) => ({ returncode: 'FAILED', message: e.message }));
        const ok = res.returncode === 'SUCCESS' || res.messageKey === 'idNotUnique'; // already created = fine
        return { ok, meetingRef: input.meetingId, message: ok ? undefined : (res.message || 'BBB create failed') };
    }

    async getJoinInfo(input: JoinMeetingInput) {
        const pw = input.role === 'moderator' ? 'mp-' + input.meetingId : (input.password || 'ap-' + input.meetingId);
        const joinUrl = this.url('join', {
            fullName: input.displayName,
            meetingID: input.meetingId,
            password: pw,
            redirect: 'true',
            role: input.role === 'moderator' ? 'MODERATOR' : 'VIEWER',
        });
        return { joinUrl };
    }

    async endMeeting(meetingId: string) {
        const res = await this.call('end', { meetingID: meetingId, password: 'mp-' + meetingId }).catch(() => ({ returncode: 'FAILED' }));
        return { ok: res.returncode === 'SUCCESS' };
    }

    async getStatus(meetingId: string) {
        const res = await this.call('getMeetingInfo', { meetingID: meetingId, password: 'mp-' + meetingId }).catch(() => ({}));
        const running = res.running === 'true';
        return { running, participants: Number(res.participantCount || 0) };
    }

    async getRecordings(meetingId: string): Promise<ProviderRecording[]> {
        const res = await this.call('getRecordings', { meetingID: meetingId }).catch(() => ({}));
        const recs = res.recordings?.[0]?.recording || [];
        const list = Array.isArray(recs) ? recs : [recs];
        return list.filter(Boolean).map((r: any) => {
            const playback = r.playback?.[0]?.format;
            const fmt = Array.isArray(playback) ? playback[0] : playback;
            return {
                id: r.recordID || '',
                url: fmt?.url || '',
                name: r.name || 'Recording',
                durationSec: Number(fmt?.length || 0) * 60,
                createdAt: r.startTime ? new Date(Number(r.startTime)) : undefined,
            } as ProviderRecording;
        });
    }

    async deleteRecording(recordingId: string) {
        const res = await this.call('deleteRecordings', { recordID: recordingId }).catch(() => ({ returncode: 'FAILED' }));
        return { ok: res.returncode === 'SUCCESS' };
    }

    async testConnection() {
        if (!this.base() || !this.s.bbbSecret) return { ok: false, message: 'Enter the BBB server URL and secret first.' };
        try {
            const res = await this.call('getMeetings', {});
            return res.returncode === 'SUCCESS'
                ? { ok: true, message: 'BigBlueButton connected successfully.' }
                : { ok: false, message: res.message || 'BBB rejected the request — check the secret.' };
        } catch (e: any) {
            return { ok: false, message: `Could not reach the BBB server: ${e.message}` };
        }
    }
}
