
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Star, MapPin, Phone, Mail, ArrowLeft, Award } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState, useEffect } from "react";
import { firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";

export default function DetalheProfissional() {
  const navigation = useNavigation();
  const route = useRoute();
  const { profissional } = route.params || {};
  const { theme } = useTheme();

  const [servicos, setServicos] = useState([]);
  const [usuarioData, setUsuarioData] = useState({});
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    buscarDetalhes();
  }, [profissional?.id]);

  const buscarDetalhes = async () => {
    setCarregando(true);
    try {
      const userDoc = await firestore.collection("Usuario").doc(profissional.id).get();
      if (userDoc.exists) {
        setUsuarioData(userDoc.data());
      }

      const servicosSnapshot = await firestore
        .collection("Usuario")
        .doc(profissional.id)
        .collection("Serv")
        .get();

      const servicosData = [];
      servicosSnapshot.forEach((doc) => {
        servicosData.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setServicos(servicosData);
      setCarregando(false);
    } catch (erro) {
      console.error("Erro ao buscar detalhes:", erro);
      setCarregando(false);
    }
  };

  const handleSolicitarServico = (servico: any) => {
    navigation.navigate("SolicitarServico", {
      prestadorId: profissional.id,
      prestadorNome: profissional.nome,
      servico: servico.tipo || servico.nome || servico.estilo,
    });
  };

  const handleSolicitarServicoPrincipal = () => {
    if (servicos.length > 0) {
      handleSolicitarServico(servicos[0]);
    } else {
      navigation.navigate("SolicitarServico", {
        prestadorId: profissional.id,
        prestadorNome: profissional.nome,
        servico: profissional.profissao,
      });
    }
  };

  const handleAbrirChat = () => {
    navigation.navigate("Chat", {
      otherUserId: profissional.id,
      otherUserName: profissional.nome || "Prestador",
    });
  };

  if (carregando) {
    return (
      <View style={[styles.carregandoContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#527954" />
        <Text style={styles.carregandoTexto}>Carregando informações...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerDetalhe}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.botaoVoltar}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{marginTop:40, marginBottom:4, fontSize: 28, fontWeight: "600", color: "#000"}}>Detalhes do Profissional</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.cardPrincipal}>
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.nomePrincipal}>{profissional.nome}</Text>
            <View style={styles.profissaoBadgePrincipal}>
              <Text style={styles.profissaoTextoPrincipal}>{profissional.profissao}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Star size={20} color="#FFD700" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Avaliação</Text>
              <Text style={styles.infoValor}>{profissional.avaliacao} ⭐</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <MapPin size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Distância</Text>
              <Text style={styles.infoValor}>{profissional.distancia}</Text>
            </View>
          </View>

          {usuarioData?.fone && (
            <View style={styles.infoItem}>
              <Phone size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Telefone</Text>
                <Text style={styles.infoValor}>{usuarioData.fone}</Text>
              </View>
            </View>
          )}

          {usuarioData?.email && (
            <View style={styles.infoItem}>
              <Mail size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>E-mail</Text>
                <Text style={styles.infoValor}>{usuarioData.email}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.servicosSection}>
        <View style={styles.sectionHeader}>
          <Award size={20} color="#527954" />
          <Text style={styles.sectionTitle}>Serviços Oferecidos</Text>
        </View>

        {servicos.length > 0 ? (
          servicos.map((servico, index) => (
            <TouchableOpacity 
              key={servico.id} 
              style={styles.servicoCard}
              activeOpacity={0.7}
              onPress={() => handleSolicitarServico(servico)}
            >
              <Text style={styles.servicoNome}>{servico.nome || servico.tipo || servico.estilo}</Text>
              <Text style={styles.servicoTipo}>Tipo: {servico.tipo}</Text>
              {servico.local && (
                <Text style={styles.servicoLocal}>Local: {servico.local}</Text>
              )}
              {servico.data && (
                <Text style={styles.servicoData}>Data: {servico.data}</Text>
              )}
              <Text style={styles.servicoAcao}>👉 Toque para solicitar</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.nenhumServico}>Nenhum serviço cadastrado</Text>
        )}
      </View>

      <View style={styles.acaoContainer}>
        <TouchableOpacity 
          style={styles.botaoContratar}
          onPress={handleSolicitarServicoPrincipal}
        >
          <Phone size={20} color="#fff" />
          <Text style={styles.botaoContrataTexto}>Solicitar Serviço</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.botaoChat}
          onPress={handleAbrirChat}
        >
          <Text style={styles.botaoChatTexto}>Conversar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    flex: 1,
  },

  carregandoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  carregandoTexto: {
    fontSize: 14,
    color: "#666",
    marginTop: 12,
  },

  headerDetalhe: {
    backgroundColor: "#527954",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  botaoVoltar: {
    padding: 8,
  },

  tituloDetalhe: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },

  cardPrincipal: {
    backgroundColor: "#f9f9f9",
    margin: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 3,
  },

  headerCard: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 16,
  },

  nomePrincipal: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },

  profissaoBadgePrincipal: {
    backgroundColor: "#527954",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },

  profissaoTextoPrincipal: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  infoSection: {
    gap: 12,
  },

  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  infoContent: {
    marginLeft: 12,
    flex: 1,
  },

  infoLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },

  infoValor: {
    fontSize: 14,
    color: "#000",
    fontWeight: "600",
    marginTop: 2,
  },

  servicosSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },

  servicoCard: {
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#527954",
  },

  servicoNome: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
    marginBottom: 6,
  },

  servicoTipo: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },

  servicoLocal: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },

  servicoData: {
    fontSize: 12,
    color: "#999",
  },

  servicoAcao: {
    fontSize: 12,
    color: "#527954",
    fontWeight: "600",
    marginTop: 8,
  },

  nenhumServico: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingVertical: 20,
  },

  acaoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  botaoContratar: {
    backgroundColor: "#527954",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    elevation: 3,
  },

  botaoChat: {
    backgroundColor: "#005362",
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  botaoChatTexto: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  botaoContrataTexto: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
