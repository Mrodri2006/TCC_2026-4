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

export default function ServicosEmAndamento() {
  const navigation = useNavigation();
  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      carregarServicos();
    }, [])
  );

  const carregarServicos = async () => {
    try {
      const usuarioId = auth.currentUser?.uid;
      if (!usuarioId) return;

      const docSnap = await firestore
        .collection("ServicosAgendados")
        .doc(usuarioId)
        .collection("ServicoStatus")
        .where("status", "==", "a fazer") // busca só os serviços em andamento
        .get();

      const lista = docSnap.docs.map((doc) => ({
        ...doc.data(),
        firestoreId: doc.id,
      }));

      setServicos(lista);
    } catch (erro) {
      console.log("Erro ao carregar serviços:", erro);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <ScrollView style={styles.container}>

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