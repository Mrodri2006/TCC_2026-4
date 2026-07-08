import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Search, MapPin, Star, ArrowLeft, X, Phone } from "lucide-react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useState, useCallback } from "react";
import { auth, firestore } from "../firebase";
import styles from "../estilo";
import { useTheme } from "../theme/ThemeContext";
import { isSameCity } from "../utils/location";
import { getProviderRating } from "../services/reviewService";

export default function TelaProfissionais() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const route = useRoute() as any;
  const { servico } = route.params || { servico: "" };

  const [searchText, setSearchText] = useState("");
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      buscarProfissionais();
    }, [servico])
  );

  const buscarProfissionais = async () => {
    setCarregando(true);
    try {
      const usuarioId = auth.currentUser?.uid;
      if (!usuarioId) {
        setProfissionais([]);
        setCarregando(false);
        return;
      }

      const contratanteDoc = await firestore.collection("Usuario").doc(usuarioId).get();
      const contratanteDados = contratanteDoc.data() || {};
      const localizacaoContratante = String(contratanteDados.localizacao || "").trim();

      const querySnapshot = await firestore
        .collection("Usuario")
        .where("tipo", "==", "prestador")
        .where("profissao", "==", servico)
        .where("contaAtiva", "==", true)
        .where("assinaturaAtiva", "==", true)
        .get();
      const profissionaisEncontrados: any[] = [];

      for (const userDoc of querySnapshot.docs) {
        const userData = userDoc.data();
        const rating = await getProviderRating(userDoc.id, userData);
        const localizacaoPrestador = String(userData?.localizacao || "").trim();
        const mesmaRegiao = isSameCity(localizacaoContratante, localizacaoPrestador);

        if (userData?.nome && mesmaRegiao) {
          profissionaisEncontrados.push({
            id: userDoc.id,
            nome: userData.nome,
            ...rating,
            distancia: userData.distancia || "A calcular",
            tipo: userData.profissao || servico,
          });
        }
      }

      setProfissionais(profissionaisEncontrados);
      setCarregando(false);
    } catch (erro) {
      console.error("Erro ao buscar profissionais:", erro);
      setCarregando(false);
    }
  };

  const profissionaisFiltrados = profissionais.filter((pro: any) =>
    pro.nome.toLowerCase().includes(searchText.toLowerCase())
  );

  const iconColor = theme.textMuted;
  const surfaceStyle = {
    backgroundColor: theme.surface,
    borderColor: theme.surfaceBorder,
  };

  const handleChamar = (profissional: any) => {
    alert(`Você solicitou ${profissional.nome} para ${servico}`);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.titulo, { color: theme.textPrimary }]}>{servico}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.searchBox, surfaceStyle]}>
        <Search size={20} color={iconColor} />
        <TextInput
          placeholder="Buscar profissional..."
          placeholderTextColor={theme.textMuted}
          style={[styles.searchInput, { color: theme.textPrimary }]}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <X size={20} color={iconColor} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.resultadoText, { color: theme.textMuted }]}>
        {profissionaisFiltrados.length} profissional(is) encontrado(s)
      </Text>

      {carregando ? (
        <View style={styles.carregandoContainer}>
          <ActivityIndicator size="large" color={theme.textPrimary} />
          <Text style={[styles.carregandoTexto, { color: theme.textMuted }]}>Carregando profissionais...</Text>
        </View>
      ) : profissionaisFiltrados.length > 0 ? (
        profissionaisFiltrados.map((pro) => (
          <View key={pro.id} style={[styles.profissionalCard, surfaceStyle]}>
            <View style={styles.profissionalInfo}>
              <Text style={[styles.nomeProfissional, { color: theme.surfaceTextPrimary }]}>{pro.nome}</Text>

              <View style={styles.infoLinha}>
                <Star size={16} color="#FFD700" />
                <Text style={[styles.infoTexto, { color: theme.surfaceTextMuted }]}>{Number(pro.avaliacao || 0).toFixed(1)} ({Number(pro.numeroAvaliacoes || 0)})</Text>
              </View>

              <View style={styles.infoLinha}>
                <MapPin size={16} color={iconColor} />
                <Text style={[styles.infoTexto, { color: theme.surfaceTextMuted }]}>{pro.distancia}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.botaoChamar}
              onPress={() => handleChamar(pro)}
            >
              <Phone size={20} color="#fff" />
              <Text style={styles.botaoTexto}>Chamar</Text>
            </TouchableOpacity>
          </View>
        ))
      ) : (
        <Text style={[styles.nenhumResultado, { color: theme.textMuted }]}>
          Nenhum profissional encontrado
        </Text>
      )}
    </ScrollView>
  );
}
