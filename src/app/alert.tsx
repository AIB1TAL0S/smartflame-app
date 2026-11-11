import { StyleSheet, Text, View, Pressable, Animated, Easing } from "react-native";
import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { useStore } from "@/lib/store";
import { callEmergency } from "@/lib/emergency";

export default function AlertScreen() {
  const status = useStore((s) => s.status);
  const emergencyNumber = useStore((s) => s.emergencyNumber);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 420, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 420, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  const clear = status?.alert !== "EMERGENCY";

  return (
    <Animated.View style={[styles.root, { opacity }]}>
      <Text style={styles.icon}>🔥</Text>
      <Text style={styles.head}>EMERGENCY</Text>
      <Text style={styles.sub}>
        {clear ? "Alert cleared — safe to dismiss." : "Fire/gas emergency on SmartFlame unit. Evacuate and call emergency services."}
      </Text>
      {status ? (
        <Text style={styles.meta}>
          gas {status.gasPercent}% · temp {status.temperatureC}°C · hum {status.humidity}% · flame {status.flame ? "YES" : "no"}
        </Text>
      ) : null}

      {!clear && (
        <Pressable style={styles.callBtn} onPress={() => callEmergency(emergencyNumber)}>
          <Text style={styles.callText}>📞 CALL {emergencyNumber || "EMERGENCY"}</Text>
        </Pressable>
      )}

      {clear ? (
        <Pressable style={styles.btn} onPress={() => router.navigate("/")}>
          <Text style={styles.btnText}>DISMISS</Text>
        </Pressable>
      ) : (
        <Text style={styles.hint}>Buzzer is sounding on the unit. Alert auto-dismisses when level drops.</Text>
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
  hint: { color: "#FFCDD2", fontSize: 13, textAlign: "center" },
  callBtn: { backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16, marginTop: 4 },
  callText: { color: "#B71C1C", fontWeight: "900", fontSize: 18, letterSpacing: 1 },
  btn: { backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  btnText: { color: "#B71C1C", fontWeight: "900", letterSpacing: 1 },
});
