
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { ArrowLeft, MapPin, Star, Briefcase } from "lucide-react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useState, useCallback } from "react";
import { firestore } from "../firebase";
import styles from "../estilo";
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
            telefone: userData.fone || "NÃ£o informado",
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
          <ArrowLeft size={24} color="#005362" />
        </TouchableOpacity>
        <Text style={styles.titulo}>{servico}</Text>
        <View style={{ width: 24, marginTop:80 }} />
      </View>

      <View style={styles.infoSection}>
        <Briefcase size={18} color="#005362" />
        <Text style={styles.infoText}>
          Profissionais disponÃ­veis em {servico.toLowerCase()}
        </Text>
      </View>

      {carregando ? (
        <View style={styles.carregandoContainer}>
          <ActivityIndicator size="large" color="#005362" />
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
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {prestador.nome.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.infoContainer}>
                <View style={styles.topRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nomePrestador}>{prestador.nome}</Text>
                    <View style={styles.profissaoBadge}>
                      <Text style={styles.profissaoTexto}>{prestador.profissao}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detalhesRow}>
                  <View style={styles.detalheItem}>
                    <Star size={14} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.detalheTexto}>
                      {prestador.avaliacao.toFixed(1)}
                    </Text>
                  </View>

                  <View style={styles.detalheItem}>
                    <MapPin size={14} color="#005362" />
                    <Text style={styles.detalheTexto}>{prestador.distancia}</Text>
                  </View>
                </View>

                <Text style={styles.emailTexto}>{prestador.email}</Text>
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
