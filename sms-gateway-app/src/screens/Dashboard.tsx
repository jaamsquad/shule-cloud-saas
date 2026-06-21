import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL, Session, clearSession } from "../config";
import { runOnce, heartbeat } from "../worker";

const PURPLE = "#613ddf";

export function Dashboard({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [online, setOnline] = useState(false);
  const [stats, setStats] = useState({ sent: 0, failed: 0 });
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const socketRef = useRef<Socket | null>(null);

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
      // Add the batch totals to the running session counters once.
      if (batch.sent || batch.failed) setStats(prev => ({ sent: prev.sent + batch.sent, failed: prev.failed + batch.failed }));
    } finally { setBusy(false); }
  };

  useEffect(() => {
    // Socket: instant push when new jobs are queued.
    const socket = io(`${SOCKET_URL}/sms`, {
      path: "/socket.io",
      auth: { token: session.token, subdomain: session.subdomain },
      transports: ["websocket"],
    });
    socketRef.current = socket;
    socket.on("connect", () => { setOnline(true); addLog("Connected to ShuleCloud"); drain(); });
    socket.on("disconnect", () => { setOnline(false); addLog("Disconnected — will retry"); });
    socket.on("sms:ready", () => drain());
    socket.on("sms:jobs", (p: any) => { addLog(`${p?.count ?? "New"} message(s) incoming`); drain(); });

    // Foreground safety timer + heartbeat.
    heartbeat(session);
    const poll = setInterval(() => { drain(); }, 20000);
    const hb = setInterval(() => heartbeat(session), 30000);
    return () => { socket.disconnect(); clearInterval(poll); clearInterval(hb); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = () => {
    Alert.alert("Disconnect this phone?", "It will stop sending SMS for the school until you pair again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Disconnect", style: "destructive", onPress: async () => { socketRef.current?.disconnect(); await clearSession(); onSignOut(); } },
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

      <Text style={styles.note}>Keep this app open or running in the background, and disable battery optimisation for reliable delivery.</Text>
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
