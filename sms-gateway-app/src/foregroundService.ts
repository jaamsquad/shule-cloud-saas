/**
 * Persistent foreground service — the key to "keeps working even when the app
 * is closed". Android only lets a process run indefinitely if it holds a
 * foreground service with an ongoing notification. We register a Notifee
 * foreground service whose task keeps the socket connected and drains the SMS
 * queue on a tight interval until the service is stopped.
 *
 * Notifee is a native module, so this only runs in a real build (not Expo Go);
 * the requires are guarded so the JS still bundles everywhere.
 */
import { Platform } from "react-native";
import { loadSession } from "./config";
import { runOnce, heartbeat } from "./worker";
import { connectSocket, disconnectSocket } from "./socket";

let notifee: any = null;
let AndroidImportance: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("@notifee/react-native");
  notifee = mod.default || mod;
  AndroidImportance = mod.AndroidImportance;
} catch { notifee = null; }

export const hasForegroundService = () => !!notifee && Platform.OS === "android";

const CHANNEL_ID = "sms-gateway";
let serviceRunning = false;

async function ensureChannel() {
  return notifee.createChannel({
    id: CHANNEL_ID,
    name: "SMS Gateway",
    importance: AndroidImportance?.LOW ?? 2,   // low = quiet, no sound
  });
}

/**
 * Registers the long-running task that Notifee keeps alive. It loops: keep the
 * socket up, send pending SMS, heartbeat — until the service is stopped.
 */
export function registerForegroundService() {
  if (!hasForegroundService()) return;
  notifee.registerForegroundService(() => new Promise<void>(async (resolve) => {
    serviceRunning = true;
    const session = await loadSession();
    if (session) connectSocket(session, () => { runOnce(session).catch(() => {}); });

    let hbTick = 0;
    while (serviceRunning) {
      const s = await loadSession();
      if (!s) { break; }
      try { await runOnce(s); } catch { /* keep going */ }
      if (hbTick++ % 3 === 0) { try { await heartbeat(s); } catch {} }   // ~every 30s
      await new Promise(r => setTimeout(r, 10_000));   // drain every 10s
    }
    disconnectSocket();
    resolve();
  }));
}

/** Start the ongoing notification + foreground service. */
export async function startForegroundService(schoolName: string) {
  if (!hasForegroundService()) return;
  await ensureChannel();
  await notifee.displayNotification({
    title: "ShuleCloud SMS is active",
    body: `Ready to send SMS for ${schoolName}. Keep this running.`,
    android: {
      channelId: CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      smallIcon: "ic_launcher",
      pressAction: { id: "default" },
      color: "#613ddf",
    },
  });
}

/** Stop the service (e.g. on disconnect/sign-out). */
export async function stopForegroundService() {
  serviceRunning = false;
  if (!hasForegroundService()) return;
  try { await notifee.stopForegroundService(); } catch { /* noop */ }
}
