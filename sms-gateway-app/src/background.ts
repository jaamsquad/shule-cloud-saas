/**
 * Background safety-net using expo-background-task (the modern replacement for
 * background-fetch). The persistent foreground service does the real work; this
 * periodic task is a backstop that also fires after device reboot, draining the
 * queue and sending a heartbeat in case the service isn't running yet.
 */
import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import { loadSession } from "./config";
import { runOnce, heartbeat } from "./worker";

export const SMS_TASK = "shulecloud-sms-poll";

TaskManager.defineTask(SMS_TASK, async () => {
  try {
    const session = await loadSession();
    if (!session) return BackgroundTask.BackgroundTaskResult.Success;
    await heartbeat(session);
    await runOnce(session);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackground() {
  try {
    await BackgroundTask.registerTaskAsync(SMS_TASK, { minimumInterval: 15 });
  } catch { /* already registered or unsupported (Expo Go) */ }
}

export async function unregisterBackground() {
  try { await BackgroundTask.unregisterTaskAsync(SMS_TASK); } catch { /* noop */ }
}
