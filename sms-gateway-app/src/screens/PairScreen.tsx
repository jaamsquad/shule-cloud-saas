import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Platform, PermissionsAndroid } from "react-native";
import * as Device from "expo-device";
import { api } from "../api";
import { saveSession, Session } from "../config";

const PURPLE = "#613ddf";

// Requests the Android SMS permission. iOS can't send SMS programmatically at
// all, so there's nothing to request there — return "not-applicable".
async function requestSmsPermission(): Promise<"granted" | "denied" | "n/a"> {
  if (Platform.OS !== "android") return "n/a";
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    ]);
    return granted["android.permission.SEND_SMS"] === PermissionsAndroid.RESULTS.GRANTED ? "granted" : "denied";
  } catch { return "denied"; }
}

export function PairScreen({ onPaired }: { onPaired: (s: Session) => void }) {
  const [subdomain, setSubdomain] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const pair = async () => {
    const sd = subdomain.trim().toLowerCase().replace(/\..*$/, "");
    if (!sd || code.trim().length < 4) { Alert.alert("Missing details", "Enter your school subdomain and the 6-digit pairing code."); return; }
    setBusy(true);
    try {
      const perm = await requestSmsPermission();
      if (perm === "denied") {
        // Android but user declined — can't send SMS without it.
        Alert.alert("Permission needed", "Please allow the SMS permission so this phone can send messages. You can enable it in Settings → Apps → ShuleCloud SMS → Permissions.");
        setBusy(false); return;
      }
      // perm === "granted" (Android) or "n/a" (iOS) → continue. iOS pairs for
      // status/preview only; it cannot actually send SMS.
      const res = await api.register(sd, {
        pairingCode: code.trim(),
        deviceName: Device.deviceName || `${Device.brand} ${Device.modelName}`,
      });
      const session: Session = { subdomain: sd, token: res.token, deviceId: res.deviceId, schoolId: res.school };
      await saveSession(session);
      onPaired(session);
    } catch (e: any) {
      Alert.alert("Pairing failed", e?.message || "Check the subdomain and code, then try again.");
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.logo}>Shule<Text style={{ color: PURPLE }}>Cloud</Text></Text>
      <Text style={styles.title}>SMS Gateway</Text>
      <Text style={styles.sub}>Turn this phone into your school's SMS sender.</Text>

      {Platform.OS !== "android" && (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            ⚠️ Sending SMS only works on Android (it uses the phone's SIM). On this device you can pair to preview the connection, but it won't actually send messages. Install the app on an Android phone for real sending.
          </Text>
        </View>
      )}

      <Text style={styles.label}>School subdomain</Text>
      <TextInput value={subdomain} onChangeText={setSubdomain} autoCapitalize="none" placeholder="e.g. egerton" style={styles.input} />

      <Text style={styles.label}>Pairing code</Text>
      <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="6-digit code" style={[styles.input, styles.code]} />
      <Text style={styles.hint}>Get this code from your school portal → Communications → Bulk SMS → Devices.</Text>

      <TouchableOpacity onPress={pair} disabled={busy} style={[styles.btn, busy && { opacity: 0.6 }]}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Connect this phone</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#fff", padding: 28, justifyContent: "center" },
  logo: { fontSize: 28, fontWeight: "900", color: "#1a1333", textAlign: "center" },
  title: { fontSize: 18, fontWeight: "800", color: "#1a1333", textAlign: "center", marginTop: 4 },
  sub: { color: "#64748b", textAlign: "center", marginTop: 6, marginBottom: 20 },
  warn: { backgroundColor: "#fef3c7", borderColor: "#fcd34d", borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 },
  warnText: { color: "#92400e", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  label: { fontSize: 12, fontWeight: "800", color: "#475569", marginBottom: 6, marginTop: 14, textTransform: "uppercase" },
  input: { height: 52, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 14, paddingHorizontal: 16, fontSize: 16, color: "#1a1333" },
  code: { letterSpacing: 8, textAlign: "center", fontSize: 22, fontWeight: "800" },
  hint: { fontSize: 12, color: "#94a3b8", marginTop: 8 },
  btn: { backgroundColor: PURPLE, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", marginTop: 28 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
