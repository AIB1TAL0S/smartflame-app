import { StyleSheet, Text, View, Pressable, Animated, Easing } from "react-native";
import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { useStore } from "@/lib/store";
import { updateUrl } from "@/lib/blynk";

export default function AlertScreen() {
  const data = useStore((s) => s.data);
  const settings = useStore((s) => s.settings);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // flash red/white while flame still detected
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 420, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 420, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  const mute = async () => {
    if (!settings.token) return;
    await fetch(updateUrl(settings.region, settings.token, "V5", 0)).catch(() => undefined);
  };

  const clear = data?.flame !== 1;

  return (
    <Animated.View style={[styles.root, { opacity }]}>
      <Text style={styles.icon}>🔥</Text>
      <Text style={styles.head}>FIRE DETECTED</Text>
      <Text style={styles.sub}>
        {clear ? "Flame cleared — safe to dismiss." : "Flame sensor active. Evacuate and call emergency services."}
      </Text>
      {data ? (
        <Text style={styles.meta}>
          gas {data.gas} ppm · temp {data.temp.toFixed(1)}°C · hum {data.hum.toFixed(0)}%
        </Text>
      ) : null}

      {clear ? (
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>DISMISS</Text>
        </Pressable>
      ) : (
        <View style={styles.row}>
          <Pressable style={[styles.btn, styles.muted]} onPress={mute}>
            <Text style={styles.btnText}>MUTE BUZZER</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#B71C1C", alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  icon: { fontSize: 96 },
  head: { color: "#fff", fontSize: 36, fontWeight: "900", letterSpacing: 2 },
  sub: { color: "#FFCDD2", fontSize: 16, textAlign: "center" },
  meta: { color: "#FF8A80", fontSize: 13, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", gap: 12 },
  btn: { backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  muted: { backgroundColor: "#00000055", borderWidth: 1.5, borderColor: "#fff" },
  btnText: { color: "#B71C1C", fontWeight: "900", letterSpacing: 1 },
});
