/**
 * Native SMS sending — isolated behind one function so it's easy to swap the
 * native module or stub it in development.
 *
 * Uses `react-native-android-sms-sender`, which wraps Android's SmsManager
 * (SmsManager.sendTextMessage / sendMultipartTextMessage). Requires the
 * SEND_SMS permission (declared in app.json and requested at runtime).
 */
import { Platform } from "react-native";

// Lazy require so the app still bundles in environments without the native module.
let SmsModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SmsModule = require("react-native-android-sms-sender").default || require("react-native-android-sms-sender");
} catch {
  SmsModule = null;
}

export async function sendSms(phone: string, message: string): Promise<void> {
  if (Platform.OS !== "android") throw new Error("SMS sending is Android-only");
  if (!SmsModule) {
    // Dev/Expo-Go fallback: simulate a short send so the flow is testable.
    await new Promise(res => setTimeout(res, 400));
    if (__DEV__) { console.log(`[SMS dev-stub] → ${phone}: ${message}`); return; }
    throw new Error("Native SMS module not available");
  }
  // The module exposes sendSMS(phone, message) returning a promise.
  await SmsModule.sendSMS(phone, message);
}
