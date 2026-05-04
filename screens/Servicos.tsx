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
  if (s === "em andamento" || s === "andamento" || s === "iniciado") return "andamento";

  return "pendente";
}

export default function Servicos() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const [aba, setAba] = useState<ServiceStatus>("pendente");
  const [categoria, setCategoria] = useState<string>("Todas");
  const [pesquisa, setPesquisa] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [servicosFirebase, setServicosFirebase] = useState<ServicoCard[]>([]);

  const [detalheVisivel, setDetalheVisivel] = useState(false);
  const [servicoSelecionado, setServicoSelecionado] =
    useState<ServicoCard | null>(null);

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

  const handleMarcarComoConcluido = async (servico: ServicoCard) => {
    if (servico.status === "cancelado") {
      Alert.alert("Atenção", "Serviço cancelado não pode ser marcado como concluído.");
      return;
    }

    const titulo = servico.tipoServico;

    Alert.alert(
      "Marcar como Concluído",
      `Deseja marcar o serviço "${titulo}" como concluído?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: "default",
          onPress: async () => {
            try {
              const usuarioId = auth.currentUser?.uid;
              if (!usuarioId) return;

              await firestore
                .collection("ServicosAgendados")
                .doc(usuarioId)
                .collection("ServicoStatus")
                .doc(servico.firestoreId)
                .update({
                  status: "realizado",
                  dataFinalizado: new Date(),
                });

              setServicosFirebase((prev) =>
                prev.map((item) =>
                  item.firestoreId === servico.firestoreId
                    ? { ...item, status: "concluido" }
                    : item
                )
              );

              Alert.alert("Sucesso", "Serviço marcado como concluído!");
            } catch (erro) {
              console.log("Erro ao marcar serviço como concluído:", erro);
              Alert.alert("Erro", "Não foi possível marcar o serviço como concluído");
            }
          },
        },
      ]
    );
  };

  const handleAbrirChatCliente = (servico: ServicoCard) => {
    navigation.navigate("Chat", {
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
            style={styles.topBarIcon}
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
            <Menu size={24} color="#0F2937" />
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>Serviços</Text>

          <TouchableOpacity style={styles.topBarIcon} onPress={() => {}}>
            <Bell size={22} color="#0F2937" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={18} color="#64748B" />
            <TextInput
              value={pesquisa}
              onChangeText={setPesquisa}
              placeholder="Pesquisar por cliente, serviço ou endereço"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
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
                style={[styles.tab, active ? styles.tabActive : styles.tabIdle]}
                onPress={() => setAba(t.key)}
              >
                <Text style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextIdle]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {carregando ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.emptySubtitle}>Carregando serviços...</Text>
          </View>
        ) : (
          <FlatList
            data={dados}
            keyExtractor={(item) => item.firestoreId}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 8 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Nada por aqui</Text>
                <Text style={styles.emptySubtitle}>
                  Ajuste filtros ou aguarde novas solicitações.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const pill = statusPillStyles(item.status);
              return (
                <View style={styles.card}>
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
                        {statusLabel(item.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <MapPin size={16} color="#64748B" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.endereco}
                    </Text>
                  </View>

                  <View style={styles.metaGrid}>
                    <View style={styles.metaCell}>
                      <Calendar size={16} color="#64748B" />
                      <Text style={styles.metaText}>{item.dataHora || "Data não informada"}</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Clock size={16} color="#64748B" />
                      <Text style={styles.metaText}>{item.valor}</Text>
                    </View>
                  </View>

                  <View style={styles.cardBottom}>
                    <View style={styles.priceWrap}>
                      <Text style={styles.priceLabel}>Ações</Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.detailsButton}
                      onPress={() => {
                        if (item.clienteId) {
                          handleAbrirChatCliente(item);
                        }
                      }}
                    >
                      <Text style={styles.detailsText}>Conversar</Text>
                      <ChevronRight size={18} color="#2563EB" />
                    </TouchableOpacity>

                    {item.status !== "cancelado" && (
                      <TouchableOpacity
                        style={styles.concluirBtn}
                        onPress={() => handleMarcarComoConcluido(item)}
                        activeOpacity={0.85}
                      >
                        <CircleCheck size={16} color="#166534" />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.cancelBtn}
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
  screen: { flex: 1 },
  container: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 160,
    paddingTop: Platform.OS === "android" ? 10 : 0,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "android" ? 16 : 10,
    paddingBottom: 10,
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
