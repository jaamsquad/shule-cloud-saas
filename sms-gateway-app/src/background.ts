import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { loadSession } from "./config";
import { runOnce, heartbeat } from "./worker";

export const SMS_TASK = "shulecloud-sms-poll";

// Background task: even when the app is backgrounded, periodically drain the
// queue. Android limits how often this runs (~15 min minimum), so the socket
// push + foreground timer do the heavy lifting; this is the safety net.
TaskManager.defineTask(SMS_TASK, async () => {
  try {
    const session = await loadSession();
    if (!session) return BackgroundFetch.BackgroundFetchResult.NoData;
    await heartbeat(session);
    const n = await runOnce(session);
    return n > 0 ? BackgroundFetch.BackgroundFetchResult.NewData : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackground() {
  try {
    await BackgroundFetch.registerTaskAsync(SMS_TASK, {
      minimumInterval: 60 * 15, // 15 min (Android floor)
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch { /* already registered */ }
}

export async function unregisterBackground() {
  try { await BackgroundFetch.unregisterTaskAsync(SMS_TASK); } catch { /* noop */ }
}
