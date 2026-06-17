import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CreditCard, LogOut, RefreshCw, ShieldAlert } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../firebase";
import { useTheme } from "../theme/ThemeContext";
import { useMensalidadeStatus } from "../hooks/useMensalidadeStatus";

export default function MensalidadeBloqueada() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useTheme();
  const { status, loading, refresh } = useMensalidadeStatus(15000);
  const liberado =
    !!status &&
    status.contaAtiva &&
    status.assinaturaAtiva &&
    status.statusPagamento !== "inadimplente";

  useEffect(() => {
    if (liberado) {
      navigation.replace("MenuTrabalhador");
    }
  }, [liberado, navigation]);

  const cardBg = isDark ? theme.surface : "#FFFFFF";
  const cardBorder = isDark ? theme.surfaceBorder : "transparent";
  const headerBg = isDark ? theme.surface : "#E8F4FB";
  const iconBg = isDark ? "rgba(255,255,255,0.06)" : "#D9EEF7";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View
          style={[
            styles.topHeader,
            { backgroundColor: headerBg, borderColor: cardBorder, borderWidth: isDark ? 1 : 0 },
          ]}
        >
          <View style={[styles.headerIcon, { backgroundColor: iconBg }]}>
            <ShieldAlert size={36} color={theme.surfaceTextPrimary} />
          </View>
          <Text style={[styles.title, { color: theme.surfaceTextPrimary }]}>Conta bloqueada</Text>
          <Text style={[styles.subtitle, { color: theme.surfaceTextMuted }]}>
            Sua mensalidade esta pendente. Para voltar a usar a plataforma, faca o pagamento.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Resumo</Text>
          <View style={styles.sectionUnderline} />
        </View>

        <View
          style={[
            styles.infoCard,
            { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: isDark ? 1 : 0 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#2563EB" />
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.surfaceTextMuted }]}>Status</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{status?.statusPagamento || "-"}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.surfaceTextMuted }]}>Valor</Text>
                <Text style={[styles.infoValue, { color: theme.surfaceTextPrimary }]}>
                  R$ {Number(status?.valorMensalidade || 0).toFixed(2)}
                </Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("PagamentoMensalidade")}
          activeOpacity={0.85}
        >
          <CreditCard size={18} color="#FFFFFF" />
          <Text style={styles.primaryText}>Pagar mensalidade</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { backgroundColor: cardBg, borderColor: isDark ? theme.surfaceBorder : "#DCE7EA" }]}
          onPress={refresh}
          activeOpacity={0.85}
        >
          <RefreshCw size={18} color="#2563EB" />
          <Text style={[styles.secondaryText, { color: theme.surfaceTextPrimary }]}>Ja paguei, atualizar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={async () => {
            await auth.signOut();
            navigation.replace("Login");
          }}
          activeOpacity={0.7}
        >
          <LogOut size={16} color={theme.textMuted} />
          <Text style={[styles.linkText, { color: theme.textMuted }]}>Sair</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 36,
    paddingTop: 18,
    justifyContent: "center",
  },
  topHeader: {
    borderRadius: 28,
    paddingBottom: 26,
    paddingHorizontal: 18,
    paddingTop: 22,
    marginBottom: 22,
    alignItems: "center",
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  headerIcon: {
    width: 86,
    height: 86,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontWeight: "500",
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
  },
  sectionUnderline: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#2563EB",
    marginTop: 6,
  },
  infoCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    minHeight: 92,
    justifyContent: "center",
    shadowColor: "#0F2937",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(100, 116, 139, 0.16)",
    marginVertical: 14,
  },
  statusBadge: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  statusText: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  primaryBtn: {
    minHeight: 50,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#0F2937",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  secondaryBtn: {
    minHeight: 48,
    marginTop: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
  },
  secondaryText: {
    fontWeight: "800",
    fontSize: 14,
  },
  linkBtn: {
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
