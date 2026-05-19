import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { createMensalidade, MensalidadeInvoice } from "../services/billingService";
import { useMensalidadeStatus } from "../hooks/useMensalidadeStatus";

export default function PagamentoMensalidade() {
  const { theme } = useTheme();
  const { status, loading: statusLoading, refresh } = useMensalidadeStatus(10000);
  const [invoice, setInvoice] = useState<MensalidadeInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qrBase64Uri = useMemo(() => {
    const b64 = invoice?.pix?.qr_code_base64;
    return b64 ? `data:image/png;base64,${b64}` : null;
  }, [invoice?.pix?.qr_code_base64]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = (await createMensalidade("pix")) as any;
        setInvoice(res as any);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Erro ao gerar cobrança.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (status?.invoice) setInvoice(status.invoice as any);
  }, [status?.invoice]);

  const paid = status?.invoice?.status === "paid" || status?.statusPagamento === "pago";

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Pagamento da mensalidade</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        O desbloqueio é automático após a confirmação do Mercado Pago.
      </Text>

      {(loading || statusLoading) && <ActivityIndicator style={{ marginTop: 10 }} />}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.card}>
        <Text style={styles.row}>
          Valor: <Text style={styles.value}>R$ {Number(status?.valorMensalidade || invoice?.amount || 0).toFixed(2)}</Text>
        </Text>
        <Text style={styles.row}>
          Status: <Text style={styles.value}>{paid ? "Pago" : invoice?.status || status?.statusPagamento || "-"}</Text>
        </Text>
      </View>

      {paid ? (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>Pagamento confirmado</Text>
          <Text style={styles.successText}>Sua conta já pode ser utilizada normalmente.</Text>
        </View>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>PIX</Text>

          {qrBase64Uri ? (
            <View style={styles.qrWrap}>
              <Image source={{ uri: qrBase64Uri }} style={styles.qrImage} />
            </View>
          ) : (
            <Text style={[styles.helper, { color: theme.textSecondary }]}>Gerando QR Code...</Text>
          )}

          {!!invoice?.pix?.ticket_url && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={async () => {
                await Linking.openURL(invoice.pix!.ticket_url);
              }}
            >
              <Text style={styles.primaryText}>Abrir boleto/PIX no Mercado Pago</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.secondaryBtn} onPress={refresh}>
            <Text style={styles.secondaryText}>Atualizar status</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1 },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { marginTop: 6, fontSize: 13 },
  card: { backgroundColor: "#111827", borderRadius: 14, padding: 16, marginTop: 16 },
  row: { color: "#E5E7EB", marginBottom: 8 },
  value: { fontWeight: "800" },
  sectionTitle: { marginTop: 18, marginBottom: 10, fontSize: 16, fontWeight: "800" },
  qrWrap: { alignItems: "center", backgroundColor: "#0B1220", padding: 16, borderRadius: 14 },
  qrImage: { width: 240, height: 240 },
  helper: { marginTop: 8 },
  primaryBtn: { marginTop: 16, backgroundColor: "#0EA5A8", padding: 14, borderRadius: 12, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "800", textAlign: "center" },
  secondaryBtn: { marginTop: 12, padding: 12, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  secondaryText: { color: "#E2E8F0", fontWeight: "700" },
  error: { marginTop: 10, color: "#FCA5A5" },
  successBox: { marginTop: 18, backgroundColor: "#052E2B", borderRadius: 14, padding: 16 },
  successTitle: { color: "#A7F3D0", fontWeight: "900", marginBottom: 4 },
  successText: { color: "#D1FAE5" },
});

