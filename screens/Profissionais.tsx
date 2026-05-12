import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, FlatList, ActivityIndicator } from "react-native";
import { Search, MapPin, Star, ArrowLeft, X, Phone } from "lucide-react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useState, useCallback } from "react";
import { auth, firestore } from "../firebase";
import styles from "../estilo";
import { useTheme } from "../theme/ThemeContext";

export default function TelaProfissionais() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const route = useRoute() as any;
  const { servico } = route.params || { servico: "" };

  const [searchText, setSearchText] = useState("");
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const normalizarLocalizacao = (valor: string) =>
    (valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

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
      const localizacaoContratanteNormalizada =
        String(contratanteDados.localizacaoNormalizada || "") || normalizarLocalizacao(localizacaoContratante);

      const querySnapshot = await firestore.collectionGroup("Serv").get();
      const profissionaisEncontrados: any[] = [];

      querySnapshot.forEach((doc) => {
        const servicoDados = doc.data();

        if (servicoDados.tipo && servicoDados.tipo.toLowerCase() === servico.toLowerCase()) {
  
          const userRef = doc.ref.parent.parent;
          
          userRef.get().then((userDoc) => {
            const userData = userDoc.data();
            const localizacaoPrestador = String(userData?.localizacao || "").trim();
            const localizacaoPrestadorNormalizada =
              String(userData?.localizacaoNormalizada || "") || normalizarLocalizacao(localizacaoPrestador);
            const mesmaRegiao =
              !!localizacaoContratanteNormalizada &&
              localizacaoPrestadorNormalizada === localizacaoContratanteNormalizada;
            
            if (userData && userData.nome && mesmaRegiao) {
              const profissional = {
                id: userDoc.id,
                nome: userData.nome,
                avaliacao: userData.avaliacao || 4.5,
                distancia: userData.distancia || "A calcular",
                tipo: servicoDados.tipo,
              };

              if (!profissionaisEncontrados.find((p: any) => p.id === profissional.id)) {
                profissionaisEncontrados.push(profissional);
              }
            }
          });
        }
      });

      setTimeout(() => {
        setProfissionais(profissionaisEncontrados);
        setCarregando(false);
      }, 500);
    } catch (erro) {
      console.error("Erro ao buscar profissionais:", erro);
      setCarregando(false);
    }
  };

  const profissionaisFiltrados = profissionais.filter((pro: any) =>
    pro.nome.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleChamar = (profissional: any) => {
    alert(`Você solicitou ${profissional.nome} para ${servico}`);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.titulo}>{servico}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchBox}>
        <Search size={20} color="#666" />
        <TextInput
          placeholder="Buscar profissional..."
          placeholderTextColor="#777"
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <X size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.resultadoText}>
        {profissionaisFiltrados.length} profissional(is) encontrado(s)
      </Text>

      {carregando ? (
        <View style={styles.carregandoContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.carregandoTexto}>Carregando profissionais...</Text>
        </View>
      ) : profissionaisFiltrados.length > 0 ? (
        profissionaisFiltrados.map((pro) => (
          <View key={pro.id} style={styles.profissionalCard}>
            <View style={styles.profissionalInfo}>
              <Text style={styles.nomeProfissional}>{pro.nome}</Text>

              <View style={styles.infoLinha}>
                <Star size={16} color="#FFD700" />
                <Text style={styles.infoTexto}>{pro.avaliacao}</Text>
              </View>

              <View style={styles.infoLinha}>
                <MapPin size={16} color="#666" />
                <Text style={styles.infoTexto}>{pro.distancia}</Text>
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
        <Text style={styles.nenhumResultado}>
          Nenhum profissional encontrado
        </Text>
      )}
    </ScrollView>
  );
}
