import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { BadgeCheck, ShieldCheck, ShieldQuestion } from "lucide-react-native";
import { useTheme } from "../theme/ThemeContext";
import { getProviderTrustSummary } from "../utils/providerTrust";

type ProviderTrustProps = {
  provider: any;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

type ProviderTrustCardProps = ProviderTrustProps & {
  actionLabel?: string;
  onAction?: () => void;
};

const toneFor = (summary: ReturnType<typeof getProviderTrustSummary>) => {
  if (summary.verified) return { color: "#047857", bg: "#ECFDF5", border: "#A7F3D0", Icon: BadgeCheck };
  if (summary.pending) return { color: "#B45309", bg: "#FFFBEB", border: "#FDE68A", Icon: ShieldCheck };
  if (summary.rejected) return { color: "#B91C1C", bg: "#FEF2F2", border: "#FECACA", Icon: ShieldQuestion };
  if (summary.score >= 84) return { color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE", Icon: ShieldCheck };
  return { color: "#475569", bg: "#F8FAFC", border: "#E2E8F0", Icon: ShieldQuestion };
};

export function ProviderTrustBadge({ provider, compact = false, style }: ProviderTrustProps) {
  const summary = getProviderTrustSummary(provider);
  const tone = toneFor(summary);
  const Icon = tone.Icon;

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }, compact && styles.badgeCompact, style]}>
      <Icon size={compact ? 13 : 15} color={tone.color} />
      <Text style={[styles.badgeText, { color: tone.color }]} numberOfLines={1}>
        {summary.label}
      </Text>
    </View>
  );
}

export function ProviderTrustCard({ provider, actionLabel, onAction, style }: ProviderTrustCardProps) {
  const { theme } = useTheme();
  const summary = getProviderTrustSummary(provider);
  const tone = toneFor(summary);
  const Icon = tone.Icon;
  const missing = summary.missing.slice(0, 3);

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: tone.bg, borderColor: tone.border }]}>
          <Icon size={20} color={tone.color} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{summary.label}</Text>
          <Text style={[styles.cardDescription, { color: theme.textMuted }]}>{summary.description}</Text>
        </View>
        <Text style={[styles.score, { color: tone.color }]}>{summary.score}%</Text>
      </View>

      {!summary.verified ? (
        <>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View style={[styles.progressFill, { width: `${summary.score}%`, backgroundColor: tone.color }]} />
          </View>
          {missing.length > 0 ? (
            <Text style={[styles.missing, { color: theme.textMuted }]}>
              Falta: {missing.join(", ")}
            </Text>
          ) : null}
        </>
      ) : null}

      {actionLabel && onAction ? (
        <TouchableOpacity style={[styles.actionButton, { borderColor: tone.border, backgroundColor: tone.bg }]} onPress={onAction}>
          <Text style={[styles.actionText, { color: tone.color }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  badgeCompact: {
    minHeight: 24,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  cardDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  score: {
    fontSize: 18,
    fontWeight: "900",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  missing: {
    marginTop: 9,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  actionButton: {
    minHeight: 42,
    marginTop: 14,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "900",
  },
});
