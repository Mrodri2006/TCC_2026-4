import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { ArrowLeft, Clock, CheckCircle, X } from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useState, useCallback } from "react";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";

export default function ServicosAgendados() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [servicosAgendados, setServicosAgendados] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      carregarServicosAgendados();
    }, [])
  );

  const carregarServicosAgendados = async () => {
    try {
      const usuarioId = auth.currentUser?.uid;
      if (!usuarioId) return;

      const docSnap = await firestore
        .collection("ServicosAgendados")
        .doc(usuarioId)
        .collection("ServicoStatus")
        .get();

      const servicos = docSnap.docs.map((doc) => ({
        ...doc.data(),
        firestoreId: doc.id,
      }));

      setServicosAgendados(servicos);
    } catch (erro) {
      console.log("Erro ao carregar serviços agendados:", erro);
    } finally {
      setCarregando(false);
    }
  };

  const handleCancelarServico = async (firestoreId: string, titulo: string) => {
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
                .doc(firestoreId)
                .delete();

              setServicosAgendados((prev) =>
                prev.filter((item) => item.firestoreId !== firestoreId)
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

  const handleAbrirChatCliente = (servicoStatus: any) => {
    navigation.navigate("Chat", {
      otherUserId: servicoStatus.clienteId,
      otherUserName: servicoStatus.nomeCliente || "Cliente",
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#0c0c0c" />
        </TouchableOpacity>

        <Text style={styles.titulo}>Serviços Agendados</Text>

        <View style={{ width: 24 }} />
      </View>

      {carregando ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.emptyText}>Carregando serviços...</Text>
        </View>
      ) : servicosAgendados.length === 0 ? (
        <View style={styles.emptyContainer}>
          <CheckCircle size={64} color="#2563EB" />
          <Text style={styles.emptyTitle}>Nenhum serviço agendado</Text>
          <Text style={styles.emptyText}>
            Quando você aceitar um serviço, ele aparecerá aqui
          </Text>
        </View>
      ) : (
        <View style={styles.content}>

          {servicosAgendados
              .filter((servico) => servico.status === "a fazer")
              .map((servicoStatus) => (
                <View key={servicoStatus.firestoreId} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>
                      {servicoStatus.titulo ||
                        servicoStatus.tipo ||
                        servicoStatus.estilo}
                    </Text>

                    <View style={styles.statusBadge}>
                      <CheckCircle size={16} color="#fff" />
                      <Text style={styles.statusText}>Agendado</Text>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <Clock size={18} color="#0F2937" />
                    <Text style={styles.infoText}>
                      {servicoStatus.horario || "Horário não informado"}
                    </Text>
                  </View>

                  <View style={styles.buttonsRow}>
                    <TouchableOpacity
                      style={styles.contatoButton}
                      onPress={() => handleAbrirChatCliente(servicoStatus)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.buttonText}>Conversar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() =>
                        handleCancelarServico(
                          servicoStatus.firestoreId,
                          servicoStatus.titulo
                        )
                      }
                      activeOpacity={0.85}
                    >
                      <X size={18} color="#ff5252" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  header: {
    backgroundColor: "#E8F4FF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#0F2937",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    flexDirection: "row",
    alignItems: "center",
  },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 41, 55, 0.08)",
    marginRight: 10,
  },

  titulo: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F2937",
    flex: 1,
    textAlign: "center",
  },

  content: {
    paddingBottom: 8,
  },

  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 36,
    paddingHorizontal: 16,
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F2937",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F2937",
    flex: 1,
    marginRight: 10,
  },

  statusBadge: {
    backgroundColor: "#2563EB",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },

  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
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
    flex: 1,
  },

  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },

  contatoButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  cancelButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    backgroundColor: "rgba(15, 41, 55, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(15, 41, 55, 0.12)",
  },
});
