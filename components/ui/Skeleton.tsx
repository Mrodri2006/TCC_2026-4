import { useEffect } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
export function Skeleton({ style }: { style?: ViewStyle | ViewStyle[] }) { const opacity = useSharedValue(0.35); useEffect(() => { opacity.value = withRepeat(withTiming(0.8, { duration: 700 }), -1, true); }, [opacity]); const animated = useAnimatedStyle(() => ({ opacity: opacity.value })); return <Animated.View style={[styles.base, style, animated]} />; }
const styles = StyleSheet.create({ base: { height: 16, borderRadius: 8, backgroundColor: "#CBD5E1" } });
