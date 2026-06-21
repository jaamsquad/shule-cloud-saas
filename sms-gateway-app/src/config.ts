import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Where the school's ShuleCloud backend lives. The app talks to the same API as
 * the web app. For a school on `egerton.shulecloud.com`, the API base is
 * `https://api.shulecloud.com/api/v1` and the tenant is identified by the
 * subdomain header `x-tenant-subdomain: egerton`.
 *
 * Override API_BASE for self-hosted/on-prem deployments.
 */
export const API_BASE = "https://api.shulecloud.com/api/v1";
export const SOCKET_URL = "https://api.shulecloud.com";   // /sms namespace

export type Session = {
  subdomain: string;   // e.g. "egerton"
  token: string;       // device token from pairing
  deviceId: string;
  schoolId: string;
};

const KEY = "shulecloud_sms_session";

export async function saveSession(s: Session) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}
export async function loadSession(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}
export async function clearSession() {
  await AsyncStorage.removeItem(KEY);
}
