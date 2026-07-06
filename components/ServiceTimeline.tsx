import { StyleSheet, Text, View } from "react-native";
import { Check, Circle } from "lucide-react-native";
import { SERVICE_STEPS, ServiceStatus, normalizeServiceStatus, type ServiceTimelineEvent } from "../domain/service";
import { useTheme } from "../theme/ThemeContext";

type Props = { status: unknown; events?: ServiceTimelineEvent[] };

const formatDate = (value: any) => {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";
};

export function ServiceTimeline({ status, events = [] }: Props) {
  const { theme } = useTheme();
  const current = normalizeServiceStatus(status);
  const terminal = current === ServiceStatus.CANCELADO || current === ServiceStatus.PROBLEMA;
  const currentIndex = SERVICE_STEPS.findIndex((step) => step.status === current);

  return <View style={styles.container}>
    {SERVICE_STEPS.map((step, index) => {
      const done = !terminal && index <= currentIndex;
      const event = [...events].reverse().find((item) => normalizeServiceStatus(item.status) === step.status);
      return <View key={step.status} style={styles.row}>
        <View style={styles.rail}>
          <View style={[styles.dot, { backgroundColor: done ? "#FF8700" : theme.card, borderColor: done ? "#FF8700" : theme.border }]}>
            {done ? <Check size={12} color="#FFFFFF" /> : <Circle size={10} color={theme.textMuted} />}
          </View>
          {index < SERVICE_STEPS.length - 1 && <View style={[styles.line, { backgroundColor: index < currentIndex ? "#FF8700" : theme.border }]} />}
        </View>
        <View style={styles.copy}>
          <Text style={[styles.label, { color: done ? theme.textPrimary : theme.textMuted }]}>{step.label}</Text>
          {!!event && <Text style={[styles.date, { color: theme.textMuted }]}>{formatDate(event.at)}</Text>}
        </View>
      </View>;
    })}
    {terminal && <Text style={[styles.terminal, { color: current === ServiceStatus.PROBLEMA ? "#B45309" : "#B91C1C" }]}>
      {current === ServiceStatus.PROBLEMA ? "O serviço possui um problema em análise." : "O serviço foi cancelado."}
    </Text>}
  </View>;
}

const styles = StyleSheet.create({
  container: { marginTop: 12 }, row: { minHeight: 50, flexDirection: "row" },
  rail: { width: 28, alignItems: "center" }, dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  line: { width: 2, flex: 1 }, copy: { flex: 1, paddingLeft: 8, paddingBottom: 12 },
  label: { fontSize: 13, fontWeight: "800" }, date: { fontSize: 11, marginTop: 2 },
  terminal: { fontSize: 12, fontWeight: "800", marginTop: 4 },
});
