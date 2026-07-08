import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  BarChart3,
  Bell,
  CircleCheck,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  MapPin,
  Plus,
  Settings,
  X,
} from "lucide-react-native";
import { Calendar } from "lucide-react-native";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";
import { LocationVisibilityCard } from "../components/LocationVisibilityCard";
import { proposalTotal } from "../domain/service";
import { sendServiceProposal } from "../services/serviceService";
import { ProviderDashboard } from "../components/ProviderDashboard";
import { BottomSheet } from "../components/ui";

const emptyProposal = { labor: "", materials: "0", travel: "0", discount: "0", deadline: "1", validity: "7", notes: "" };
const parseMoney = (value: string) => Number(value.replace(",", ".")) || 0;

export default function HomeTrabalhador() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useTheme();

  const topBarIconColor = isDark ? "#FF8700" : "#0F2937";
  const topBarBtnBg = isDark ? theme.headerBtnBg : "rgba(15, 41, 55, 0.06)";
  const cardBackground = isDark ? theme.surface : "#FFFFFF";
  const sectionBackground = isDark ? theme.surface : "#FFF4E5";
  const cardBorderColor = isDark ? theme.surfaceBorder : "#FF8700";
  const neutralBackground = isDark ? "rgba(255,255,255,0.06)" : "rgba(255, 135, 0, 0.08)";
  const sectionTextColor = theme.textPrimary;
  const mutedTextColor = theme.textMuted;

  const [servicosSolicitados, setServicosSolicitados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [alertVisivel, setAlertVisivel] = useState(false);
  const [servicoAceito, setServicoAceito] = useState<any>(null);
  const [servicoRejeitado, setServicoRejeitado] = useState<any>(null);
  const [modalValorVisivel, setModalValorVisivel] = useState(false);
  const [servicoParaValor, setServicoParaValor] = useState<any>(null);
  const [proposal, setProposal] = useState(emptyProposal);
  const [enviandoValor, setEnviandoValor] = useState(false);

  const unsubscribeRef = useRef<any>(null);
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(brandOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.spring(brandScale, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
    ]);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(brandScale, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
        Animated.timing(brandScale, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    entrance.start(({ finished }) => finished && pulse.start());
    return () => {
      entrance.stop();
      pulse.stop();
    };
  }, [brandOpacity, brandScale]);

  useFocusEffect(
    useCallback(() => {
      carregarServicosSolicitados();

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
      };
    }, [])
  );

  const carregarServicosSolicitados = () => {
    const usuarioId = auth.currentUser?.uid;

    if (!usuarioId) {
      setCarregando(false);
      return;
    }

    setCarregando(true);

    unsubscribeRef.current = firestore
      .collection("ServicosAgendados")
      .doc(usuarioId)
      .collection("ServicoStatus")
      .onSnapshot(
        async (snapshot) => {
          const servicos: any[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();

            if (data.prestadorId && data.prestadorId !== usuarioId) {
              return;
            }

            const status = data.status;
            const statusValido =
              status === "aguardando" ||
              status === "não realizado" ||
              status === "nao realizado";

            if (statusValido) {
              servicos.push({
                id: doc.id,
                ...data,
                prestadorId: usuarioId,
              });
            }
          });

          const clientesIds = Array.from(new Set(
            servicos.map((servico) => String(servico.clienteId || "")).filter(Boolean)
          ));
          const nomesClientes = new Map<string, string>();
          await Promise.all(clientesIds.map(async (clienteId) => {
            try {
              const clienteSnapshot = await firestore.collection("Usuario").doc(clienteId).get();
              const nome = String(clienteSnapshot.data()?.nome || "").trim();
              if (nome) nomesClientes.set(clienteId, nome);
            } catch {
              // O nome já salvo no serviço continua sendo usado como contingência.
            }
          }));

          const servicosComContratante = servicos.map((servico) => ({
            ...servico,
            nomeCliente: nomesClientes.get(String(servico.clienteId || ""))
              || servico.nomeCliente
              || servico.clienteNome
              || "Cliente",
          }));

          setServicosSolicitados(servicosComContratante);
          setCarregando(false);
        },
        (error) => {
          console.error("Erro ao buscar serviços:", error);
          setCarregando(false);
        }
      );
  };

  const abrirModalValor = (servico: any) => {
    setServicoParaValor(servico);
    setProposal(emptyProposal);
    setModalValorVisivel(true);
  };

  const fecharModalValor = () => {
    if (enviandoValor) return;
    setModalValorVisivel(false);
    setServicoParaValor(null);
    setProposal(emptyProposal);
  };

  const handleAceitarServico = async () => {
    const servico = servicoParaValor;
    const laborAmount = parseMoney(proposal.labor);
    const materialsAmount = parseMoney(proposal.materials);
    const travelFee = parseMoney(proposal.travel);
    const discount = parseMoney(proposal.discount);
    const totalAmount = proposalTotal({ laborAmount, materialsAmount, travelFee, discount });

    if (!servico) {
      Alert.alert("Erro", "Serviço não selecionado");
      return;
    }

    if (!proposal.labor.trim() || laborAmount < 0 || totalAmount <= 0 || discount > laborAmount + materialsAmount + travelFee) {
      Alert.alert("Revise a proposta", "Informe valores válidos e um total maior que zero.");
      return;
    }

    try {
      const usuarioId = auth.currentUser?.uid;

      if (!usuarioId) {
        Alert.alert("Erro", "Usuário não autenticado");
        return;
      }

      setEnviandoValor(true);
      if (!servico.clienteId) throw new Error("client-not-found");
      await sendServiceProposal({
        serviceId: servico.id, clientId: servico.clienteId,
        laborAmount, materialsAmount, travelFee, discount,
        deadlineDays: Number(proposal.deadline), validityDays: Number(proposal.validity), notes: proposal.notes,
      });

      if (servico.origem === "area" && servico.requestId) {
        const agora = new Date();
        await firestore
          .collection("SolicitacoesArea")
          .doc(servico.requestId)
          .set(
            {
              status: "valor_pendente",
              valor: totalAmount,
              valorProposto: totalAmount,
              propostoPor: usuarioId,
              dataPropostaValor: agora,
            },
            { merge: true }
          );
      }

      setServicoAceito(servico);
      setServicoRejeitado(null);
      setModalValorVisivel(false);
      setServicoParaValor(null);
      setProposal(emptyProposal);
      setAlertVisivel(true);
    } catch (erro) {
      console.error("Erro ao aceitar serviço:", erro);
      Alert.alert("Erro", "Não foi possível aceitar o serviço");
    } finally {
      setEnviandoValor(false);
    }
  };

  const handleRejeitarServico = async (servico: any) => {
    try {
      const usuarioId = auth.currentUser?.uid;

      if (!usuarioId) {
        Alert.alert("Erro", "Usuário não autenticado");
        return;
      }

      const agora = new Date();
      const batch = firestore.batch();
      const rejeitadoRef = firestore
        .collection("ServicosRejeitados")
        .doc(usuarioId)
        .collection("ServicoStatus")
        .doc(servico.id);
      const agendadoRef = firestore
        .collection("ServicosAgendados")
        .doc(usuarioId)
        .collection("ServicoStatus")
        .doc(servico.id);

      batch.set(rejeitadoRef, {
        ...servico,
        prestadorId: usuarioId,
        status: "rejeitado",
        dataRejeicao: agora,
      });

      batch.set(
        agendadoRef,
        {
          status: "rejeitado",
          dataRejeicao: agora,
        },
        { merge: true }
      );

      if (servico.clienteId) {
        const servicoClienteRef = firestore
          .collection("ServicosClientes")
          .doc(servico.clienteId)
          .collection("ServicoStatus")
          .doc(servico.id);

        batch.set(
          servicoClienteRef,
          {
            prestadorId: usuarioId,
            clienteId: servico.clienteId,
            status: "rejeitado",
            dataRejeicao: agora,
          },
          { merge: true }
        );
      }

      await batch.commit();

      setServicosSolicitados((prev) => prev.filter((s) => s.id !== servico.id));
      setServicoRejeitado(servico);
      setServicoAceito(null);
      setAlertVisivel(true);
    } catch (erro) {
      console.error("Erro ao rejeitar serviço:", erro);
      Alert.alert("Erro", "Não foi possível rejeitar o serviço");
    }
  };

  const handleFecharAlert = () => {
    setAlertVisivel(false);
    setServicoAceito(null);
    setServicoRejeitado(null);
  };

  const iniciais =
    auth.currentUser?.email?.charAt(0).toUpperCase() ??
    auth.currentUser?.displayName?.charAt(0).toUpperCase() ??
    "U";

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregarServicosSolicitados(); setTimeout(() => setRefreshing(false), 600); }} tintColor="#FF8700" colors={["#FF8700"]} />}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={{ width: 40, height: 40 }} />

          <Animated.Text
            accessibilityRole="header"
            style={[styles.topBarTitle, { opacity: brandOpacity, transform: [{ scale: brandScale }] }]}
          >
            <Text style={{ color: isDark ? "#F8FAFC" : "#071A33" }}>Pra</Text>
            <Text style={{ color: "#FF8700" }}>Ontem</Text>
          </Animated.Text>

          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={[styles.topBarIcon, { backgroundColor: topBarBtnBg }]}
              onPress={() => navigation.navigate("Notificacoes")}
            >
              <Bell size={22} color={topBarIconColor} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.greetingCard, { backgroundColor: sectionBackground, borderColor: isDark ? theme.surfaceBorder : "transparent", borderWidth: isDark ? 1 : 0 }]}
          onPress={() => (navigation as any).navigate("PerfilTrabalhador")}
        >
          <View style={styles.greetingLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{iniciais}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.hello, { color: sectionTextColor }]}>Olá, prestador!</Text>
              <View style={styles.newRow}>
                <Text style={[styles.welcome, { color: mutedTextColor }]}>Novos serviços solicitados</Text>
                <View style={[styles.countBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255, 135, 0, 0.12)" }]}> 
                  <Text style={[styles.countBadgeText, { color: isDark ? theme.surfaceTextPrimary : "#E86F00" }]}> 
                    {servicosSolicitados.length}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <ChevronRight size={22} color={sectionTextColor} />
        </TouchableOpacity>

        <LocationVisibilityCard />

        <ProviderDashboard />

        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: sectionTextColor }]}>Serviços solicitados</Text>
        </View>

        {carregando ? (
          <View style={styles.carregandoContainer}>
            <ActivityIndicator size="large" color="#FF8700" />
            <Text style={[styles.carregandoTexto, { color: theme.textMuted }]}>Carregando serviços...</Text>
          </View>
        ) : servicosSolicitados.length > 0 ? (
          <FlatList
            data={servicosSolicitados}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={[styles.card, { backgroundColor: cardBackground, borderColor: cardBorderColor }]}> 
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: sectionTextColor }]}>{item.estilo || item.tipo}</Text>

                  <View style={styles.badgeNovo}>
                    <Text style={styles.badgeTexto}>NOVO</Text>
                  </View>
                </View>

                <View style={styles.row}>
                  <MapPin size={18} color={isDark ? theme.textSecondary : "#0F2937"} />
                  <Text style={[styles.infoText, { color: mutedTextColor }]}>{item.local}</Text>
                </View>

                <View style={styles.row}>
                  <Clock size={18} color={isDark ? theme.textSecondary : "#0F2937"} />
                  <Text style={[styles.infoText, { color: mutedTextColor }]}>{item.data}</Text>
                </View>

                {item.descricao && (
                  <View style={[styles.descricaoContainer, { backgroundColor: isDark ? theme.surface : "#F8FAFC", borderLeftColor: isDark ? theme.surfaceTextPrimary : "#F59E0B" }]}> 
                    <Text style={[styles.descricaoTexto, { color: isDark ? theme.textPrimary : "#475569" }]}>{item.descricao}</Text>
                  </View>
                )}

                <View style={[styles.clienteInfo, { backgroundColor: neutralBackground }]}> 
                  <Text style={[styles.clienteLabel, { color: mutedTextColor }]}>Cliente:</Text>
                  <Text style={[styles.clienteNome, { color: sectionTextColor }]}> 
                    {item.nomeCliente || item.clienteId}
                  </Text>
                </View>

                <View style={styles.buttonsRow}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => abrirModalValor(item)}
                  >
                    <CircleCheck size={20} color="#fff" />
                    <Text style={styles.buttonText}>Aceitar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleRejeitarServico(item)}
                  >
                    <X size={20} color="#F44336" />
                    <Text style={styles.rejectText}>Recusar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <ClipboardList size={44} color="#FF8700" />
            </View>
            <Text style={[styles.emptyTitle, { color: sectionTextColor }]}> 
              Nenhum serviço solicitado no momento
            </Text>
            <Text style={[styles.emptySubtitle, { color: mutedTextColor }]}> 
              Quando novos serviços forem solicitados, eles aparecerão aqui.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.addServiceButton}
          onPress={() =>
            (navigation as any).navigate("AddServico", {
              PrestId: auth.currentUser?.uid,
            })
          }
        >
          <Plus size={24} color="#fff" />
          <Text style={styles.addServiceText}>Adicionar Serviço</Text>
        </TouchableOpacity>

        <Text style={[styles.quickTitle, { color: sectionTextColor }]}>Ações rápidas</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.quickCard, { backgroundColor: cardBackground, borderColor: isDark ? theme.surfaceBorder : "transparent", borderWidth: isDark ? 1 : 0 }]}
            onPress={() => navigation.navigate("Servicos")}
          >
            <View style={[styles.quickIcon, { backgroundColor: "#EAF2FF" }]}>
              <FileText size={22} color="#FF8700" />
            </View>
            <Text style={[styles.quickLabel, { color: sectionTextColor }]}>Meus serviços</Text>
            <Text style={[styles.quickSub, { color: mutedTextColor }]}>Ver todos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.quickCard, { backgroundColor: cardBackground, borderColor: isDark ? theme.surfaceBorder : "transparent", borderWidth: isDark ? 1 : 0 }]}
            onPress={() => navigation.navigate("RelatoriosPrestador")}
          >
            <View style={[styles.quickIcon, { backgroundColor: "#E9FBF1" }]}>
              <BarChart3 size={22} color="#16A34A" />
            </View>
            <Text style={[styles.quickLabel, { color: sectionTextColor }]}>Relatórios</Text>
            <Text style={[styles.quickSub, { color: mutedTextColor }]}>Acompanhar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.quickCard, { backgroundColor: cardBackground, borderColor: isDark ? theme.surfaceBorder : "transparent", borderWidth: isDark ? 1 : 0 }]}
            onPress={() => navigation.navigate("AgendaPrestador")}
          >
            <View style={[styles.quickIcon, { backgroundColor: "#FFF5E6" }]}>
              <Calendar size={22} color="#F59E0B" />
            </View>
            <Text style={[styles.quickLabel, { color: sectionTextColor }]}>Minha agenda</Text>
            <Text style={[styles.quickSub, { color: mutedTextColor }]}>Disponibilidade</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={alertVisivel} transparent animationType="fade">
          <View style={styles.alertOverlay}>
            <View style={[styles.alertContainer, { backgroundColor: cardBackground, borderColor: theme.surfaceBorder }]}> 
              {servicoAceito && (
                <>
                  <CircleCheck size={60} color="#4CAF50" />
                  <Text style={[styles.alertTitle, { color: sectionTextColor }]}>Valor enviado ao cliente</Text>

                  <TouchableOpacity
                    style={styles.openButton}
                    onPress={handleFecharAlert}
                  >
                    <Text style={styles.openButtonText}>Fechar</Text>
                  </TouchableOpacity>
                </>
              )}

              {servicoRejeitado && (
                <>
                  <X size={60} color="#F44336" />
                  <Text style={[styles.alertTitle, { color: sectionTextColor }]}>Serviço rejeitado</Text>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleFecharAlert}
                  >
                    <Text style={styles.closeButtonText}>Fechar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        <BottomSheet visible={modalValorVisivel} onClose={fecharModalValor}>
              <Text style={[styles.alertTitle, { color: sectionTextColor }]}>Criar proposta</Text>
              <Text style={[styles.valorModalSubtitle, { color: mutedTextColor }]}> 
                {servicoParaValor?.estilo || servicoParaValor?.tipo || "Serviço"}
              </Text>

              <ScrollView style={styles.proposalScroll} keyboardShouldPersistTaps="handled">
                <View style={styles.proposalGrid}>
                  {([
                    ["labor", "Mão de obra"], ["materials", "Materiais"], ["travel", "Deslocamento"], ["discount", "Desconto"],
                  ] as const).map(([key, label]) => <View key={key} style={styles.proposalField}>
                    <Text style={[styles.proposalLabel, { color: mutedTextColor }]}>{label}</Text>
                    <TextInput style={[styles.proposalInput, { backgroundColor: theme.actionBg, color: theme.textPrimary, borderColor: theme.border }]} value={proposal[key]} onChangeText={(value) => setProposal((current) => ({ ...current, [key]: value }))} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={theme.textMuted} />
                  </View>)}
                </View>
                <View style={styles.proposalGrid}>
                  <View style={styles.proposalField}><Text style={[styles.proposalLabel, { color: mutedTextColor }]}>Prazo (dias)</Text><TextInput style={[styles.proposalInput, { backgroundColor: theme.actionBg, color: theme.textPrimary, borderColor: theme.border }]} value={proposal.deadline} onChangeText={(deadline) => setProposal((current) => ({ ...current, deadline }))} keyboardType="number-pad" /></View>
                  <View style={styles.proposalField}><Text style={[styles.proposalLabel, { color: mutedTextColor }]}>Validade (dias)</Text><TextInput style={[styles.proposalInput, { backgroundColor: theme.actionBg, color: theme.textPrimary, borderColor: theme.border }]} value={proposal.validity} onChangeText={(validity) => setProposal((current) => ({ ...current, validity }))} keyboardType="number-pad" /></View>
                </View>
                <Text style={[styles.proposalLabel, { color: mutedTextColor }]}>Observações</Text>
                <TextInput style={[styles.proposalInput, styles.proposalNotes, { backgroundColor: theme.actionBg, color: theme.textPrimary, borderColor: theme.border }]} value={proposal.notes} onChangeText={(notes) => setProposal((current) => ({ ...current, notes }))} multiline maxLength={1000} placeholder="Condições, materiais e detalhes..." placeholderTextColor={theme.textMuted} />
                <View style={styles.proposalTotal}><Text style={[styles.proposalTotalLabel, { color: mutedTextColor }]}>Total da proposta</Text><Text style={[styles.proposalTotalValue, { color: sectionTextColor }]}>R$ {proposalTotal({ laborAmount: parseMoney(proposal.labor), materialsAmount: parseMoney(proposal.materials), travelFee: parseMoney(proposal.travel), discount: parseMoney(proposal.discount) }).toFixed(2).replace(".", ",")}</Text></View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.openButton, enviandoValor && styles.disabledButton]}
                onPress={handleAceitarServico}
                disabled={enviandoValor}
              >
                <Text style={styles.openButtonText}>
                  {enviandoValor ? "Enviando..." : "Enviar valor"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.valorCancelButton}
                onPress={fecharModalValor}
                disabled={enviandoValor}
              >
                <Text style={styles.valorCancelText}>Cancelar</Text>
              </TouchableOpacity>
        </BottomSheet>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 140,
    paddingTop: Platform.OS === "android" ? 10 : 0,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "android" ? 16 : 10,
    paddingBottom: 10,
    marginTop:40,
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F2937",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  topBarIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 41, 55, 0.06)",
  },
  topBarIconSpacing: {
    marginLeft: 10,
  },

  greetingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF4E5",
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#0F2937",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  greetingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF8700",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  hello: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F2937",
  },
  newRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 8,
    flexWrap: "wrap",
  },
  welcome: {
    fontSize: 14,
    color: "#64748B",
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 135, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countBadgeText: {
    color: "#E86F00",
    fontWeight: "800",
    fontSize: 13,
  },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F2937",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(15, 41, 55, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(15, 41, 55, 0.08)",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F2937",
  },

  carregandoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 36,
  },
  carregandoTexto: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 12,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FF8700",
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F2937",
    flex: 1,
  },
  badgeNovo: {
    backgroundColor: "#FF8700",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginLeft: 10,
  },
  badgeTexto: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },
  infoText: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 8,
  },
  descricaoContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  descricaoTexto: {
    fontSize: 13,
    color: "#475569",
    fontStyle: "italic",
  },
  clienteInfo: {
    backgroundColor: "rgba(255, 135, 0, 0.08)",
    borderRadius: 14,
    padding: 12,
    marginVertical: 10,
  },
  clienteLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  clienteNome: {
    fontSize: 14,
    color: "#E86F00",
    fontWeight: "700",
    marginTop: 4,
  },
  buttonsRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#FF8700",
    paddingVertical: 12,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginRight: 5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "rgba(15, 41, 55, 0.06)",
    paddingVertical: 12,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 41, 55, 0.12)",
    flexDirection: "row",
    marginLeft: 5,
  },
  rejectText: {
    color: "#0F2937",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 38,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(15, 41, 55, 0.12)",
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  emptyIconWrap: {
    width: 86,
    height: 86,
    borderRadius: 24,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },

  addServiceButton: {
    backgroundColor: "#FF8700",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    marginVertical: 20,
  },
  addServiceText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },

  quickTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F2937",
    marginTop: 4,
    marginBottom: 14,
  },
  quickGrid: {
    flexDirection: "row",
    gap: 12,
  },
  quickCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 41, 55, 0.06)",
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  quickIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F2937",
    textAlign: "center",
  },
  quickSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },

  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 41, 55, 0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "85%",
    shadowColor: "#0F2937",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F2937",
    marginTop: 14,
    marginBottom: 18,
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: "#FF8700",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  openButton: {
    backgroundColor: "#FF8700",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  openButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  valorModalSubtitle: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 14,
    textAlign: "center",
  },
  valorInput: {
    width: "100%",
    backgroundColor: "#F5F8FC",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F2937",
    borderWidth: 1,
    borderColor: "#DDEEFF",
    marginBottom: 16,
  },
  proposalScroll: { width: "100%", maxHeight: 390, marginBottom: 16 },
  proposalGrid: { flexDirection: "row", gap: 10 },
  proposalField: { flex: 1 },
  proposalLabel: { fontSize: 12, fontWeight: "800", marginBottom: 5 },
  proposalInput: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, fontSize: 14 },
  proposalNotes: { minHeight: 78, paddingTop: 12, textAlignVertical: "top" },
  proposalTotal: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  proposalTotalLabel: { fontSize: 13, fontWeight: "700" },
  proposalTotalValue: { fontSize: 20, fontWeight: "900" },
  valorCancelButton: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  valorCancelText: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },

  fab: {
    position: "absolute",
    right: 18,
    bottom: 26,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FF8700",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F2937",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
});
