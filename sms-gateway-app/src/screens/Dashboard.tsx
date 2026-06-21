import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import * as Notifications from "expo-notifications";
import { Session, clearSession } from "../config";
import { runOnce, heartbeat } from "../worker";
import { connectSocket, getSocket, disconnectSocket } from "../socket";
import {
  hasForegroundService, registerForegroundService, startForegroundService, stopForegroundService,
} from "../foregroundService";

const PURPLE = "#613ddf";

export function Dashboard({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [online, setOnline] = useState(false);
  const [bg, setBg] = useState(false);
  const [stats, setStats] = useState({ sent: 0, failed: 0 });
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const addLog = (line: string) => setLog(l => [`${new Date().toLocaleTimeString()} · ${line}`, ...l].slice(0, 50));

  const drain = async () => {
    if (busy) return;
    setBusy(true);
    let batch = { sent: 0, failed: 0 };
    try {
      await runOnce(session, {
        onProgress: ({ sent, failed }) => { batch = { sent, failed }; },   // cumulative within the batch
        onLog: addLog,
      });
      if (batch.sent || batch.failed) setStats(prev => ({ sent: prev.sent + batch.sent, failed: prev.failed + batch.failed }));
    } finally { setBusy(false); }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Ask for the notification permission (Android 13+) — required for the
      // persistent foreground-service notification that keeps us alive.
      try { await Notifications.requestPermissionsAsync(); } catch {}

      // Live socket for the on-screen UI.
      const socket = connectSocket(session, () => { addLog("New message(s) incoming"); drain(); });
      socket.on("connect", () => { if (mounted) { setOnline(true); addLog("Connected to ShuleCloud"); } drain(); });
      socket.on("disconnect", () => { if (mounted) setOnline(false); });

      // Start the foreground service so sending continues when the app is closed.
      if (hasForegroundService()) {
        registerForegroundService();
        await startForegroundService(session.subdomain);
        if (mounted) { setBg(true); addLog("Background service started — sending will continue when closed"); }
      } else {
        addLog("Background service unavailable in this build (Expo Go) — keep the app open");
      }

      heartbeat(session);
    })();

    // Foreground UI heartbeat/drain (the service handles it when backgrounded).
    const poll = setInterval(() => drain(), 15000);
    const hb = setInterval(() => heartbeat(session), 30000);
    return () => { mounted = false; clearInterval(poll); clearInterval(hb); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the online dot in sync with the live socket
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const on = () => setOnline(true); const off = () => setOnline(false);
    s.on("connect", on); s.on("disconnect", off);
    setOnline(!!s.connected);
    return () => { s.off("connect", on); s.off("disconnect", off); };
  });

  const signOut = () => {
    Alert.alert("Disconnect this phone?", "It will stop sending SMS for the school until you pair again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Disconnect", style: "destructive", onPress: async () => { await stopForegroundService(); disconnectSocket(); await clearSession(); onSignOut(); } },
    ]);
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.logo}>Shule<Text style={{ color: PURPLE }}>Cloud</Text> SMS</Text>

      <View style={[styles.statusCard, { backgroundColor: online ? "#dcfce7" : "#fee2e2" }]}>
        <Text style={[styles.statusText, { color: online ? "#16a34a" : "#dc2626" }]}>
          {online ? "● Connected & ready" : "○ Reconnecting…"}
        </Text>
        <Text style={styles.statusSub}>School: {session.subdomain}</Text>
        <Text style={[styles.statusSub, { marginTop: 6 }]}>
          {bg ? "🟢 Background sending ON — works when the app is closed" : "🟡 Keep the app open for sending"}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Sent" value={stats.sent} />
        <Stat label="Failed" value={stats.failed} />
      </View>

      <TouchableOpacity onPress={drain} disabled={busy} style={[styles.btn, busy && { opacity: 0.6 }]}>
        <Text style={styles.btnText}>{busy ? "Sending…" : "Send pending now"}</Text>
      </TouchableOpacity>

      <Text style={styles.logTitle}>Activity</Text>
      <View style={styles.logBox}>
        {log.length === 0 ? <Text style={styles.logEmpty}>Waiting for messages…</Text> :
          log.map((l, i) => <Text key={i} style={styles.logLine}>{l}</Text>)}
      </View>

      <TouchableOpacity onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Disconnect this phone</Text>
      </TouchableOpacity>

      <Text style={styles.note}>For most reliable delivery, disable battery optimisation for this app (Settings → Apps → ShuleCloud SMS → Battery → Unrestricted).</Text>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#f8fafc" },
  logo: { fontSize: 24, fontWeight: "900", color: "#1a1333", marginBottom: 16 },
  statusCard: { borderRadius: 18, padding: 18, marginBottom: 16 },
  statusText: { fontSize: 18, fontWeight: "900" },
  statusSub: { color: "#475569", marginTop: 4, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#eef0f4" },
  statValue: { fontSize: 28, fontWeight: "900", color: "#1a1333" },
  statLabel: { fontSize: 11, fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", marginTop: 2 },
  btn: { backgroundColor: PURPLE, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  logTitle: { fontSize: 12, fontWeight: "900", color: "#475569", textTransform: "uppercase", marginTop: 24, marginBottom: 8 },
  logBox: { backgroundColor: "#fff", borderRadius: 16, padding: 14, minHeight: 120, borderWidth: 1, borderColor: "#eef0f4" },
  logEmpty: { color: "#94a3b8" },
  logLine: { color: "#475569", fontSize: 12, marginBottom: 4 },
  signOut: { marginTop: 24, alignItems: "center" },
  signOutText: { color: "#dc2626", fontWeight: "800" },
  note: { color: "#94a3b8", fontSize: 12, textAlign: "center", marginTop: 16, marginBottom: 32 },
});
