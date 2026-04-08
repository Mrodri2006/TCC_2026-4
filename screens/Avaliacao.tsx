import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";

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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={styles.title}>Avaliar Servico</Text>

      <View style={styles.card}>
        <Text style={styles.servicoTitulo}>
          {servico?.estilo || servico?.tipo || "Servico"}
        </Text>
        <Text style={styles.servicoInfo}>
          {servico?.data || "Data nao informada"} - {servico?.local || "Local nao informado"}
        </Text>
      </View>

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
              >
                <Text style={[styles.estrela, ativa ? styles.estrelaAtiva : styles.estrelaInativa]}>
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
          style={[styles.input, { height: 80 }]}
          placeholder="Digite seu comentário..."
          placeholderTextColor="#999"
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
        />
        {comentarioError ? <Text style={styles.errorText}>{comentarioError}</Text> : null}
      </View>

      <TouchableOpacity style={styles.salvarButton} onPress={salvarAvaliacao}>
        <Text style={styles.salvarButtonText}>Salvar Avaliacao</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelarButton} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelarButtonText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginTop: 40,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#005362",
    marginBottom: 16,
  },
  servicoTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  servicoInfo: {
    fontSize: 13,
    color: "#666",
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: "#333",
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
    color: "#f5b301",
  },
  estrelaInativa: {
    color: "#c9c9c9",
  },
  notaTexto: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
  },
  salvarButton: {
    backgroundColor: "#005362",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  salvarButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  cancelarButton: {
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#eee",
    alignItems: "center",
  },
  cancelarButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
});
