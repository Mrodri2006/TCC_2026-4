
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { MapPin, Clock, Plus, User, CheckCircle, X } from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useState, useCallback, useRef } from "react";
import { auth, firestore } from "../firebase";
import { Calendar } from "lucide-react-native";
import { useTheme } from "../theme/ThemeContext";

export default function HomeTrabalhador() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [servicosSolicitados, setServicosSolicitados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [alertVisivel, setAlertVisivel] = useState(false);
  const [servicoAceito, setServicoAceito] = useState<any>(null);
  const [servicoRejeitado, setServicoRejeitado] = useState<any>(null);

  const unsubscribeRef = useRef<any>(null);

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
        (snapshot) => {
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

          setServicosSolicitados(servicos);
          setCarregando(false);
        },
        (error) => {
          console.error("Erro ao buscar serviços:", error);
          setCarregando(false);
        }
      );
  };

  const handleAceitarServico = async (servico: any) => {
    try {
      const usuarioId = auth.currentUser?.uid;

      if (!usuarioId) {
        Alert.alert("Erro", "Usuário não autenticado");
        return;
      }

      await firestore
        .collection("ServicosAgendados")
        .doc(usuarioId)
        .collection("ServicoStatus")
        .doc(servico.id)
        .update({
          status: "a fazer",
          dataAceito: new Date(),
        });
// Atualiza o status ao cliente e ao trabalhador também
      if (servico.clienteId) {
        await firestore
          .collection("ServicosClientes")
          .doc(servico.clienteId)
          .collection("ServicoStatus")
          .doc(servico.id)
          .set(
            {
              status: "a fazer",
              dataAceito: new Date(),
            },
            { merge: true }
          );
      }

      if (servico.origem === "area" && servico.requestId) {
        const reqRef = firestore.collection("SolicitacoesArea").doc(servico.requestId);
        const reqSnap = await reqRef.get();

        if (reqSnap.exists) {
          const reqData: any = reqSnap.data();
          const prestadoresIds: string[] = reqData?.prestadoresIds || [];
          const deletePromises: Promise<any>[] = [];

          prestadoresIds.forEach((prestadorId) => {
            if (prestadorId !== usuarioId) {
              deletePromises.push(
                firestore
                  .collection("ServicosAgendados")
                  .doc(prestadorId)
                  .collection("ServicoStatus")
                  .doc(servico.requestId)
                  .delete()
              );
            }
          });

          deletePromises.push(
            reqRef.set(
              {
                status: "aceito",
                aceitoPor: usuarioId,
                dataAceito: new Date(),
              },
              { merge: true }
            )
          );

          if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
          }
        }
      }

      setServicoAceito(servico);
      setServicoRejeitado(null);
      setAlertVisivel(true);
    } catch (erro) {
      console.error("Erro ao aceitar serviço:", erro);
      Alert.alert("Erro", "Não foi possível aceitar o serviço");
    }
  };

  const handleRejeitarServico = async (servico: any) => {
    try {
      const usuarioId = auth.currentUser?.uid;

      if (!usuarioId) {
        Alert.alert("Erro", "Usuário não autenticado");
        return;
      }

      await firestore
        .collection("ServicosRejeitados")
        .doc(usuarioId)
        .collection("ServicoStatus")
        .doc(servico.id)
        .set({
          ...servico,
          status: "rejeitado",
          dataRejeicao: new Date(),
        })
        ;

      await firestore
        .collection("ServicosAgendados")
        .doc(usuarioId)
        .collection("ServicoStatus")
        .doc(servico.id)
        .set(
          {
            status: "rejeitado",
            dataRejeicao: new Date(),
          },
          { merge: true }
        );

      if (servico.clienteId) {
        await firestore
          .collection("ServicosClientes")
          .doc(servico.clienteId)
          .collection("ServicoStatus")
          .doc(servico.id)
          .set(
            {
              status: "rejeitado",
              dataRejeicao: new Date(),
            },
            { merge: true }
          );
      }

      setServicosSolicitados((prev) =>
        prev.filter((s) => s.id !== servico.id)
      );
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {auth.currentUser?.email
                ? auth.currentUser.email.charAt(0).toUpperCase()
                : "U"}
            </Text>
          </View>

          <View>
            <Text style={styles.hello}>Olá, prestador</Text>
            <Text style={styles.welcome}>Novos serviços solicitados</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => (navigation as any).navigate("PerfilTrabalhador")}
        >
          <User size={24} />
        </TouchableOpacity>

        <View>
        <TouchableOpacity
         style={styles.iconButton}
         onPress={() => (navigation as any).navigate("ServicosAgendados")}> 
        <Calendar size={24} />
       </TouchableOpacity>
      </View>
      </View>

      <Text style={styles.sectionTitle}>Serviços Solicitados</Text>

      {carregando ? (
        <View style={styles.carregandoContainer}>
          <ActivityIndicator size="large" color="#005362" />
          <Text style={styles.carregandoTexto}>Carregando serviços...</Text>
        </View>
      ) : servicosSolicitados.length > 0 ? (
        <FlatList
          data={servicosSolicitados}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {item.estilo || item.tipo}
                </Text>

                <View style={styles.badgeNovo}>
                  <Text style={styles.badgeTexto}>🔔 NOVO</Text>
                </View>
              </View>

              <View style={styles.row}>
                <MapPin size={18} color="#005362" />
                <Text style={styles.infoText}>{item.local}</Text>
              </View>

              <View style={styles.row}>
                <Clock size={18} color="#005362" />
                <Text style={styles.infoText}>{item.data}</Text>
              </View>

              {item.descricao && (
                <View style={styles.descricaoContainer}>
                  <Text style={styles.descricaoTexto}>{item.descricao}</Text>
                </View>
              )}

              <View style={styles.clienteInfo}>
                <Text style={styles.clienteLabel}>Cliente:</Text>
                <Text style={styles.clienteNome}>
                  {item.nomeCliente || item.clienteId}
                </Text>
              </View>

              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAceitarServico(item)}
                >
                  <CheckCircle size={20} color="#fff" />
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
        <View style={styles.nenhumContainer}>
          <Text style={styles.nenhumTexto}>
            Nenhum serviço solicitado no momento
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

      {/* MODAL */}
      <Modal visible={alertVisivel} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>

            {servicoAceito && (
              <>
                <CheckCircle size={60} color="#4CAF50" />
                <Text style={styles.alertTitle}>Serviço Aceito</Text>

                <TouchableOpacity
                  style={styles.openButton}
                  onPress={() => {
                    handleFecharAlert();
                    (navigation as any).navigate("ServicosAgendados");
                  }}
                >
                  <Text style={styles.openButtonText}>Ver Agendados</Text>
                </TouchableOpacity>
              </>
            )}

            {servicoRejeitado && (
              <>
                <X size={60} color="#F44336" />
                <Text style={styles.alertTitle}>Serviço Rejeitado</Text>

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

    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#005362",
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
    fontWeight: "600",
    color: "#333",
  },

  welcome: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },

  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    flexDirection: "row",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },

  carregandoContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },

  carregandoTexto: {
    fontSize: 14,
    color: "#666",
    marginTop: 12,
  },

  card: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#005362",
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
    color: "#333",
    flex: 1,
  },

  badgeNovo: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },

  badgeTexto: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },

  infoText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },

  descricaoContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#FFC107",
  },

  descricaoTexto: {
    fontSize: 13,
    color: "#555",
    fontStyle: "italic",
  },

  clienteInfo: {
    backgroundColor: "#e8f4f8",
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },

  clienteLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },

  clienteNome: {
    fontSize: 14,
    color: "#005362",
    fontWeight: "700",
    marginTop: 4,
  },

  buttonsRow: {
    flexDirection: "row",
    marginTop: 12,
  },

  acceptButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
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
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F44336",
    flexDirection: "row",
    marginLeft: 5,
  },

  rejectText: {
    color: "#F44336",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },

  nenhumContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },

  nenhumTexto: {
    fontSize: 16,
    color: "#999",
    fontWeight: "600",
    marginBottom: 8,
  },

  nenhumSubtexto: {
    fontSize: 14,
    color: "#ccc",
  },

  addServiceButton: {
    backgroundColor: "#005362",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginVertical: 20,
  },

  addServiceText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },

  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },

  alertContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    width: "85%",
  },

  alertIconContainer: {
    marginBottom: 16,
  },

  alertTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },

  alertMessage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },

  closeButton: {
    backgroundColor: "#005362",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },

  closeButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  openButton: {
    backgroundColor: "#005362",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  openButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
