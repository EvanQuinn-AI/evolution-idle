import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import Constants from "expo-constants";

// The game is the existing zero-dependency static site in ../Prototype, served
// over your LAN by `python -m http.server 4180 -d Prototype`. This Expo shell
// just hosts it in a full-screen WebView and adds real iOS/Android haptics.
const GAME_PORT = 4180;

// If auto-detection ever fails (rare), hard-code your computer's LAN address
// here, e.g. "http://192.168.1.42:4180".
const MANUAL_URL = "";

function detectDevHost() {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.hostUri,
    Constants.manifest2?.extra?.expoClient?.hostUri,
    Constants.manifest?.debuggerHost,
    Constants.manifest?.hostUri
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.length > 0) return value.split(":")[0];
  }
  return null;
}

const HAPTIC_STYLE = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy
};

export default function App() {
  useKeepAwake();
  const webRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const url = useMemo(() => {
    if (MANUAL_URL) return MANUAL_URL;
    const host = detectDevHost();
    return host ? `http://${host}:${GAME_PORT}` : null;
  }, []);

  const onMessage = event => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === "haptic") {
        Haptics.impactAsync(HAPTIC_STYLE[message.style] || HAPTIC_STYLE.light);
      }
    } catch {
      // Ignore non-JSON messages from the page.
    }
  };

  const reload = () => {
    setFailed(false);
    setLoading(true);
    webRef.current?.reload();
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
        <StatusBar style="light" />
        {url && !failed ? (
          <WebView
            ref={webRef}
            source={{ uri: url }}
            style={styles.web}
            onMessage={onMessage}
            onLoadEnd={() => setLoading(false)}
            onError={() => { setFailed(true); setLoading(false); }}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            bounces={false}
            overScrollMode="never"
            setSupportMultipleWindows={false}
            allowsBackForwardNavigationGestures={false}
          />
        ) : (
          <View style={styles.center}>
            <Text style={styles.title}>Evolution Idle</Text>
            <Text style={styles.msg}>
              {url
                ? "Could not reach the game server."
                : "Run the game server on your computer, then reopen this app:"}
            </Text>
            <Text style={styles.code}>python -m http.server {GAME_PORT} -d Prototype</Text>
            {url ? <Text style={styles.msg}>Trying: {url}</Text> : null}
            <TouchableOpacity style={styles.button} onPress={reload}>
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        {loading && url && !failed ? (
          <View style={styles.loader} pointerEvents="none">
            <ActivityIndicator size="large" color="#67ef9a" />
          </View>
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#03100c" },
  web: { flex: 1, backgroundColor: "#03100c" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  title: { color: "#67ef9a", fontSize: 26, fontWeight: "800", marginBottom: 14 },
  msg: { color: "#cfe8db", fontSize: 15, textAlign: "center", marginBottom: 12 },
  code: { color: "#ffc857", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 13, marginBottom: 16, textAlign: "center" },
  button: { marginTop: 8, backgroundColor: "#67ef9a", paddingHorizontal: 26, paddingVertical: 12, borderRadius: 24 },
  buttonText: { color: "#06100d", fontWeight: "900", fontSize: 15 },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "#03100c" }
});
