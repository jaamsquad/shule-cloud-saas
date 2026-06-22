import jwt from 'jsonwebtoken';
import { MeetingProvider, MeetingSettings, CreateMeetingInput, JoinMeetingInput, ProviderRecording } from './MeetingProvider';

/**
 * Jitsi Meet provider. Rooms are created implicitly on join, so createMeeting is
 * a no-op success. Join returns embed data (the client mounts the Jitsi iframe).
 * Optional JWT is issued when an App ID/Secret is configured (JaaS or a
 * self-hosted token-protected Jitsi). Recordings via the public meet.jit.si are
 * not API-retrievable, so those come from teacher uploads in the module.
 */
export class JitsiProvider implements MeetingProvider {
    readonly name = 'jitsi' as const;
    constructor(private s: MeetingSettings) {}

    private roomName(meetingId: string) {
        return `${this.s.jitsiRoomPrefix || 'ShuleCloud'}-${meetingId}`.replace(/[^a-zA-Z0-9-]/g, '');
    }

    async createMeeting(_input: CreateMeetingInput) {
        return { ok: true, meetingRef: this.roomName(_input.meetingId) };
    }

    async getJoinInfo(input: JoinMeetingInput) {
        const room = this.roomName(input.meetingId);
        const domain = this.s.jitsiDomain || 'meet.jit.si';
        let token: string | undefined;
        if (this.s.jitsiAppId && this.s.jitsiAppSecret) {
            // JWT for token-protected Jitsi (moderators get moderator: true).
            token = jwt.sign(
                {
                    aud: 'jitsi', iss: this.s.jitsiAppId, sub: domain, room: '*',
                    exp: Math.floor(Date.now() / 1000) + 3 * 3600,
                    context: {
                        user: { name: input.displayName, avatar: input.avatar || '', moderator: input.role === 'moderator' },
                        features: { recording: this.s.jitsiEnableRecording, livestreaming: false },
                    },
                },
                this.s.jitsiAppSecret,
            );
        }
        return { embed: 'jitsi' as const, roomName: room, domain, jwt: token };
    }

    async endMeeting(_meetingId: string) { return { ok: true }; }

    async getStatus(_meetingId: string) { return { running: false }; }

    async getRecordings(_meetingId: string): Promise<ProviderRecording[]> { return []; }

    async deleteRecording(_recordingId: string) { return { ok: true }; }

    async testConnection() {
        const domain = this.s.jitsiDomain || 'meet.jit.si';
        try {
            // A reachable Jitsi serves the external_api.js script.
            const r = await fetch(`https://${domain}/external_api.js`, { method: 'HEAD' });
            return r.ok
                ? { ok: true, message: `Jitsi reachable at ${domain}.` }
                : { ok: false, message: `Jitsi at ${domain} returned HTTP ${r.status}.` };
        } catch (e: any) {
            return { ok: false, message: `Could not reach ${domain}: ${e.message}` };
        }
    }
}
