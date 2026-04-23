import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal } from "react-native";
import { ArrowLeft, Clock } from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useState, useCallback } from "react";
import { firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";

export default function NovosPrestadores() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [usuariosPrestadores, setUsuariosPrestadores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [prestadorSelecionado, setPrestadorSelecionado] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      buscarNovosPrestadores();
    }, [])
  );

  const buscarNovosPrestadores = async () => {
    setCarregando(true);
    try {
      const users = await firestore
        .collection("Usuario")
        .get();

      const prestadores = [];

      for (const userDoc of users.docs) {
        const userData = userDoc.data();
        
        if (userData.tipo === "prestador") {
          prestadores.push({
            id: userDoc.id,
            nome: userData.nome || "Sem nome",
            email: userData.email || "",
            profissao: userData.profissao || "Geral",
            avaliacao: userData.avaliacao || 0,
            distancia: userData.distancia || "A calcular",
            telefone: userData.fone || "NÃ£o informado",
            criadoEm: userData.criadoEm,
          });
        }
      }

      const prestadoresComAvaliacao = await Promise.all(
        prestadores.map(async (p: any) => {
          try {
            const avalSnapshot = await firestore
              .collection("ServicosAgendados")
              .doc(p.id)
              .collection("ServicoStatus")
              .where("avaliado", "==", true)
              .get();

            const notas = avalSnapshot.docs
              .map((doc) => Number(doc.data().avaliacaoNota || 0))
              .filter((n) => Number.isFinite(n) && n > 0);

            if (notas.length === 0) {
              return { ...p, avaliacao: p.avaliacao || 0, numeroAvaliacoes: 0 };
            }

            const total = notas.reduce((acc, n) => acc + n, 0);
            const media = Number((total / notas.length).toFixed(1));
            return { ...p, avaliacao: media, numeroAvaliacoes: notas.length };
          } catch {
            return { ...p, avaliacao: p.avaliacao || 0, numeroAvaliacoes: 0 };
          }
        })
      );

      prestadoresComAvaliacao.sort((a, b) => {
        const dateA = a.criadoEm?.toDate?.() || new Date(0);
        const dateB = b.criadoEm?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setUsuariosPrestadores(prestadoresComAvaliacao);
      setCarregando(false);
    } catch (erro) {
      console.error("Erro ao buscar prestadores:", erro);
      setCarregando(false);
    }
  };

  const abrirModal = (prestador: any) => {
    setPrestadorSelecionado(prestador);
    setModalVisivel(true);
  };

  const fecharModal = () => {
    setModalVisivel(false);
    setPrestadorSelecionado(null);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#005362" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Novos Prestadores</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.infoSection}>
        <Clock size={18} color="#005362" />
        <Text style={styles.infoText}>
          Confira os trabalhadores recentemente cadastrados
        </Text>
      </View>

      {carregando ? (
        <View style={styles.carregandoContainer}>
          <ActivityIndicator size="large" color="#03505e" />
          <Text style={styles.carregandoTexto}>Carregando prestadores...</Text>
        </View>
      ) : usuariosPrestadores.length > 0 ? (
        <View style={styles.prestadoresList}>
          {usuariosPrestadores.map((prestador) => {
            const notaDisponivel = prestador.numeroAvaliacoes > 0;
            const distanciaDisponivel = prestador.distancia && prestador.distancia !== "A calcular";
            const subtitulo = notaDisponivel
              ? `⭐ ${prestador.avaliacao.toFixed(1)} • ${distanciaDisponivel ? prestador.distancia : "Calculando..."}`
              : `Sem avaliações${distanciaDisponivel ? ` • ${prestador.distancia}` : ""}`;

            return (
              <TouchableOpacity
                key={prestador.id}
                style={styles.prestadorCard}
                activeOpacity={0}
                onPress={() => abrirModal(prestador)}
              >
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>
                    {prestador.nome.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.infoContainer}>
                  <View style={styles.cardHeader}>
                    <View style={styles.titleBlock}>
                      <Text style={styles.nomePrestador}>{prestador.nome}</Text>
                      <View style={styles.profissaoBadge}>
                        <Text style={styles.profissaoTexto}>{prestador.profissao}</Text>
                      </View>
                    </View>
                    <View style={styles.novoBadge}>
                      <Text style={styles.novoTexto}>NOVO</Text>
                    </View>
                  </View>

                  <Text style={styles.subtituloTexto}>{subtitulo}</Text>

                  <View style={styles.actionRow}>
                    <Text style={styles.actionLabel}>Ver detalhes</Text>
                    <Text style={styles.actionIcon}>→</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.nenhumContainer}>
          <Text style={styles.nenhumResultado}>
            Nenhum prestador encontrado
          </Text>
        </View>
      )}
      <Modal visible={modalVisivel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Informações do Prestador</Text>
            <Text style={styles.modalNome}>{prestadorSelecionado?.nome || "Sem nome"}</Text>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Profissão:</Text>
              <Text style={styles.modalValue}>{prestadorSelecionado?.profissao || "Não informado"}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Avaliação:</Text>
              <Text style={styles.modalValue}>{prestadorSelecionado?.avaliacao?.toFixed?.(1) ?? "0.0"}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Distância:</Text>
              <Text style={styles.modalValue}>{prestadorSelecionado?.distancia || "A calcular"}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Telefone:</Text>
              <Text style={styles.modalValue}>{prestadorSelecionado?.telefone || "Não informado"}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Email:</Text>
              <Text style={styles.modalValue}>{prestadorSelecionado?.email || "Não informado"}</Text>
            </View>

            <TouchableOpacity style={styles.botaoFechar} onPress={fecharModal}>
              <Text style={styles.botaoFecharTexto}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  titulo: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F2937",
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F7FB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: "#0F2937",
    fontWeight: "500",
    flex: 1,
  },
  prestadoresList: {
    paddingBottom: 20,
  },
  prestadorCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    alignItems: "flex-start",
    position: "relative",
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  infoContainer: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  titleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  nomePrestador: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F2937",
    marginBottom: 8,
  },
  profissaoBadge: {
    backgroundColor: "#DDEEFF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  profissaoTexto: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "600",
  },
  novoBadge: {
    backgroundColor: "#E6F7EC",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  novoTexto: {
    color: "#276A45",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  subtituloTexto: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 14,
    color: "#0F2937",
    fontWeight: "700",
  },
  actionIcon: {
    marginLeft: 8,
    fontSize: 16,
    color: "#0F2937",
  },
  carregandoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 60,
  },
  carregandoTexto: {
    fontSize: 14,
    color: "#666",
    marginTop: 12,
  },
  nenhumContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 60,
  },
  nenhumResultado: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  modalNome: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  modalValue: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
  botaoFechar: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#eee",
    alignItems: "center",
  },
  botaoFecharTexto: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
});





