import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Calendar, ChevronLeft, Clock, MapPin, X } from "lucide-react-native";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";

type ServicoAgendado = {
  firestoreId: string;
  clienteId?: string;
  nomeCliente?: string;
  titulo?: string;
  tipo?: string;
  estilo?: string;
  local?: string;
  endereco?: string;
  data?: string;
  horario?: string;
  status?: string;
  descricao?: string;
};

export default function ServicosAgendados() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const unsubscribeRef = useRef<null | (() => void)>(null);

  const [carregando, setCarregando] = useState(true);
  const [servicos, setServicos] = useState<ServicoAgendado[]>([]);

  useFocusEffect(
    useCallback(() => {
      carregar();
      return () => {
        if (unsubscribeRef.current) unsubscribeRef.current();
      };
    }, [])
  );

  const carregar = () => {
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
          const lista: ServicoAgendado[] = snapshot.docs.map((doc) => ({
            firestoreId: doc.id,
            ...(doc.data() as any),
          }));
          setServicos(lista);
          setCarregando(false);
        },
        (erro) => {
          console.log("Erro ao carregar serviços agendados:", erro);
          setCarregando(false);
        }
      );
  };

  const servicosFiltrados = useMemo(
    () => servicos.filter((s) => (s.status || "").toLowerCase() === "a fazer"),
    [servicos]
  );

  const cancelar = (item: ServicoAgendado) => {
    Alert.alert("Cancelar serviço", "Deseja cancelar este serviço?", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Cancelar",
        style: "destructive",
        onPress: async () => {
          try {
            const usuarioId = auth.currentUser?.uid;
            if (!usuarioId) return;

            await firestore
              .collection("ServicosAgendados")
              .doc(usuarioId)
              .collection("ServicoStatus")
              .doc(item.firestoreId)
              .set({ status: "cancelado", dataCancelado: new Date() }, { merge: true });

            if (item.clienteId) {
              await firestore
                .collection("ServicosClientes")
                .doc(item.clienteId)
                .collection("ServicoStatus")
                .doc(item.firestoreId)
                .set({ status: "cancelado", dataCancelado: new Date() }, { merge: true });
            }
          } catch (erro) {
            console.log("Erro ao cancelar serviço:", erro);
            Alert.alert("Erro", "Não foi possível cancelar o serviço");
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <ChevronLeft size={22} color="#0F2937" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Agendados</Text>

          <View style={{ width: 40 }} />
        </View>

        {carregando ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        ) : (
          <FlatList
            data={servicosFiltrados}
            keyExtractor={(i) => i.firestoreId}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Nenhum serviço agendado</Text>
                <Text style={styles.emptySub}>
                  Quando você aceitar um serviço, ele aparece aqui.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>
                    {item.titulo || item.estilo || item.tipo || "Serviço"}
                  </Text>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => cancelar(item)}
                    activeOpacity={0.85}
                  >
                    <X size={16} color="#991B1B" />
                  </TouchableOpacity>
                </View>

                <View style={styles.metaRow}>
                  <MapPin size={16} color="#64748B" />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {item.endereco || item.local || "Endereço não informado"}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Calendar size={16} color="#64748B" />
                  <Text style={styles.metaText}>
                    {item.data || "Data"}{" "}
                    {item.horario ? `• ${item.horario}` : ""}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Clock size={16} color="#64748B" />
                  <Text style={styles.metaText}>{item.status || "a fazer"}</Text>
                </View>
              </View>
            )}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: Platform.OS === "android" ? 10 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "android" ? 16 : 10,
    paddingBottom: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 41, 55, 0.06)",
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#0F2937" },

  loading: { alignItems: "center", paddingVertical: 40 },
  loadingText: { marginTop: 10, color: "#64748B", fontWeight: "700" },

  empty: {
    marginTop: 10,
    paddingVertical: 30,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(15, 41, 55, 0.12)",
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: "#0F2937" },
  emptySub: {
    marginTop: 8,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },

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
    marginBottom: 10,
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "900", color: "#0F2937" },
  cancelBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  metaText: { flex: 1, fontSize: 13, color: "#64748B", fontWeight: "600" },
});

