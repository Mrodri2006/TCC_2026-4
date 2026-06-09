import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";
import { ArrowLeft } from "lucide-react-native";

export default function Avaliacao() {
  const navigation = useNavigation() as any;
  const route = useRoute() as any;
  const servico = route.params?.servico;
  const { theme } = useTheme();

  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [comentarioError, setComentarioError] = useState("");

  // importar uma biblioteca 
  // https://github.com/wbotelhos/blacklist/blob/master/blacklist-server/.project 
  const palavrasProibidas = [ 
    "idiota", 
    "lixo",
    "burro",
    "burra",
    "incompetente",
    "vergonha",
    "horrível",
    "nojento",
    "nojenta",
    "desgraçado",
    "desgraçada",
    "imbecil",
  ];

  // 🔍 Função para verificar conteúdo
  const contemPalavraProibida = (texto: string) => {
    return palavrasProibidas.some(p =>
      texto.toLowerCase().includes(p)
    );
  };

  const salvarAvaliacao = async () => {
    if (!servico?.clienteId) {
      Alert.alert("Erro", "Informacoes do servico incompletas");
      return;
    }

    if (!Number.isFinite(nota) || nota < 1 || nota > 5) {
      Alert.alert("Erro", "Informe uma nota entre 1 e 5");
      return;
    }

    // 🚫 VALIDAÇÃO DO COMENTÁRIO
    if (comentarioError) {
      Alert.alert("Comentário inválido", comentarioError);
      return;
    }

// atualiza as informações do banco de dados incluindo a aval
    try {
      let prestadorId = servico?.prestadorId;
      const requestId = servico?.requestId || servico?.id;

      if (!prestadorId && requestId) {
        const snap = await firestore
          .collectionGroup("ServicoStatus")
          .where("requestId", "==", requestId)
          .where("clienteId", "==", servico.clienteId)
          .limit(1)
          .get();

        if (!snap.empty) {
          const data = snap.docs[0].data() as any;
          prestadorId = data.prestadorId;
        }
      }

      if (!prestadorId) {
        Alert.alert("Erro", "Nao foi possivel identificar o prestador");
        return;
      }

      const payload = {
        avaliacaoNota: nota,
        avaliacaoComentario: comentario,
        avaliacaoData: new Date(),
        avaliacaoLiberada: false,
        avaliado: true,
      };

      await firestore
        .collection("ServicosAgendados")
        .doc(prestadorId)
        .collection("ServicoStatus")
        .doc(servico.id)
        .set(payload, { merge: true });

      await firestore
        .collection("ServicosClientes")
        .doc(servico.clienteId)
        .collection("ServicoStatus")
        .doc(servico.id)
        .set(
          {
            ...payload,
            prestadorId,
          },
          { merge: true }
        );

      Alert.alert("Sucesso", "Avaliacao registrada");
      navigation.goBack();
    } catch (erro) {
      console.error("Erro ao salvar avaliacao:", erro);
      Alert.alert("Erro", "Nao foi possivel salvar a avaliacao");
    }
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

        <Text style={styles.titulo}>Avaliar Serviço</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.servicoTitulo}>
          {servico?.estilo || servico?.tipo || "Servico"}
        </Text>
        <Text style={styles.servicoInfo}>
          {servico?.data || "Data nao informada"} - {servico?.local || "Local nao informado"}
        </Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nota</Text>
          <View style={styles.estrelasRow}>
            {[1, 2, 3, 4, 5].map((valor) => {
              const ativa = valor <= nota;
              return (
                <TouchableOpacity
                  key={valor}
                  style={styles.estrelaBotao}
                  onPress={() => setNota(valor)}
                  accessibilityRole="button"
                  accessibilityLabel={`Definir nota ${valor}`}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.estrela,
                      ativa ? styles.estrelaAtiva : styles.estrelaInativa,
                    ]}
                  >
                    {ativa ? "★" : "☆"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {nota > 0 ? <Text style={styles.notaTexto}>Sua nota: {nota}</Text> : null}
        </View>

        {/* 💬 NOVO CAMPO DE COMENTÁRIO */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Comentário (opcional)</Text>
          <TextInput
            style={[styles.input, styles.inputLongo]}
            placeholder="Digite seu comentário..."
            placeholderTextColor="#94A3B8"
            value={comentario}
            onChangeText={(text) => {
              setComentario(text);
              if (text.trim().length > 0 && contemPalavraProibida(text)) {
                setComentarioError("Seu comentário contém palavras proibidas");
              } else {
                setComentarioError("");
              }
            }}
            multiline
            numberOfLines={4}
          />
          {comentarioError ? (
            <Text style={styles.errorText}>{comentarioError}</Text>
          ) : null}
        </View>

        <View style={styles.botoes}>
          <TouchableOpacity
            style={[styles.botao, styles.botaoCancelar]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.botaoTexto}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botao, styles.botaoConfirmar]}
            onPress={salvarAvaliacao}
            activeOpacity={0.85}
          >
            <Text style={[styles.botaoTexto, styles.botaoTextoConfirmar]}>
              Salvar Avaliação
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 24 }} />
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
  },

  titulo: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F2937",
    flex: 1,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
    marginBottom: 16,
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  servicoTitulo: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F2937",
    marginBottom: 6,
  },
  servicoInfo: {
    fontSize: 13,
    color: "#64748B",
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },

  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F2937",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(15, 41, 55, 0.12)",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: "#0F2937",
  },
  inputLongo: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  estrelasRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  estrelaBotao: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  estrela: {
    fontSize: 28,
  },
  estrelaAtiva: {
    color: "#F59E0B",
  },
  estrelaInativa: {
    color: "#CBD5E1",
  },
  notaTexto: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "700",
  },

  botoes: {
    flexDirection: "row",
    marginTop: 8,
  },

  botao: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  botaoCancelar: {
    marginRight: 12,
    backgroundColor: "rgba(15, 41, 55, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(15, 41, 55, 0.12)",
  },

  botaoConfirmar: {
    backgroundColor: "#2563EB",
  },

  botaoTexto: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F2937",
  },

  botaoTextoConfirmar: {
    color: "#fff",
  },
});
