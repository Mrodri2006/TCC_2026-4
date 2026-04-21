
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { ArrowLeft, MapPin, Star, Briefcase } from "lucide-react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useState, useCallback } from "react";
import { firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";


export default function PrestadoresPorServico() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const route = useRoute() as any;
  const { servico } = route.params || { servico: "" };

  const [usuariosPrestadores, setUsuariosPrestadores] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      buscarPrestadoresPorServico();
    }, [servico])
  );

  const buscarPrestadoresPorServico = async () => {
    setCarregando(true);
    try {
      const users = await firestore.collection("Usuario").get();
      const prestadores = [];

      for (const userDoc of users.docs) {
        const userData = userDoc.data();
        
        if (userData.tipo === "prestador" && userData.profissao === servico) {
          prestadores.push({
            id: userDoc.id,
            nome: userData.nome || "Sem nome",
            email: userData.email || "",
            profissao: userData.profissao || "Geral",
            avaliacao: userData.avaliacao || 4.5,
            distancia: userData.distancia || "A calcular",
            telefone: userData.fone || "Não informado",
            criadoEm: userData.criadoEm,
          });
        }
      }
      
      prestadores.sort((a, b) => {
        const dateA = a.criadoEm?.toDate?.() || new Date(0);
        const dateB = b.criadoEm?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setUsuariosPrestadores(prestadores);
      setCarregando(false);
    } catch (erro) {
      console.error("Erro ao buscar prestadores:", erro);
      setCarregando(false);
    }
  };

  const handleChamar = (prestador: any) => {
    navigation.navigate("SolicitarServico", {
      prestadorId: prestador.id,
      prestadorNome: prestador.nome,
      servico: servico,
    });
  };


  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#0c0c0c" />
        </TouchableOpacity>
        <Text style={styles.titulo}>{servico}</Text>
        <View style={{ width: 24, marginTop:80 }} />
      </View>

      <View style={styles.infoSection}>
        <Briefcase size={18} color="#0c0c0c" />
        <Text style={styles.infoText}>
          Profissionais disponíveis em {servico.toLowerCase()}
        </Text>
      </View>

      {carregando ? (
        <View style={styles.carregandoContainer}>
          <ActivityIndicator size="large" color="#0c0c0c" />
          <Text style={styles.carregandoTexto}>Carregando profissionais...</Text>
        </View>
      ) : usuariosPrestadores.length > 0 ? (
        <View style={styles.prestadoresList}>
          {usuariosPrestadores.map((prestador) => (
            <TouchableOpacity
              key={prestador.id}
              style={styles.prestadorCard}
              activeOpacity={0.85}
            >
              <View style={styles.prestadorAvatar}>
                <Text style={styles.prestadorAvatarText}>
                  {prestador.nome.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.prestadorInfo}>
                <View style={styles.topRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prestadorNome}>{prestador.nome}</Text>
                    <View style={styles.profissaoBadge}>
                      <Text style={styles.profissaoTexto}>{prestador.profissao}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.prestadorRating}>
                  <View style={styles.detalheItem}>
                    <Star size={14} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.detalheTexto}>
                      {prestador.avaliacao.toFixed(1)}
                    </Text>
                  </View>

                  <View style={styles.detalheItem}>
                    <MapPin size={14} color="#0c0c0c" />
                    <Text style={styles.detalheTexto}> {prestador.distancia}</Text>
                  </View>
                </View>

                
              </View>

              <TouchableOpacity
                style={styles.botaoChamar}
                activeOpacity={0.8}
                onPress={() => handleChamar(prestador)}
              >
                <Text style={styles.botaoTxt}>Chamar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.nenhumContainer}>
          <Text style={styles.nenhumResultado}>
            Nenhum profissional de {servico} encontrado
          </Text>
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

  titulo: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F2937",
    flex: 1,
    textAlign: "center",
  },

  infoSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f8fa",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },

  infoText: {
    fontSize: 14,
    color: "#005362",
    fontWeight: "500",
    flex: 1,
    marginLeft: 10,
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

  prestadoresList: {
    marginBottom: 24,
  },

  prestadorCard: {
    flexDirection: "row",
    alignItems: "center",
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

  prestadorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  prestadorAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  prestadorInfo: {
    flex: 1,
    paddingRight: 12,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  prestadorNome: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F2937",
    marginBottom: 6,
  },

  profissaoBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },

  profissaoTexto: {
    fontSize: 12,
    color: "#1D4ED8",
    fontWeight: "700",
  },

  prestadorRating: {
    flexDirection: "row",
    alignItems: "center",
  },

  detalheItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 14,
  },

  detalheTexto: {
    fontSize: 12,
    color: "#0F2937",
    fontWeight: "700",
    marginLeft: 6,
  },

  botaoChamar: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignSelf: "center",
    elevation: 2,
  },

  botaoTxt: {
    color: "#fff",
    fontWeight: "700",
  },

  nenhumContainer: {
    alignItems: "center",
    marginTop: 32,
    paddingHorizontal: 16,
  },

  nenhumResultado: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginVertical: 24,
  },
});
