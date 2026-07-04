import type { ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { radius, shadow, spacing } from "../../theme/tokens";
export function AppCard({ children, style, ...props }: ViewProps & { children: ReactNode }) { const { theme } = useTheme(); return <View {...props} style={[styles.card, shadow, { backgroundColor: theme.card, borderColor: theme.border }, style]}>{children}</View>; }
const styles = StyleSheet.create({ card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg } });
