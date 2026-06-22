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
        const baseRoom = this.roomName(input.meetingId);
        const hasJaas = !!(this.s.jitsiAppId && this.s.jitsiAppSecret);
        // 8x8 JaaS authenticates rooms (no 5-min limit). Its App IDs look like
        // "vpaas-magic-cookie-xxxx"; rooms must be prefixed with the App ID and
        // the host is 8x8.vc. A self-hosted token-Jitsi keeps its own domain.
        const isJaas = hasJaas && /^vpaas-/.test(this.s.jitsiAppId!);
        const domain = isJaas ? '8x8.vc' : (this.s.jitsiDomain || 'meet.jit.si');
        const room = isJaas ? `${this.s.jitsiAppId}/${baseRoom}` : baseRoom;

        let token: string | undefined;
        if (hasJaas) {
            const now = Math.floor(Date.now() / 1000);
            token = jwt.sign(
                {
                    aud: 'jitsi',
                    iss: 'chat',
                    sub: isJaas ? this.s.jitsiAppId : domain,
                    room: '*',
                    nbf: now - 10,
                    exp: now + 3 * 3600,
                    context: {
                        user: {
                            id: input.displayName, name: input.displayName, avatar: input.avatar || '',
                            email: '', moderator: input.role === 'moderator',
                        },
                        features: {
                            recording: this.s.jitsiEnableRecording, livestreaming: false,
                            transcription: false, 'outbound-call': false,
                        },
                    },
                },
                this.s.jitsiAppSecret!,
                isJaas ? { algorithm: 'RS256', header: { kid: this.s.jitsiAppId! } as any } : { algorithm: 'HS256' },
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
