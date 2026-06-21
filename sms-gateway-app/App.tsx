import { useEffect, useState } from "react";
import { View, ActivityIndicator, StatusBar } from "react-native";
import { SafeAreaView } from "react-native";
import { loadSession, Session } from "./src/config";
import { PairScreen } from "./src/screens/PairScreen";
import { Dashboard } from "./src/screens/Dashboard";
import { registerBackground } from "./src/background";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    (async () => {
      const s = await loadSession();
      setSession(s);
      setLoading(false);
      if (s) registerBackground();
    })();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator size="large" color="#613ddf" /></View>
      ) : session ? (
        <Dashboard session={session} onSignOut={() => setSession(null)} />
      ) : (
        <PairScreen onPaired={(s) => { setSession(s); registerBackground(); }} />
      )}
    </SafeAreaView>
  );
}
