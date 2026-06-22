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
        // Namespace every room with the tenant (subdomain) so two schools sharing
        // the platform JaaS account can never land in the same room, even if their
        // meetingIds collide. e.g. "acme-ShuleCloud-LCxxxx".
        const ns = (this.s.tenantNs || '').replace(/[^a-zA-Z0-9-]/g, '');
        const prefix = this.s.jitsiRoomPrefix || 'ShuleCloud';
        return `${ns ? ns + '-' : ''}${prefix}-${meetingId}`.replace(/[^a-zA-Z0-9-]/g, '');
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
            const isMod = input.role === 'moderator';
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
                            id: input.userId || `sc-${Buffer.from(input.displayName).toString('hex').slice(0, 16)}`,
                            name: input.displayName,
                            avatar: input.avatar || '',
                            email: input.email || '',
                            // JaaS expects this as the string "true"/"false".
                            moderator: isMod ? 'true' : 'false',
                            'hidden-from-recorder': false,
                        },
                        features: {
                            // Only moderators get privileged features; students can't record/stream.
                            recording: isMod && this.s.jitsiEnableRecording,
                            livestreaming: false,
                            transcription: false,
                            'outbound-call': false,
                        },
                    },
                },
                this.s.jitsiAppSecret!,
                // For JaaS the `kid` is "<AppID>/<KeyID>" — the Key ID identifies
                // which of your RSA keys signed this token. Without it 8x8 can't
                // find the public key and rejects the JWT.
                isJaas
                    ? { algorithm: 'RS256', header: { kid: `${this.s.jitsiAppId}/${this.s.jitsiKeyId || ''}` } as any }
                    : { algorithm: 'HS256' },
            );
        }
        // JaaS requires its external_api.js to be loaded from the per-App-ID path,
        // not the generic 8x8.vc one, or JitsiMeetExternalAPI won't initialise.
        const scriptUrl = isJaas
            ? `https://8x8.vc/${this.s.jitsiAppId}/external_api.js`
            : `https://${domain}/external_api.js`;
        return { embed: 'jitsi' as const, roomName: room, domain, jwt: token, scriptUrl, appId: isJaas ? this.s.jitsiAppId : undefined };
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
