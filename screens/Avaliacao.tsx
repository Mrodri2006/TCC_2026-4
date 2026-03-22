import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { firestore } from "../firebase";

export default function Avaliacao() {
  const navigation = useNavigation() as any;
  const route = useRoute() as any;
  const servico = route.params?.servico;

  const [notaTexto, setNotaTexto] = useState("");

  const salvarAvaliacao = async () => {
    const nota = Number(notaTexto);
    if (!servico?.prestadorId || !servico?.clienteId) {
      Alert.alert("Erro", "Informacoes do servico incompletas");
      return;
    }
    if (!Number.isFinite(nota) || nota < 1 || nota > 5) {
      Alert.alert("Erro", "Informe uma nota entre 1 e 5");
      return;
    }

    try {
      const payload = {
        avaliacaoNota: nota,
        avaliacaoData: new Date(),
        avaliacaoLiberada: false,
        avaliado: true,
      };

      await firestore
        .collection("ServicosAgendados")
        .doc(servico.prestadorId)
        .collection("ServicoStatus")
        .doc(servico.id)
        .update(payload);

      await firestore
        .collection("ServicosClientes")
        .doc(servico.clienteId)
        .collection("ServicoStatus")
        .doc(servico.id)
        .update(payload);

      Alert.alert("Sucesso", "Avaliacao registrada");
      navigation.goBack();
    } catch (erro) {
      console.error("Erro ao salvar avaliacao:", erro);
      Alert.alert("Erro", "Nao foi possivel salvar a avaliacao");
    }
  };

  return (
    <View style={styles.container}>
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
        <Text style={styles.label}>Nota (1 a 5)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 4"
          placeholderTextColor="#999"
          value={notaTexto}
          onChangeText={setNotaTexto}
          keyboardType="numeric"
        />
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
    marginTop: 10,
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
