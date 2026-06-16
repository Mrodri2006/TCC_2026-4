import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { auth } from "../firebase";
import { useTheme } from "../theme/ThemeContext";
import { useMensalidadeStatus } from "../hooks/useMensalidadeStatus";

export default function MensalidadeBloqueada() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { status, loading, refresh } = useMensalidadeStatus(15000);
  const liberado = !!status && status.contaAtiva && status.assinaturaAtiva && status.statusPagamento !== "inadimplente";

  useEffect(() => {
    if (liberado) {
      navigation.replace("MenuTrabalhador");
    }
  }, [liberado, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Conta bloqueada</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Sua mensalidade está pendente. Para voltar a usar a plataforma, faça o pagamento.
      </Text>

      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text style={styles.row}>
              Status: <Text style={styles.value}>{status?.statusPagamento || "-"}</Text>
            </Text>
            <Text style={styles.row}>
              Valor: <Text style={styles.value}>R$ {Number(status?.valorMensalidade || 0).toFixed(2)}</Text>
            </Text>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("PagamentoMensalidade")}>
        <Text style={styles.primaryText}>Pagar mensalidade</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={refresh}>
        <Text style={styles.secondaryText}>Já paguei, atualizar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkBtn}
        onPress={async () => {
          await auth.signOut();
          navigation.replace("Login");
        }}
      >
        <Text style={[styles.linkText, { color: theme.textSecondary }]}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 14, marginBottom: 18, textAlign: "center" },
  card: {
    borderRadius: 14,
    backgroundColor: "#111827",
    padding: 16,
    marginBottom: 18,
  },
  row: { color: "#E5E7EB", marginBottom: 8 },
  value: { fontWeight: "700" },
  primaryBtn: { backgroundColor: "#0EA5A8", padding: 14, borderRadius: 12, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "800" },
  secondaryBtn: { padding: 12, borderRadius: 12, alignItems: "center", marginTop: 12, borderWidth: 1, borderColor: "#334155" },
  secondaryText: { color: "#E2E8F0", fontWeight: "700" },
  linkBtn: { marginTop: 18, alignItems: "center" },
  linkText: { fontSize: 13, textDecorationLine: "underline" },
});

