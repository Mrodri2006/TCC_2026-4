import { useMemo, useState, useCallback } from "react";
import {
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { DrawerActions, useNavigation, useFocusEffect } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import {
  Bell,
  Calendar,
  ChevronRight,
  MapPin,
  Menu,
  Plus,
  Search,
  User,
  Clock,
  BadgeCheck,
  Ban,
  CircleCheck,
  Loader2,
  Hourglass,
  AlertTriangle,
  X,
} from "lucide-react-native";
import { useTheme } from "../theme/ThemeContext";
import { auth, firestore } from "../firebase";

type ServiceStatus = "pendente" | "andamento" | "concluido" | "cancelado";

type ServicoCard = {
  firestoreId: string;
  clienteNome: string;
  tipoServico: string;
  categoria: string;
  endereco: string;
  dataHora: string;
  valor: string;
  distanciaKm: number;
  status: ServiceStatus;
  avatarUrl?: string;
  clienteId?: string;
  nomeCliente?: string;
  titulo?: string;
  tipo?: string;
  statusFirebase?: string;
  avaliacaoContratanteFeita?: boolean;
};

const TABS: { key: ServiceStatus; label: string }[] = [
  { key: "pendente", label: "Pendentes" },
  { key: "andamento", label: "Em andamento" },
  { key: "concluido", label: "Concluídos" },
  { key: "cancelado", label: "Cancelados" },
];

const CATEGORIAS = [
  "Todas",
  "Elétrica",
  "Hidráulica",
  "Limpeza",
  "Reformas",
  "Pintura",
  "Jardinagem",
];

function statusLabel(status: ServiceStatus) {
  switch (status) {
    case "pendente":
      return "Pendente";
    case "andamento":
      return "Em andamento";
    case "concluido":
      return "Concluído";
    case "cancelado":
      return "Cancelado";
  }
}

function statusPillStyles(status: ServiceStatus) {
  switch (status) {
    case "pendente":
      return { bg: "#FFF7ED", border: "#FDBA74", text: "#9A3412" };
    case "andamento":
      return { bg: "#EFF6FF", border: "#93C5FD", text: "#1D4ED8" };
    case "concluido":
      return { bg: "#ECFDF5", border: "#86EFAC", text: "#166534" };
    case "cancelado":
      return { bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B" };
  }
}

function statusIcon(status: ServiceStatus) {
  switch (status) {
    case "pendente":
      return <Hourglass size={14} color="#9A3412" />;
    case "andamento":
      return <Loader2 size={14} color="#1D4ED8" />;
    case "concluido":
      return <BadgeCheck size={14} color="#166534" />;
    case "cancelado":
      return <Ban size={14} color="#991B1B" />;
  }
}

function mapFirebaseStatusToServiceStatus(status: string): ServiceStatus {
  const s = (status || "").toString().trim().toLowerCase();

  if (s === "realizado" || s === "finalizado" || s === "concluido" || s === "concluído")
    return "concluido";

  if (s === "cancelado" || s === "rejeitado") return "cancelado";

  // Ao aceitar, o app salva como "a fazer" (deve aparecer em Pendentes)
  if (s === "a fazer" || s === "aceito" || s === "aguardando") return "pendente";

  // Demais status que indicam execuÃ§Ã£o do serviÃ§o
  if (s === "em andamento" || s === "andamento" || s === "iniciado" || s === "aguardando_confirmacao") return "andamento";

  return "pendente";
}

export default function Servicos() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useTheme();

  const topBarIconColor = isDark ? theme.textPrimary : "#0F2937";
  const topBarTitleColor = theme.textPrimary;
  const searchPlaceholder = theme.textMuted;
  const searchBoxBg = isDark ? theme.surface : "#FFFFFF";
  const searchBoxBorder = isDark ? theme.surfaceBorder : "rgba(15, 41, 55, 0.08)";
  const searchInputTextColor = theme.textPrimary;
  const tabIdleBg = isDark ? theme.surface : "rgba(255,255,255,0.9)";
  const tabIdleBorder = isDark ? theme.surfaceBorder : "rgba(15, 41, 55, 0.10)";
  const tabIdleText = isDark ? theme.textSecondary : "#0F2937";
  const cardBackground = isDark ? theme.surface : "#FFFFFF";
  const cardBorder = isDark ? theme.surfaceBorder : "rgba(15, 41, 55, 0.06)";
  const pillTextFallback = theme.textPrimary;
  const metaTextColor = theme.textSecondary;
  const detailsButtonBg = isDark ? theme.actionBg : "rgba(37, 99, 235, 0.10)";
  const detailsButtonText = isDark ? theme.textPrimary : "#2563EB";
  const emptyBackground = isDark ? theme.surface : "rgba(255,255,255,0.8)";
  const emptyBorderColor = isDark ? theme.surfaceBorder : "rgba(15, 41, 55, 0.12)";
  const emptyTitleColor = theme.textPrimary;
  const emptySubtitleColor = theme.textMuted;
  const cancelButtonBg = isDark ? theme.actionBg : "rgba(15, 41, 55, 0.06)";
  const cancelButtonBorder = isDark ? theme.surfaceBorder : "rgba(15, 41, 55, 0.12)";
  const concluirButtonBg = isDark ? "rgba(22, 101, 52, 0.18)" : "rgba(34, 197, 94, 0.1)";
  const concluirButtonBorder = isDark ? "rgba(22, 101, 52, 0.35)" : "rgba(34, 197, 94, 0.3)";

  const [aba, setAba] = useState<ServiceStatus>("pendente");
  const [categoria, setCategoria] = useState<string>("Todas");
  const [pesquisa, setPesquisa] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [servicosFirebase, setServicosFirebase] = useState<ServicoCard[]>([]);

  const [detalheVisivel, setDetalheVisivel] = useState(false);
  const [servicoSelecionado, setServicoSelecionado] =
    useState<ServicoCard | null>(null);
  const [acaoFinalizacao, setAcaoFinalizacao] = useState<"finalizar" | "problema">("finalizar");
  const [notaContratante, setNotaContratante] = useState(0);
  const [comentarioContratante, setComentarioContratante] = useState("");
  const [problemaPrestador, setProblemaPrestador] = useState("");
  const [salvandoFinalizacao, setSalvandoFinalizacao] = useState(false);

  useFocusEffect(
    useCallback(() => {
      carregarServicos();
    }, [])
  );

  const carregarServicos = async () => {
    try {
      const usuarioId = auth.currentUser?.uid;
      if (!usuarioId) {
        setCarregando(false);
        return;
      }

      setCarregando(true);

      const docSnap = await firestore
        .collection("ServicosAgendados")
        .doc(usuarioId)
        .collection("ServicoStatus")
        .get();

      const servicos: ServicoCard[] = docSnap.docs.map((doc) => {
        const data = doc.data() as any;
        return {
          firestoreId: doc.id,
          clienteNome: data.nomeCliente || data.clienteNome || "Cliente",
          tipoServico: data.titulo || data.tipo || data.estilo || "Serviço",
          categoria: data.tipo || "Geral",
          endereco: data.endereco || "Endereço não informado",
          dataHora: `${data.data || ""}${data.horario ? " • " + data.horario : ""}`,
          valor: `R$ ${data.valor || "0,00"}`,
          distanciaKm: data.distancia || 0,
          status: mapFirebaseStatusToServiceStatus(data.status),
          clienteId: data.clienteId,
          nomeCliente: data.nomeCliente,
          titulo: data.titulo,
          tipo: data.tipo,
          statusFirebase: data.status,
          avaliacaoContratanteFeita: data.avaliacaoContratanteFeita === true,
        };
      });

      setServicosFirebase(servicos);
    } catch (erro) {
      console.log("Erro ao carregar serviços:", erro);
    } finally {
      setCarregando(false);
    }
  };

  const handleCancelarServico = async (servico: ServicoCard) => {
    const titulo = servico.tipoServico;
    Alert.alert(
      "Cancelar Serviço",
      `Deseja cancelar o serviço "${titulo}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: "destructive",
          onPress: async () => {
            try {
              const usuarioId = auth.currentUser?.uid;
              if (!usuarioId) return;

              await firestore
                .collection("ServicosAgendados")
                .doc(usuarioId)
                .collection("ServicoStatus")
                .doc(servico.firestoreId)
                .set(
                  {
                    status: "cancelado",
                    dataCancelado: new Date(),
                  },
                  { merge: true }
                );

              if (servico.clienteId) {
                await firestore
                  .collection("ServicosClientes")
                  .doc(servico.clienteId)
                  .collection("ServicoStatus")
                  .doc(servico.firestoreId)
                  .set(
                    {
                      status: "cancelado",
                      dataCancelado: new Date(),
                    },
                    { merge: true }
                  );
              }

              setServicosFirebase((prev) =>
                prev.map((item) =>
                  item.firestoreId === servico.firestoreId
                    ? { ...item, status: "cancelado" }
                    : item
                )
              );

              Alert.alert("Sucesso", "Serviço cancelado com sucesso!");
            } catch (erro) {
              console.log("Erro ao cancelar serviço:", erro);
              Alert.alert("Erro", "Não foi possível cancelar o serviço");
            }
          },
        },
      ]
    );
  };

  const abrirAcaoServico = (servico: ServicoCard, acao: "finalizar" | "problema") => {
    if (servico.status === "cancelado") {
      Alert.alert("Atenção", "Serviço cancelado não pode ser marcado como concluído.");
      return;
    }
    setServicoSelecionado(servico);
    setAcaoFinalizacao(acao);
    setNotaContratante(0);
    setComentarioContratante("");
    setProblemaPrestador("");
    setDetalheVisivel(true);
  };

  const enviarAcaoServico = async () => {
    const servico = servicoSelecionado;
    const prestadorId = auth.currentUser?.uid;
    if (!servico || !prestadorId || !servico.clienteId) return;

    if (acaoFinalizacao === "finalizar" && (notaContratante < 1 || notaContratante > 5)) {
      Alert.alert("Avalie o contratante", "Informe uma nota de 1 a 5 antes de concluir.");
      return;
    }
    if (acaoFinalizacao === "problema" && !problemaPrestador.trim()) {
      Alert.alert("Descreva o problema", "Informe o ocorrido para encaminhar ao administrador.");
      return;
    }

    setSalvandoFinalizacao(true);
    try {
      const agora = new Date();
      const status = acaoFinalizacao === "finalizar" ? "aguardando_confirmacao" : "problema";
      const payload = acaoFinalizacao === "finalizar"
        ? {
            status,
            finalizacaoInformadaEm: agora,
            avaliacaoContratanteNota: notaContratante,
            avaliacaoContratanteComentario: comentarioContratante.trim(),
            avaliacaoContratanteData: agora,
            avaliacaoContratanteFeita: true,
          }
        : {
            status,
            problemaRelatado: problemaPrestador.trim(),
            problemaRelatadoPor: "prestador",
            dataAtualizacao: agora,
          };

      const prestadorRef = firestore.collection("ServicosAgendados").doc(prestadorId)
        .collection("ServicoStatus").doc(servico.firestoreId);
      const clienteRef = firestore.collection("ServicosClientes").doc(servico.clienteId)
        .collection("ServicoStatus").doc(servico.firestoreId);
      const batch = firestore.batch();
      batch.set(prestadorRef, payload, { merge: true });
      batch.set(clienteRef, { ...payload, prestadorId, clienteId: servico.clienteId }, { merge: true });

      if (acaoFinalizacao === "problema") {
        const problemaRef = firestore.collection("ProblemasServicos").doc(`${servico.firestoreId}_${prestadorId}`);
        batch.set(problemaRef, {
          servicoId: servico.firestoreId,
          requestId: servico.firestoreId,
          servico: servico.tipoServico,
          clienteId: servico.clienteId,
          prestadorId,
          relatorId: prestadorId,
          relatorTipo: "prestador",
          descricao: problemaPrestador.trim(),
          status: "pendente",
          criadoEm: agora,
        }, { merge: true });
      }

      await batch.commit();
      setServicosFirebase((prev) => prev.map((item) => item.firestoreId === servico.firestoreId
        ? { ...item, status: "andamento", statusFirebase: status, avaliacaoContratanteFeita: acaoFinalizacao === "finalizar" }
        : item));
      setDetalheVisivel(false);
      Alert.alert(
        "Sucesso",
        acaoFinalizacao === "finalizar"
          ? "Finalização informada. Aguardando a confirmação do contratante."
          : "Problema encaminhado ao administrador."
      );
    } catch (erro) {
      console.log("Erro ao atualizar serviço:", erro);
      Alert.alert("Erro", "Não foi possível atualizar o serviço.");
    } finally {
      setSalvandoFinalizacao(false);
    }
  };

  const handleAbrirChatCliente = (servico: ServicoCard) => {
    const rootNavigation = navigation.getParent?.() || navigation;
    rootNavigation.navigate("Chat", {
      otherUserId: servico.clienteId,
      otherUserName: servico.nomeCliente || "Cliente",
    });
  };

  const dados = useMemo(() => {
    const query = pesquisa.trim().toLowerCase();
    return servicosFirebase.filter((s) => {
      if (s.status !== aba) return false;
      if (categoria !== "Todas" && s.categoria !== categoria) return false;
      if (!query) return true;
      return (
        s.clienteNome.toLowerCase().includes(query) ||
        s.tipoServico.toLowerCase().includes(query) ||
        s.endereco.toLowerCase().includes(query)
      );
    });
  }, [aba, categoria, pesquisa, servicosFirebase]);

  const abrirDetalhes = (servico: ServicoCard) => {
    setServicoSelecionado(servico);
    setDetalheVisivel(true);
  };

  const fecharDetalhes = () => {
    setDetalheVisivel(false);
    setServicoSelecionado(null);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.topBarIcon, { backgroundColor: theme.headerBtnBg }]}
            onPress={() => {
              const anyNav = navigation as any;
              if (typeof anyNav?.openDrawer === "function") {
                anyNav.openDrawer();
                return;
              }

              const parent = anyNav?.getParent?.();
              if (typeof parent?.openDrawer === "function") {
                parent.openDrawer();
                return;
              }

              if (typeof parent?.dispatch === "function") {
                parent.dispatch(DrawerActions.openDrawer());
              }
            }}
          >
            <Menu size={24} color={topBarIconColor} />
          </TouchableOpacity>

          <Text style={[styles.topBarTitle, { color: topBarTitleColor }]}>Serviços</Text>

          <TouchableOpacity style={[styles.topBarIcon, { backgroundColor: theme.headerBtnBg }]} onPress={() => {}}>
            <Bell size={22} color={topBarIconColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: searchBoxBg, borderColor: searchBoxBorder }]}> 
            <Search size={18} color={searchPlaceholder} />
            <TextInput
              value={pesquisa}
              onChangeText={setPesquisa}
              placeholder="Pesquisar por cliente, serviço ou endereço"
              placeholderTextColor={searchPlaceholder}
              style={[styles.searchInput, { color: searchInputTextColor }]}
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {TABS.map((t) => {
            const active = t.key === aba;
            return (
              <TouchableOpacity
                key={t.key}
                activeOpacity={0.9}
                style={[
                  styles.tab,
                  active ? styles.tabActive : styles.tabIdle,
                  !active && { backgroundColor: tabIdleBg, borderColor: tabIdleBorder },
                ]}
                onPress={() => setAba(t.key)}
              >
                <Text style={[styles.tabText, active ? styles.tabTextActive : [styles.tabTextIdle, { color: tabIdleText }]]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {carregando ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={[styles.emptySubtitle, { color: emptySubtitleColor }]}>Carregando serviços...</Text>
          </View>
        ) : (
          <FlatList
            data={dados}
            keyExtractor={(item) => item.firestoreId}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 8 }}
            ListEmptyComponent={
              <View style={[styles.empty, { backgroundColor: emptyBackground, borderColor: emptyBorderColor }]}> 
                <Text style={[styles.emptyTitle, { color: emptyTitleColor }]}>Nada por aqui</Text>
                <Text style={[styles.emptySubtitle, { color: emptySubtitleColor }]}> 
                  Ajuste filtros ou aguarde novas solicitações.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const pill = statusPillStyles(item.status);
              return (
                <View style={[styles.card, { backgroundColor: cardBackground, borderColor: cardBorder }]}> 
                  <View style={styles.cardTop}>
                    <View style={styles.userRow}>
                      {item.avatarUrl ? (
                        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarFallbackText}>
                            {item.clienteNome.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.clientName}>{item.clienteNome}</Text>
                        <Text style={styles.serviceType}>{item.tipoServico}</Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: pill.bg, borderColor: pill.border },
                      ]}
                    >
                      {statusIcon(item.status)}
                      <Text style={[styles.statusText, { color: pill.text }]}>
                        {item.statusFirebase === "aguardando_confirmacao"
                          ? "Aguardando contratante"
                          : item.statusFirebase === "problema"
                            ? "Em análise pelo ADM"
                            : statusLabel(item.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <MapPin size={16} color={metaTextColor} />
                    <Text style={[styles.metaText, { color: metaTextColor }]} numberOfLines={1}>
                      {item.endereco}
                    </Text>
                  </View>

                  <View style={styles.metaGrid}>
                    <View style={styles.metaCell}>
                      <Calendar size={16} color={metaTextColor} />
                      <Text style={[styles.metaText, { color: metaTextColor }]}>{item.dataHora || "Data não informada"}</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Clock size={16} color={metaTextColor} />
                      <Text style={[styles.metaText, { color: metaTextColor }]}>{item.valor}</Text>
                    </View>
                  </View>

                  <View style={styles.cardBottom}>
                    <View style={styles.priceWrap}>
                      <Text style={styles.priceLabel}>Ações</Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={[styles.detailsButton, { backgroundColor: detailsButtonBg }]}
                      onPress={() => {
                        if (item.clienteId) {
                          handleAbrirChatCliente(item);
                        }
                      }}
                    >
                      <Text style={[styles.detailsText, { color: detailsButtonText }]}>Conversar</Text>
                      <ChevronRight size={18} color="#2563EB" />
                    </TouchableOpacity>

                    {item.status !== "cancelado" && item.statusFirebase !== "aguardando_confirmacao" && item.statusFirebase !== "realizado" && item.statusFirebase !== "problema" && (
                      <TouchableOpacity
                        style={styles.concluirBtn}
                        onPress={() => abrirAcaoServico(item, "finalizar")}
                        activeOpacity={0.85}
                      >
                        <CircleCheck size={16} color="#166534" />
                      </TouchableOpacity>
                    )}

                    {item.status !== "cancelado" && item.statusFirebase !== "realizado" && (
                      <TouchableOpacity
                        style={styles.problemBtn}
                        onPress={() => abrirAcaoServico(item, "problema")}
                        activeOpacity={0.85}
                      >
                        <AlertTriangle size={16} color="#B45309" />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.cancelBtn, { backgroundColor: cancelButtonBg, borderColor: cancelButtonBorder }]}
                      onPress={() => handleCancelarServico(item)}
                      activeOpacity={0.85}
                    >
                      <X size={16} color="#991B1B" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}
      </ScrollView>

      <Modal visible={detalheVisivel} transparent animationType="fade" onRequestClose={() => setDetalheVisivel(false)}>
        <View style={styles.actionModalOverlay}>
          <View style={[styles.actionModal, { backgroundColor: cardBackground, borderColor: cardBorder }]}>
            <Text style={[styles.actionModalTitle, { color: theme.textPrimary }]}>
              {acaoFinalizacao === "finalizar" ? "Informar finalização" : "Relatar problema"}
            </Text>
            <Text style={[styles.actionModalSubtitle, { color: theme.textMuted }]}>{servicoSelecionado?.tipoServico}</Text>

            {acaoFinalizacao === "finalizar" ? (
              <>
                <Text style={[styles.actionLabel, { color: theme.textPrimary }]}>Avalie o contratante</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((valor) => (
                    <TouchableOpacity key={valor} onPress={() => setNotaContratante(valor)} style={styles.starButton}>
                      <Text style={[styles.starText, { color: valor <= notaContratante ? "#F59E0B" : "#CBD5E1" }]}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.actionInput, { color: theme.textPrimary, borderColor: cardBorder }]}
                  placeholder="Comentário sobre o contratante (opcional)"
                  placeholderTextColor={theme.textMuted}
                  value={comentarioContratante}
                  onChangeText={setComentarioContratante}
                  multiline
                />
              </>
            ) : (
              <TextInput
                style={[styles.actionInput, styles.problemInput, { color: theme.textPrimary, borderColor: cardBorder }]}
                placeholder="Descreva o problema para o administrador..."
                placeholderTextColor={theme.textMuted}
                value={problemaPrestador}
                onChangeText={setProblemaPrestador}
                multiline
              />
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity style={[styles.actionButton, styles.actionCancel]} onPress={() => setDetalheVisivel(false)} disabled={salvandoFinalizacao}>
                <Text style={{ color: theme.textPrimary, fontWeight: "800" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.actionConfirm]} onPress={enviarAcaoServico} disabled={salvandoFinalizacao}>
                {salvandoFinalizacao ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.actionConfirmText}>Enviar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 36,
    paddingHorizontal: 16,
  },
  cancelBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 41, 55, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(15, 41, 55, 0.12)",
  },
  concluirBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  problemBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  actionModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.48)", justifyContent: "center", padding: 20 },
  actionModal: { borderRadius: 22, borderWidth: 1, padding: 20 },
  actionModalTitle: { fontSize: 20, fontWeight: "900" },
  actionModalSubtitle: { fontSize: 14, marginTop: 4, marginBottom: 18 },
  actionLabel: { fontSize: 14, fontWeight: "800", marginBottom: 6 },
  starsRow: { flexDirection: "row", marginBottom: 14 },
  starButton: { paddingRight: 9, paddingVertical: 4 },
  starText: { fontSize: 30 },
  actionInput: { minHeight: 86, borderWidth: 1, borderRadius: 14, padding: 12, textAlignVertical: "top" },
  problemInput: { minHeight: 120 },
  actionButtons: { flexDirection: "row", gap: 12, marginTop: 18 },
  actionButton: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionCancel: { backgroundColor: "rgba(148,163,184,0.15)" },
  actionConfirm: { backgroundColor: "#2563EB" },
  actionConfirmText: { color: "#FFFFFF", fontWeight: "900" },
  screen: { flex: 1 },
  container: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 160,
    paddingTop: 16,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginTop: 40,
    marginBottom: 6,
  },
  topBarTitle: { fontSize: 22, fontWeight: "800", color: "#0F2937" },
  topBarIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 41, 55, 0.06)",
  },

  searchRow: { gap: 12, marginBottom: 12 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 41, 55, 0.08)",
    shadowColor: "#0F2937",
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0F2937" },
  categoryBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15, 41, 55, 0.08)",
    overflow: "hidden",
  },
  categoryPicker: { height: 46 },

  tabsRow: { gap: 10, paddingVertical: 10, paddingRight: 10 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  tabIdle: { backgroundColor: "rgba(255,255,255,0.9)", borderColor: "rgba(15, 41, 55, 0.10)" },
  tabText: { fontSize: 13, fontWeight: "800" },
  tabTextActive: { color: "#fff" },
  tabTextIdle: { color: "#0F2937" },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginTop: 12,
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(15, 41, 55, 0.06)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  userRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#E2E8F0" },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { color: "#1D4ED8", fontWeight: "900" },
  clientName: { fontSize: 15, fontWeight: "900", color: "#0F2937" },
  serviceType: { marginTop: 2, fontSize: 13, color: "#64748B", fontWeight: "600" },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: { fontSize: 12, fontWeight: "900" },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  metaGrid: { flexDirection: "row", gap: 12 },
  metaCell: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { flex: 1, fontSize: 13, color: "#64748B", fontWeight: "600" },

  cardBottom: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  priceWrap: {},
  priceLabel: { fontSize: 12, color: "#94A3B8", fontWeight: "700" },
  priceValue: { marginTop: 3, fontSize: 16, fontWeight: "900", color: "#0F2937" },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(37, 99, 235, 0.10)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  detailsText: { fontSize: 13, fontWeight: "900", color: "#2563EB" },

  empty: {
    marginTop: 18,
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(15, 41, 55, 0.12)",
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: "#0F2937" },
  emptySubtitle: { marginTop: 8, fontSize: 13, color: "#64748B", textAlign: "center", lineHeight: 18 },

  fab: {
    position: "absolute",
    right: 18,
    bottom: 88,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F2937",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },

  bottomNav: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    height: 64,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15, 41, 55, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#0F2937",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  bottomItem: { alignItems: "center", justifyContent: "center", gap: 4, flex: 1 },
  bottomItemActive: {},
  bottomLabel: { fontSize: 12, color: "#64748B", fontWeight: "700" },
  bottomLabelActive: { color: "#2563EB", fontWeight: "900" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 41, 55, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#0F2937" },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(15, 41, 55, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalLine: { fontSize: 13, color: "#0F2937", marginBottom: 8, lineHeight: 18 },
  modalKey: { fontWeight: "900" },
});
