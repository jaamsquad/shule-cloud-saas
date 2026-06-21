import * as Battery from "expo-battery";
import { api, Job } from "./api";
import { Session } from "./config";
import { sendSms } from "./smsSender";

/**
 * The send loop: claim a batch of jobs, send each through the SIM with pacing,
 * and report status back. Designed to be called repeatedly (on socket push,
 * on a timer, and on background fetch).
 */
let running = false;

export type WorkerEvents = {
  onProgress?: (info: { sent: number; failed: number; remaining: number }) => void;
  onLog?: (line: string) => void;
};

export async function runOnce(session: Session, ev: WorkerEvents = {}): Promise<number> {
  if (running) return 0;
  running = true;
  let processed = 0;
  try {
    const { jobs, pacingMs } = await api.jobs(session, 20);
    if (!jobs.length) return 0;
    let sent = 0, failed = 0;
    const updates: { jobId: string; status: string; error?: string }[] = [];

    for (const job of jobs as Job[]) {
      try {
        await sendSms(job.phone, job.message);
        updates.push({ jobId: job._id, status: "sent" });
        sent++;
        ev.onLog?.(`Sent → ${job.phone}`);
      } catch (e: any) {
        updates.push({ jobId: job._id, status: "failed", error: String(e?.message || e) });
        failed++;
        ev.onLog?.(`Failed → ${job.phone}: ${e?.message || e}`);
      }
      processed++;
      ev.onProgress?.({ sent, failed, remaining: jobs.length - processed });
      // Pace between messages to respect carrier throttling.
      if (processed < jobs.length) await new Promise(r => setTimeout(r, Math.max(500, pacingMs || 2500)));
    }

    // Report results in one call (retry once on failure).
    try { await api.update(session, updates); }
    catch { await new Promise(r => setTimeout(r, 2000)); await api.update(session, updates).catch(() => { }); }

    return processed;
  } finally {
    running = false;
  }
}

/** Send a heartbeat with current battery/network so the dashboard shows status. */
export async function heartbeat(session: Session) {
  let battery: number | undefined;
  try { battery = Math.round((await Battery.getBatteryLevelAsync()) * 100); } catch { /* ignore */ }
  await api.heartbeat(session, { battery, network: "mobile", sim: session.subdomain }).catch(() => { });
}
