import { API_BASE, Session } from "./config";

/**
 * Thin fetch wrapper. Every request carries the tenant subdomain header so the
 * backend resolves the right school DB, plus the device token for the mobile
 * endpoints.
 */
function headers(session: Pick<Session, "subdomain" | "token">, json = true) {
  const h: Record<string, string> = { "x-tenant-subdomain": session.subdomain };
  if (json) h["Content-Type"] = "application/json";
  if (session.token) h["x-device-token"] = session.token;
  return h;
}

async function req(path: string, opts: RequestInit) {
  const r = await fetch(`${API_BASE}${path}`, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || `Request failed (${r.status})`);
  return data;
}

export type Job = { _id: string; phone: string; message: string };

export const api = {
  // Pair the device using a code generated in the school portal.
  register: (subdomain: string, body: {
    pairingCode: string; deviceName?: string; imei?: string;
    simOperator?: string; phone?: string;
  }) =>
    req("/mobile/register", {
      method: "POST",
      headers: { "x-tenant-subdomain": subdomain, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as Promise<{ ok: boolean; token: string; deviceId: string; school: string }>,

  heartbeat: (s: Session, body: { battery?: number; network?: string; sim?: string; signal?: number }) =>
    req("/mobile/heartbeat", { method: "POST", headers: headers(s), body: JSON.stringify(body) }),

  jobs: (s: Session, limit = 20) =>
    req(`/mobile/jobs?limit=${limit}`, { method: "GET", headers: headers(s, false) }) as Promise<{ jobs: Job[]; pacingMs: number }>,

  update: (s: Session, updates: { jobId: string; status: string; error?: string }[]) =>
    req("/mobile/update", { method: "POST", headers: headers(s), body: JSON.stringify({ updates }) }),
};
