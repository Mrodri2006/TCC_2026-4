import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft, CheckCircle2, Copy, CreditCard, RefreshCw, Send } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";
import { useMensalidadeStatus } from "../hooks/useMensalidadeStatus";
import {
  ADMIN_PIX_KEY,
  ADMIN_PIX_RECEIVER_CITY,
  ADMIN_PIX_RECEIVER_NAME,
  DEFAULT_MENSALIDADE_VALOR,
} from "../utils/billingConfig";
import { buildPixPayload, buildPixTxid } from "../utils/pix";

type PaymentRequest = {
  id: string;
  status: "pendente" | "confirmado" | "recusado" | string;
  criadoEm?: any;
};

const toDate = (value: any) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value?.seconds) return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function PagamentoMensalidade() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useTheme();
  const { status, loading: statusLoading, error: statusError, refresh } = useMensalidadeStatus(0);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uid = auth.currentUser?.uid || "";
  const amount = Number(status?.valorMensalidade || DEFAULT_MENSALIDADE_VALOR);
  const txid = useMemo(() => buildPixTxid(uid || "PRESTADOR"), [uid]);

  const pixPayload = useMemo(() => {
    try {
      return buildPixPayload({
        pixKey: ADMIN_PIX_KEY,
        receiverName: ADMIN_PIX_RECEIVER_NAME,
        receiverCity: ADMIN_PIX_RECEIVER_CITY,
        amount,
        txid,
        description: "Mensalidade prestador",
      });
    } catch (e: any) {
      return "";
    }
  }, [amount, txid]);

  const pixError = useMemo(() => {
    if (pixPayload) return "";
    try {
      buildPixPayload({
        pixKey: ADMIN_PIX_KEY,
        receiverName: ADMIN_PIX_RECEIVER_NAME,
        receiverCity: ADMIN_PIX_RECEIVER_CITY,
        amount,
        txid,
        description: "Mensalidade prestador",
      });
      return "";
    } catch (e: any) {
      return e?.message || "Erro ao gerar QR Pix.";
    }
  }, [amount, pixPayload, txid]);

  const paid =
    !!status &&
    status.contaAtiva !== false &&
    status.assinaturaAtiva !== false &&
    status.statusPagamento !== "inadimplente";

  const carregarSolicitacao = async () => {
    if (!uid) {
      setLoadingRequest(false);
      return;
    }

    setLoadingRequest(true);
    try {
      const snap = await firestore
        .collection("SolicitacoesMensalidade")
        .where("uid", "==", uid)
        .where("status", "==", "pendente")
        .limit(1)
        .get();

      if (snap.empty) {
        setPaymentRequest(null);
      } else {
        const doc = snap.docs[0];
        setPaymentRequest({ id: doc.id, ...(doc.data() as any) });
      }
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Erro ao consultar solicitacao.");
    } finally {
      setLoadingRequest(false);
    }
  };

  useEffect(() => {
    carregarSolicitacao();
  }, [uid]);

  const enviarConfirmacao = async () => {
    if (!uid) {
      Alert.alert("Erro", "Usuario nao autenticado.");
      return;
    }
    if (!pixPayload) {
      Alert.alert("PIX", "Configure a chave Pix antes de enviar solicitacoes.");
      return;
    }

    setSending(true);
    try {
      const userSnap = await firestore.collection("Usuario").doc(uid).get();
      const user = userSnap.data() || {};
      const docRef = firestore.collection("SolicitacoesMensalidade").doc();

      await docRef.set({
        id: docRef.id,
        uid,
        nome: user.nome || auth.currentUser?.displayName || auth.currentUser?.email || "Prestador",
        email: user.email || auth.currentUser?.email || "",
        valor: amount,
        status: "pendente",
        pixKey: ADMIN_PIX_KEY,
        pixTxid: txid,
        pixCopiaCola: pixPayload,
        dataVencimento: status?.dataVencimento || null,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      });

      setPaymentRequest({ id: docRef.id, status: "pendente", criadoEm: new Date() });
      Alert.alert("Enviado", "Sua solicitacao foi enviada para conferencia do ADM.");
    } catch (e: any) {
      setError(e?.message || "Nao foi possivel enviar a solicitacao.");
      Alert.alert("Erro", "Nao foi possivel enviar a solicitacao.");
    } finally {
      setSending(false);
    }
  };

  const requestDate = toDate(paymentRequest?.criadoEm);
  const topBarIconColor = isDark ? "#2563EB" : "#0F2937";
  const topBarBtnBg = isDark ? theme.headerBtnBg : "rgba(15, 41, 55, 0.06)";
  const cardBg = isDark ? theme.surface : "#FFFFFF";
  const cardBorder = isDark ? theme.surfaceBorder : "transparent";
  const headerBg = isDark ? theme.surface : "#E8F4FB";
  const iconBg = isDark ? "rgba(255,255,255,0.06)" : "#D9EEF7";
  const pendingLabel = paymentRequest?.status || status?.statusPagamento || "Pendente";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.replace("Login"))}
            style={[styles.topBarBtn, { backgroundColor: topBarBtnBg }]}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={topBarIconColor} />
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, { color: isDark ? "#2563EB" : "#0F2937" }]}>Mensalidade</Text>
          <TouchableOpacity
            onPress={async () => {
              await refresh();
              await carregarSolicitacao();
            }}
            style={[styles.topBarBtn, { backgroundColor: topBarBtnBg }]}
            activeOpacity={0.7}
          >
            <RefreshCw size={18} color={topBarIconColor} />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.topHeader,
            { backgroundColor: headerBg, borderColor: cardBorder, borderWidth: isDark ? 1 : 0 },
          ]}
        >
          <View style={[styles.headerIcon, { backgroundColor: iconBg }]}>
            {paid ? (
              <CheckCircle2 size={34} color={theme.surfaceTextPrimary} />
            ) : (
              <CreditCard size={34} color={theme.surfaceTextPrimary} />
            )}
          </View>
          <Text style={[styles.title, { color: theme.surfaceTextPrimary }]}>Pagamento da mensalidade</Text>
          <Text style={[styles.subtitle, { color: theme.surfaceTextMuted }]}>
            Pague pelo Pix e envie a solicitacao para conferencia do ADM.
          </Text>
        </View>

        {(statusLoading || loadingRequest) && <ActivityIndicator style={styles.loading} color="#2563EB" />}
        {!!(error || statusError || pixError) && <Text style={styles.error}>{error || statusError || pixError}</Text>}

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
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.surfaceTextMuted }]}>Valor</Text>
            <Text style={[styles.infoValue, { color: theme.surfaceTextPrimary }]}>R$ {amount.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.surfaceTextMuted }]}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: paid ? "#E6F7EC" : "#FEF3C7" }]}>
              <Text style={[styles.statusText, { color: paid ? "#276A45" : "#92400E" }]}>
                {paid ? "Conta ativa" : pendingLabel}
              </Text>
            </View>
          </View>
          {!!paymentRequest && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.surfaceTextMuted }]}>Enviado em</Text>
                <Text style={[styles.infoValue, { color: theme.surfaceTextPrimary }]}>
                  {requestDate ? requestDate.toLocaleDateString("pt-BR") : "-"}
                </Text>
              </View>
            </>
          )}
        </View>

        {paid ? (
          <View
            style={[
              styles.successBox,
              { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: isDark ? 1 : 0 },
            ]}
          >
            <CheckCircle2 size={22} color="#16A34A" />
            <View style={styles.successTextGroup}>
              <Text style={[styles.successTitle, { color: theme.surfaceTextPrimary }]}>Conta ativa</Text>
              <Text style={[styles.successText, { color: theme.surfaceTextMuted }]}>
                Sua conta ja pode ser utilizada normalmente.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>PIX</Text>
              <View style={styles.sectionUnderline} />
            </View>

            {pixPayload ? (
              <View
                style={[
                  styles.qrCard,
                  { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: isDark ? 1 : 0 },
                ]}
              >
                <View style={styles.qrWrap}>
                  <QRCode value={pixPayload} size={220} />
                </View>
              </View>
            ) : (
              <Text style={[styles.helper, { color: theme.textSecondary }]}>
                Configure sua chave Pix para gerar o QR Code.
              </Text>
            )}

            {!!pixPayload && (
              <View
                style={[
                  styles.copyBox,
                  { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: isDark ? 1 : 0 },
                ]}
              >
                <View style={styles.copyHeader}>
                  <Copy size={18} color="#2563EB" />
                  <Text style={[styles.copyLabel, { color: theme.surfaceTextPrimary }]}>Pix Copia e Cola</Text>
                </View>
                <Text style={[styles.copyText, { color: theme.surfaceTextMuted }]} selectable>
                  {pixPayload}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, (sending || !!paymentRequest || !pixPayload) && styles.disabledBtn]}
              onPress={enviarConfirmacao}
              disabled={sending || !!paymentRequest || !pixPayload}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Send size={18} color="#FFFFFF" />
                  <Text style={styles.primaryText}>Ja paguei, enviar para o ADM</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                { backgroundColor: cardBg, borderColor: isDark ? theme.surfaceBorder : "#DCE7EA" },
              ]}
              onPress={async () => {
                await refresh();
                await carregarSolicitacao();
              }}
              activeOpacity={0.85}
            >
              <RefreshCw size={18} color="#2563EB" />
              <Text style={[styles.secondaryText, { color: theme.surfaceTextPrimary }]}>Atualizar status</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.replace("Login")}>
              <Text style={[styles.linkText, { color: theme.textMuted }]}>Voltar a tela de login</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginBottom: 6,
  },
  topBarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  topHeader: {
    borderRadius: 28,
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 20,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  headerIcon: {
    width: 78,
    height: 78,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
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
  loading: {
    marginVertical: 10,
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
    marginBottom: 20,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  qrCard: {
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#0F2937",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  qrWrap: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
  },
  helper: {
    marginBottom: 14,
    fontSize: 14,
  },
  copyBox: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0F2937",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  copyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  copyLabel: {
    fontWeight: "800",
    fontSize: 14,
  },
  copyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  primaryBtn: {
    minHeight: 50,
    marginTop: 2,
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
    textAlign: "center",
    fontSize: 14,
  },
  disabledBtn: {
    opacity: 0.6,
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
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  error: {
    marginBottom: 14,
    color: "#DC2626",
    fontWeight: "700",
    textAlign: "center",
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#0F2937",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  successTextGroup: {
    flex: 1,
  },
  successTitle: {
    fontWeight: "900",
    marginBottom: 4,
  },
  successText: {
    lineHeight: 20,
  },
});
