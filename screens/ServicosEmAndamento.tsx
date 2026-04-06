import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { ArrowLeft, Clock, CheckCircle } from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useState, useCallback } from "react";
import { auth, firestore } from "../firebase";
import styles from "../estilo";
import { useTheme } from "../theme/ThemeContext";

export default function ServicosEmAndamento() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      carregarServicos();
    }, [])
  );

  const carregarServicos = async () => {
    setCarregando(true);
    try {
      const usuarioId = auth.currentUser?.uid;
      if (!usuarioId) return;

      const userDoc = await firestore.collection("Usuario").doc(usuarioId).get();
      const userData = userDoc.exists ? userDoc.data() : null;
      const ehAdmin = userData?.admin === true || userData?.tipo === "admin";

      let lista: any[] = [];

      if (ehAdmin) {
        const docSnap = await firestore
          .collectionGroup("ServicoStatus")
          .where("status", "==", "a fazer")
          .get();

        const mapa = new Map<string, any>();
        docSnap.docs.forEach((doc) => {
          const data = doc.data() as any;
          const key = `${data?.prestadorId || "p"}_${data?.id || doc.id}`;
          if (!mapa.has(key)) {
            mapa.set(key, {
              ...data,
              firestoreId: doc.id,
            });
          }
        });
        lista = Array.from(mapa.values());
      } else {
        const docSnap = await firestore
          .collection("ServicosAgendados")
          .doc(usuarioId)
          .collection("ServicoStatus")
          .where("status", "==", "a fazer") // busca só os serviços em andamento
          .get();

        lista = docSnap.docs.map((doc) => ({
          ...doc.data(),
          firestoreId: doc.id,
        }));
      }

      setServicos(lista);
    } catch (erro) {
      console.log("Erro ao carregar serviços:", erro);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>

        <Text
          style={{
            marginTop: 40,
            marginBottom: 4,
            fontSize: 28,
            fontWeight: "600",
            color: "#000",
          }}
        >
          Serviços Em Andamento
        </Text>

        <View style={{ width: 24 }} />
      </View>

      {/* Conteúdo */}
      {carregando ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Carregando serviços...</Text>
        </View>
      ) : servicos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <CheckCircle size={64} color="#1e90ff" />
          <Text style={styles.emptyTitle}>Nenhum serviço em andamento</Text>
          <Text style={styles.emptyText}>
            Quando um serviço for aceito, ele aparecerá aqui
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>
            Você tem {servicos.length} serviço
            {servicos.length !== 1 ? "s" : ""} em andamento
          </Text>

          {servicos.map((servico) => (
            <View key={servico.firestoreId} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {servico.titulo || servico.tipo || servico.estilo}
                </Text>

                <View style={styles.statusBadge}>
                  <CheckCircle size={16} color="#fff" />
                  <Text style={styles.statusText}>
                    {servico.status}
                  </Text>
                </View>
              </View>

              <View style={styles.row}>
                <Clock size={18} color="#1e90ff" />
                <Text style={styles.infoText}>
                  {servico.horario || "Horário não informado"}
                </Text>
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={styles.infoText}>
                  Status: {servico.status}
                </Text>
              </View>

              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={styles.contatoButton}
                  onPress={() =>
                    Alert.alert(
                      "Contato",
                      "Funcionalidade em desenvolvimento"
                    )
                  }
                >
                  <Text style={styles.buttonText}>Contatar Cliente</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
