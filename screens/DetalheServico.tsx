import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowLeft, Calendar, CheckCircle, Clock, MapPin, MessageCircle, TriangleAlert } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import firebase from "firebase/compat/app";
import { auth, firestore, functions } from "../firebase";
import { ServiceTimeline } from "../components/ServiceTimeline";
import { normalizeServiceStatus, serviceStatusLabel, ServiceStatus } from "../domain/service";
import { useTheme } from "../theme/ThemeContext";

const money = (value: any) => `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;

export default function DetalheServico() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const params = route.params || {};
  const initial = params.servico || {};
  const currentUid = auth.currentUser?.uid;

  const prestadorId = String(params.prestadorId || initial.prestadorId || currentUid || "");
  const clienteId = String(params.clienteId || initial.clienteId || "");
  const servicoId = String(params.servicoId || initial.id || initial.firestoreId || "");
  const viewerRole = currentUid && currentUid === prestadorId ? "prestador" : "contratante";
  const [servico, setServico] = useState<any>(initial);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState("");

  useEffect(() => {
    if (!servicoId || !currentUid) {
      setLoading(false);
      return;
    }

    const ref = viewerRole === "prestador"
      ? firestore.collection("ServicosAgendados").doc(prestadorId).collection("ServicoStatus").doc(servicoId)
      : firestore.collection("ServicosClientes").doc(currentUid).collection("ServicoStatus").doc(servicoId);

    return ref.onSnapshot(
      (snapshot) => {
        setServico({ id: snapshot.id, ...initial, ...(snapshot.data() || {}) });
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [servicoId, currentUid, prestadorId, viewerRole]);

  const status = normalizeServiceStatus(servico?.status);
  const proposal = servico?.currentProposal;
  const canChange = ![ServiceStatus.CONCLUIDO, ServiceStatus.AVALIADO, ServiceStatus.CANCELADO, ServiceStatus.PROBLEMA].includes(status);
  const otherUserId = viewerRole === "prestador" ? servico?.clienteId : servico?.prestadorId;
  const otherUserName = viewerRole === "prestador"
    ? servico?.nomeCliente || servico?.clienteNome || "Cliente"
    : servico?.prestadorNome || "Prestador";

  const statusActions = useMemo(() => {
    if (!canChange) return [];
    if (viewerRole === "prestador") {
      const actions: Array<{ label: string; status: string; tone?: "primary" | "warning" }> = [];
      if (status === ServiceStatus.PROPOSTA_ACEITA) actions.push({ label: "Marcar a caminho", status: "a_caminho" });
      if ([ServiceStatus.PROPOSTA_ACEITA, ServiceStatus.A_CAMINHO].includes(status)) actions.push({ label: "Iniciar atendimento", status: "execucao" });
      if ([ServiceStatus.PROPOSTA_ACEITA, ServiceStatus.A_CAMINHO, ServiceStatus.EM_ANDAMENTO, ServiceStatus.EM_EXECUCAO].includes(status)) {
        actions.push({ label: "Informar conclusão", status: "aguardando_confirmacao" });
      }
      actions.push({ label: "Relatar problema", status: "problema", tone: "warning" });
      return actions;
    }

    if (status === ServiceStatus.AGUARDANDO_CONFIRMACAO) {
      return [
        { label: "Confirmar conclusão", status: "realizado" },
        { label: "Relatar problema", status: "problema", tone: "warning" as const },
      ];
    }
    return canChange ? [{ label: "Relatar problema", status: "problema", tone: "warning" as const }] : [];
  }, [canChange, status, viewerRole]);

  const atualizarStatusLocal = async (nextStatus: string) => {
    const prestadorIdAtual = String(servico?.prestadorId || prestadorId || "");
    const clienteIdAtual = String(servico?.clienteId || clienteId || "");
    if (!servicoId || !prestadorIdAtual || !clienteIdAtual || !currentUid) {
      throw new Error("Dados do serviço incompletos.");
    }

    const actor = currentUid === prestadorIdAtual ? "prestador" : currentUid === clienteIdAtual ? "contratante" : "admin";
    const payload = {
      ...servico,
      id: servico?.id || servicoId,
      prestadorId: prestadorIdAtual,
      clienteId: clienteIdAtual,
      status: nextStatus,
      dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp(),
      atualizadoPor: currentUid,
      timeline: firebase.firestore.FieldValue.arrayUnion({
        status: nextStatus,
        actor,
        actorId: currentUid,
        at: new Date(),
      }),
      ...(nextStatus === "realizado"
        ? { dataFinalizado: firebase.firestore.FieldValue.serverTimestamp(), avaliacaoLiberada: true }
        : {}),
    };

    const batch = firestore.batch();
    batch.set(
      firestore.collection("ServicosAgendados").doc(prestadorIdAtual).collection("ServicoStatus").doc(servicoId),
      payload,
      { merge: true }
    );
    batch.set(
      firestore.collection("ServicosClientes").doc(clienteIdAtual).collection("ServicoStatus").doc(servicoId),
      payload,
      { merge: true }
    );
    await batch.commit();
  };

  const atualizarStatus = async (nextStatus: string) => {
    if (!servicoId || !servico?.prestadorId || !servico?.clienteId) {
      Alert.alert("Serviço", "Dados do serviço incompletos.");
      return;
    }
    try {
      setSavingStatus(nextStatus);
      await functions.httpsCallable("atualizarStatusServico")({
        prestadorId: servico.prestadorId,
        clienteId: servico.clienteId,
        servicoId,
        status: nextStatus,
      });
      if (nextStatus === "realizado") {
        navigation.navigate("Avaliacao", { servico: { ...servico, id: servicoId } });
      }
    } catch (error: any) {
      const errorText = String(error?.code || error?.message || "");
      if (errorText.includes("not-found") || errorText.includes("unavailable") || errorText.includes("internal")) {
        try {
          await atualizarStatusLocal(nextStatus);
          if (nextStatus === "realizado") {
            navigation.navigate("Avaliacao", { servico: { ...servico, id: servicoId, status: nextStatus } });
          }
          return;
        } catch (fallbackError: any) {
          Alert.alert("Serviço", fallbackError?.message || "Não foi possível atualizar o status.");
          return;
        }
      }
      Alert.alert("Serviço", error?.message?.replace(/^.*?:\s*/, "") || "Não foi possível atualizar o status.");
    } finally {
      setSavingStatus("");
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.headerBtnBg }]} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Detalhe do serviço</Text>
          <View style={{ width: 44 }} />
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#FF8700" />
            <Text style={[styles.muted, { color: theme.textMuted }]}>Carregando...</Text>
          </View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.serviceName, { color: theme.textPrimary }]}>
                {servico?.estilo || servico?.tipo || "Serviço"}
              </Text>
              <Text style={[styles.statusText, { color: "#E86F00" }]}>{serviceStatusLabel(servico?.status)}</Text>
              {!!servico?.descricao && <Text style={[styles.description, { color: theme.textMuted }]}>{servico.descricao}</Text>}

              <View style={styles.metaRow}><Calendar size={16} color={theme.textMuted} /><Text style={[styles.meta, { color: theme.textMuted }]}>{servico?.data || "Data não informada"}</Text></View>
              <View style={styles.metaRow}><Clock size={16} color={theme.textMuted} /><Text style={[styles.meta, { color: theme.textMuted }]}>{servico?.horario || "Horário não informado"}</Text></View>
              <View style={styles.metaRow}><MapPin size={16} color={theme.textMuted} /><Text style={[styles.meta, { color: theme.textMuted }]}>{servico?.local || servico?.endereco || "Local não informado"}</Text></View>
            </View>

            {proposal ? (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Proposta</Text>
                {[
                  ["Mão de obra", proposal.laborAmount],
                  ["Materiais", proposal.materialsAmount],
                  ["Deslocamento", proposal.travelFee],
                  ["Desconto", proposal.discount],
                  ["Total", proposal.totalAmount],
                ].map(([label, value]) => (
                  <View key={String(label)} style={styles.proposalLine}>
                    <Text style={[styles.meta, { color: theme.textMuted }]}>{label}</Text>
                    <Text style={[styles.proposalValue, { color: theme.textPrimary }]}>{money(value)}</Text>
                  </View>
                ))}
                {!!proposal.notes && <Text style={[styles.description, { color: theme.textMuted }]}>{proposal.notes}</Text>}
              </View>
            ) : null}

            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Acompanhamento</Text>
              <ServiceTimeline status={servico?.status} events={Array.isArray(servico?.timeline) ? servico.timeline : []} />
            </View>

            <View style={styles.actions}>
              {!!otherUserId && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.chatButton]}
                  onPress={() => navigation.navigate("Chat", { otherUserId, otherUserName })}
                >
                  <MessageCircle size={18} color="#FFFFFF" />
                  <Text style={styles.actionText}>Conversar</Text>
                </TouchableOpacity>
              )}
              {statusActions.map((action) => (
                <TouchableOpacity
                  key={action.status}
                  style={[styles.actionButton, action.tone === "warning" ? styles.warningButton : styles.primaryButton]}
                  onPress={() => atualizarStatus(action.status)}
                  disabled={!!savingStatus}
                >
                  {action.tone === "warning" ? <TriangleAlert size={18} color="#0F2937" /> : <CheckCircle size={18} color="#FFFFFF" />}
                  <Text style={[styles.actionText, action.tone === "warning" && styles.warningText]}>
                    {savingStatus === action.status ? "Atualizando..." : action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  iconButton: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "900" },
  loadingBox: { minHeight: 180, alignItems: "center", justifyContent: "center" },
  muted: { marginTop: 8, fontSize: 13, fontWeight: "700" },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
  serviceName: { fontSize: 19, fontWeight: "900" },
  statusText: { marginTop: 5, fontSize: 12, fontWeight: "900" },
  sectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10 },
  description: { marginTop: 10, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  meta: { fontSize: 13, fontWeight: "700" },
  proposalLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  proposalValue: { fontSize: 13, fontWeight: "900" },
  actions: { gap: 10, marginTop: 4 },
  actionButton: { minHeight: 50, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryButton: { backgroundColor: "#FF8700" },
  chatButton: { backgroundColor: "#0F2937" },
  warningButton: { backgroundColor: "#FDE68A" },
  actionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  warningText: { color: "#0F2937" },
});
