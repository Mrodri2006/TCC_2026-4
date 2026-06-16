import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  const { theme } = useTheme();
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

  const paid = !!status && status.contaAtiva !== false && status.assinaturaAtiva !== false && status.statusPagamento !== "inadimplente";

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
      setError(e?.message || "Erro ao consultar solicitação.");
    } finally {
      setLoadingRequest(false);
    }
  };

  useEffect(() => {
    carregarSolicitacao();
  }, [uid]);

  const enviarConfirmacao = async () => {
    if (!uid) {
      Alert.alert("Erro", "Usuário não autenticado.");
      return;
    }
    if (!pixPayload) {
      Alert.alert("PIX", "Configure a chave Pix antes de enviar solicitações.");
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
      Alert.alert("Enviado", "Sua solicitação foi enviada para conferência do ADM.");
    } catch (e: any) {
      setError(e?.message || "Não foi possível enviar a solicitação.");
      Alert.alert("Erro", "Não foi possível enviar a solicitação.");
    } finally {
      setSending(false);
    }
  };

  const requestDate = toDate(paymentRequest?.criadoEm);

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Pagamento da mensalidade</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Pague pelo Pix e envie a solicitação para conferência do ADM.
      </Text>

      {(statusLoading || loadingRequest) && <ActivityIndicator style={{ marginTop: 10 }} />}
      {!!(error || statusError || pixError) && <Text style={styles.error}>{error || statusError || pixError}</Text>}

      <View style={styles.card}>
        <Text style={styles.row}>
          Valor: <Text style={styles.value}>R$ {amount.toFixed(2)}</Text>
        </Text>
        <Text style={styles.row}>
          Status: <Text style={styles.value}>{paid ? "Conta ativa" : paymentRequest?.status || status?.statusPagamento || "Pendente"}</Text>
        </Text>
        {!!paymentRequest && (
          <Text style={styles.row}>
            Enviado em: <Text style={styles.value}>{requestDate ? requestDate.toLocaleDateString("pt-BR") : "-"}</Text>
          </Text>
        )}
      </View>

      {paid ? (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>Conta ativa</Text>
          <Text style={styles.successText}>Sua conta já pode ser utilizada normalmente.</Text>
        </View>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>PIX</Text>

          {pixPayload ? (
            <View style={styles.qrWrap}>
              <QRCode value={pixPayload} size={230} />
            </View>
          ) : (
            <Text style={[styles.helper, { color: theme.textSecondary }]}>Configure sua chave Pix para gerar o QR Code.</Text>
          )}

          {!!pixPayload && (
            <View style={styles.copyBox}>
              <Text style={styles.copyLabel}>Pix Copia e Cola</Text>
              <Text style={styles.copyText} selectable>
                {pixPayload}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, (sending || !!paymentRequest || !pixPayload) && styles.disabledBtn]}
            onPress={enviarConfirmacao}
            disabled={sending || !!paymentRequest || !pixPayload}
          >
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Já paguei, enviar para o ADM</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={async () => {
              await refresh();
              await carregarSolicitacao();
            }}
          >
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
  qrWrap: { alignItems: "center", backgroundColor: "#fff", padding: 16, borderRadius: 14 },
  helper: { marginTop: 8 },
  copyBox: { marginTop: 12, backgroundColor: "#0B1220", padding: 12, borderRadius: 12 },
  copyLabel: { color: "#93C5FD", fontWeight: "800", marginBottom: 6 },
  copyText: { color: "#E5E7EB", fontSize: 12 },
  primaryBtn: { marginTop: 16, backgroundColor: "#0EA5A8", padding: 14, borderRadius: 12, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "800", textAlign: "center" },
  disabledBtn: { opacity: 0.6 },
  secondaryBtn: { marginTop: 12, padding: 12, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  secondaryText: { color: "#E2E8F0", fontWeight: "700" },
  error: { marginTop: 10, color: "#FCA5A5" },
  successBox: { marginTop: 18, backgroundColor: "#052E2B", borderRadius: 14, padding: 16 },
  successTitle: { color: "#A7F3D0", fontWeight: "900", marginBottom: 4 },
  successText: { color: "#D1FAE5" },
});
