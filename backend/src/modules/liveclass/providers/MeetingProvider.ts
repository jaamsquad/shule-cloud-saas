/**
 * Meeting-provider strategy interface. Every provider (Jitsi, BigBlueButton, and
 * future Zoom/Meet/Teams) implements this, so the rest of the Live Classes module
 * never depends on a specific provider — the active one is chosen by config.
 */
export interface CreateMeetingInput {
    meetingId: string;          // our stable id for the live class
    title: string;
    moderatorName: string;
    record?: boolean;
    waitingRoom?: boolean;
    autoMute?: boolean;
    welcomeMessage?: string;
    durationMinutes?: number;
    password?: string;
}

export interface JoinMeetingInput {
    meetingId: string;
    displayName: string;
    role: 'moderator' | 'attendee';
    password?: string;
    avatar?: string;
    subjectName?: string;
}

export interface ProviderRecording {
    id: string;
    url: string;
    name?: string;
    durationSec?: number;
    createdAt?: Date | string;
    size?: number;
}

export interface MeetingProvider {
    readonly name: 'jitsi' | 'bigbluebutton';

    /** Prepare/create the room. Returns whatever metadata join() needs. */
    createMeeting(input: CreateMeetingInput): Promise<{ ok: boolean; meetingRef?: string; message?: string }>;

    /** Returns a fully-formed join URL (or the data the client needs to embed). */
    getJoinInfo(input: JoinMeetingInput): Promise<{ joinUrl?: string; embed?: 'jitsi'; roomName?: string; domain?: string; jwt?: string }>;

    endMeeting(meetingId: string): Promise<{ ok: boolean; message?: string }>;

    getStatus(meetingId: string): Promise<{ running: boolean; participants?: number }>;

    getRecordings(meetingId: string): Promise<ProviderRecording[]>;

    deleteRecording(recordingId: string): Promise<{ ok: boolean }>;

    /** Verify the provider's credentials/server are reachable. */
    testConnection(): Promise<{ ok: boolean; message: string }>;
}

/** Settings shape stored per-tenant in `meeting_settings`. */
export interface MeetingSettings {
    provider: 'jitsi' | 'bigbluebutton';
    allowTeacherOverride: boolean;
    // Jitsi
    jitsiDomain: string;
    jitsiRoomPrefix: string;
    jitsiEnablePassword: boolean;
    jitsiEnableLobby: boolean;
    jitsiEnableRecording: boolean;
    jitsiAppId?: string;            // optional JWT (8x8/JaaS or self-hosted)
    jitsiAppSecret?: string;
    // BigBlueButton
    bbbUrl: string;                 // e.g. https://bbb.example.com/bigbluebutton
    bbbSecret: string;
    bbbAllowRecording: boolean;
    bbbWelcome: string;
    bbbAutoMute: boolean;
    bbbLockViewers: boolean;
    bbbGuestAccess: boolean;
    // Shared
    recordingEnabled: boolean;
    attendanceEnabled: boolean;
    notifyEnabled: boolean;
}

export const DEFAULT_MEETING_SETTINGS: MeetingSettings = {
    provider: 'jitsi',
    allowTeacherOverride: false,
    jitsiDomain: 'meet.jit.si',
    jitsiRoomPrefix: 'ShuleCloud',
    jitsiEnablePassword: false,
    jitsiEnableLobby: true,
    jitsiEnableRecording: false,
    bbbUrl: '',
    bbbSecret: '',
    bbbAllowRecording: true,
    bbbWelcome: 'Welcome to your ShuleCloud live class!',
    bbbAutoMute: true,
    bbbLockViewers: false,
    bbbGuestAccess: false,
    recordingEnabled: false,
    attendanceEnabled: true,
    notifyEnabled: true,
};
