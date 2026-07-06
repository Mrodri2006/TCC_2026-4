import { StyleSheet, Text, View } from "react-native";
import { Award, BadgeCheck, Clock3, Star } from "lucide-react-native";
import { calculateReputation } from "../domain/reputation";
import { useTheme } from "../theme/ThemeContext";

export function ReputationCard({ data }: { data: any }) {
  const { theme } = useTheme();
  const reputation = calculateReputation(data);
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <View style={styles.header}><Award size={22} color="#F59E0B" /><Text style={[styles.title, { color: theme.textPrimary }]}>Reputação {reputation.level}</Text></View>
    <View style={styles.metrics}>
      <View style={styles.metric}><Star size={17} color="#F59E0B" /><Text style={[styles.value, { color: theme.textPrimary }]}>{reputation.average.toFixed(1)}</Text><Text style={[styles.label, { color: theme.textMuted }]}>{reputation.reviews} avaliações</Text></View>
      <View style={styles.metric}><BadgeCheck size={17} color="#16A34A" /><Text style={[styles.value, { color: theme.textPrimary }]}>{reputation.completed}</Text><Text style={[styles.label, { color: theme.textMuted }]}>concluídos</Text></View>
      <View style={styles.metric}><Clock3 size={17} color="#FF8700" /><Text style={[styles.value, { color: theme.textPrimary }]}>{reputation.responseMinutes === null ? "—" : `${reputation.responseMinutes} min`}</Text><Text style={[styles.label, { color: theme.textMuted }]}>resposta</Text></View>
    </View>
    <Text style={[styles.rates, { color: theme.textSecondary }]}>Aceitação {reputation.acceptanceRate}%  •  Cancelamento {reputation.cancellationRate}%</Text>
    {!!reputation.badges.length && <View style={styles.badges}>{reputation.badges.map((badge) => <Text key={badge} style={styles.badge}>{badge}</Text>)}</View>}
  </View>;
}
const styles = StyleSheet.create({ card: { marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 18, borderWidth: 1 }, header: { flexDirection: "row", alignItems: "center", gap: 8 }, title: { fontSize: 16, fontWeight: "900" }, metrics: { flexDirection: "row", marginTop: 16 }, metric: { flex: 1, alignItems: "center" }, value: { fontSize: 16, fontWeight: "900", marginTop: 4 }, label: { fontSize: 10, marginTop: 2 }, rates: { textAlign: "center", fontSize: 11, fontWeight: "700", marginTop: 14 }, badges: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 12 }, badge: { color: "#E86F00", backgroundColor: "#FFEDD5", fontSize: 10, fontWeight: "800", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 } });
