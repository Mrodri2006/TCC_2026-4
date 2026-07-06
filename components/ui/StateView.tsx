import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, Inbox } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { AppButton } from "./AppButton";
import { spacing, typography } from "../../theme/tokens";
type Props = { kind: "loading" | "empty" | "error" | "offline"; title?: string; message?: string; actionLabel?: string; onAction?: () => void; icon?: ReactNode };
export function StateView({ kind, title, message, actionLabel, onAction, icon }: Props) {
  const { theme } = useTheme();
  const defaultTitle = kind === "loading" ? "Carregando" : kind === "empty" ? "Nada por aqui" : kind === "offline" ? "Sem conexão" : "Não foi possível carregar";
  const visual = kind === "loading" ? <ActivityIndicator size="large" color="#FF8700" /> : (icon ?? (kind === "empty" ? <Inbox size={34} color="#FF8700" /> : <AlertTriangle size={34} color={kind === "offline" ? "#F59E0B" : "#DC2626"} />));
  return <View style={styles.wrap}>{visual}<Text style={[styles.title, { color: theme.textPrimary }]}>{title || defaultTitle}</Text>{!!message && <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>}{actionLabel && onAction && <AppButton label={actionLabel} onPress={onAction} variant="secondary" />}</View>;
}
const styles = StyleSheet.create({ wrap: { flex: 1, minHeight: 220, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md }, title: { ...typography.subtitle, textAlign: "center" }, message: { ...typography.body, textAlign: "center", maxWidth: 340 }, });
