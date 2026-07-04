import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { radius, spacing, typography } from "../../theme/tokens";

type Props = PressableProps & { label: string; loading?: boolean; variant?: "primary" | "secondary" | "danger" | "ghost"; icon?: ReactNode };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function AppButton({ label, loading, variant = "primary", icon, disabled, onPressIn, onPressOut, ...props }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const palette = variant === "danger" ? styles.danger : variant === "secondary" ? styles.secondary : variant === "ghost" ? styles.ghost : styles.primary;
  return <AnimatedPressable {...props} disabled={disabled || loading} onPressIn={(event) => { scale.value = withTiming(0.97, { duration: 90 }); onPressIn?.(event); }} onPressOut={(event) => { scale.value = withTiming(1, { duration: 120 }); onPressOut?.(event); }} style={[styles.base, palette, (disabled || loading) && styles.disabled, animated]} accessibilityRole="button" accessibilityState={{ disabled: !!disabled, busy: !!loading }}>
    {loading ? <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? "#2563EB" : "#FFFFFF"} /> : <View style={styles.content}>{icon}<Text style={[styles.label, (variant === "secondary" || variant === "ghost") && styles.darkLabel]}>{label}</Text></View>}
  </AnimatedPressable>;
}
const styles = StyleSheet.create({ base: { minHeight: 50, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg }, content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm }, primary: { backgroundColor: "#2563EB" }, secondary: { backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE" }, danger: { backgroundColor: "#DC2626" }, ghost: { backgroundColor: "transparent" }, disabled: { opacity: 0.55 }, label: { color: "#FFFFFF", ...typography.body, fontWeight: "800" }, darkLabel: { color: "#1D4ED8" } });
