
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from "react-native";
import { ArrowLeft, Calendar, MapPin, FileText } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { firestore, auth } from "../firebase";
import { useTheme } from "../theme/ThemeContext";

export default function SolicitarServico() {
  const navigation = useNavigation<any>();
  const route = useRoute() as any;
  const { prestadorId, prestadorNome, servico } = route.params || {};
  const { theme } = useTheme();

  const [data, setData] = useState("");
  const [local, setLocal] = useState("");
  const [descricao, setDescricao] = useState("");
  const [carregando, setCarregando] = useState(false);

  const salvarSolicitacao = async () => {
    if (!data || !local) {
      Alert.alert("Erro", "Preencha todos os campos obrigatórios");
      return;
    }

    setCarregando(true);
    try {
      const usuarioLogado = auth.currentUser?.uid;
      
      if (!usuarioLogado) {
        Alert.alert("Erro", "Usuário não autenticado");
        setCarregando(false);
        return;
      }

      const novoServico = {
        id: Math.random().toString(),
        estilo: servico,
        tipo: servico,
        data: data,
        local: local,
        descricao: descricao,
        status: 'aguardando',
        clienteId: usuarioLogado,
        dataSolicitacao: new Date(),
        criadoEm: new Date(),
        prestadorId: prestadorId,
      };

      await firestore
        .collection("ServicosAgendados")
        .doc(prestadorId)
        .collection("ServicoStatus")
        .doc(novoServico.id)
        .set(novoServico);

      await firestore
        .collection("ServicosClientes")
        .doc(usuarioLogado)
        .collection("ServicoStatus")
        .doc(novoServico.id)
        .set(novoServico);

      Alert.alert(
        "Sucesso!",
        `Serviço solicitado com sucesso para ${prestadorNome}`,
        [
          {
            text: "OK",
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );

      setCarregando(false);
    } catch (erro) {
      console.error("Erro ao solicitar serviço:", erro);
      Alert.alert("Erro", "Não foi possível solicitar o serviço. Tente novamente.");
      setCarregando(false);
    }
  };

  return (
    <ScrollView style={[estilos.container, { backgroundColor: theme.background }]}>
      <View style={estilos.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#0c0c0c" />
        </TouchableOpacity>
        <Text style={estilos.titulo}>Solicitar Serviço</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={estilos.cardPrestador}>
        <View style={estilos.avatarPrestador}>
          <Text style={estilos.avatarTexto}>
            {prestadorNome?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={estilos.infoPrestador}>
          <Text style={estilos.nomePrestador}>{prestadorNome}</Text>
          <View style={estilos.profissaoBadge}>
            <Text style={estilos.profissaoTexto}>{servico}</Text>
          </View>
        </View>
      </View>

      <View style={estilos.formulario}>

        <View style={estilos.campoGrupo}>
          <Text style={estilos.label}>
            <Calendar size={16} color="#0F2937" /> Data do Serviço *
          </Text>
          <TextInput
            style={estilos.input}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#94A3B8"
            value={data}
            onChangeText={setData}
            editable={!carregando}
          />
          <Text style={estilos.hint}>
            Formato: 25/03/2026
          </Text>
        </View>

        <View style={estilos.campoGrupo}>
          <Text style={estilos.label}>
            <MapPin size={16} color="#0F2937" /> Local do Serviço *
          </Text>
          <TextInput
            style={estilos.input}
            placeholder="Rua, número, bairro..."
            placeholderTextColor="#94A3B8"
            value={local}
            onChangeText={setLocal}
            editable={!carregando}
          />
        </View>

        <View style={estilos.campoGrupo}>
          <Text style={estilos.label}>
            <FileText size={16} color="#0F2937" /> Descrição (opcional)
          </Text>
          <TextInput
            style={[estilos.input, estilos.inputLongo]}
            placeholder="Descreva detalhes do serviço desejado..."
            placeholderTextColor="#94A3B8"
            value={descricao}
            onChangeText={setDescricao}
            multiline
            numberOfLines={4}
            editable={!carregando}
          />
        </View>

        <View style={estilos.botoes}>
          <TouchableOpacity
            style={[estilos.botao, estilos.botaoCancelar]}
            onPress={() => navigation.goBack()}
            disabled={carregando}
          >
            <Text style={estilos.botaoTexto}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              estilos.botao,
              estilos.botaoConfirmar,
              carregando && estilos.botaoDesabilitado,
            ]}
            onPress={salvarSolicitacao}
            disabled={carregando}
          >
            <Text style={[estilos.botaoTexto, estilos.botaoTextoConfirmar]}>
              {carregando ? "Solicitando..." : "Solicitar Serviço"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F4FF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#0F2937",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  titulo: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F2937",
    flex: 1,
    textAlign: "center",
  },

  cardPrestador: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },

  avatarPrestador: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  avatarTexto: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  infoPrestador: {
    flex: 1,
  },

  nomePrestador: {
    fontSize: 16,
    fontWeight: "800",
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

  formulario: {
    marginBottom: 30,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },

  campoGrupo: {
    marginBottom: 18,
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
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: "#0F2937",
    backgroundColor: "#F8FAFC",
  },

  inputLongo: {
    textAlignVertical: "top",
    paddingTop: 12,
    minHeight: 100,
  },

  hint: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
  },

  botoes: {
    flexDirection: "row",
    marginTop: 24,
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

  botaoDesabilitado: {
    opacity: 0.6,
  },
});
