import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput } from "react-native";
import { ArrowLeft, Save } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useState, useEffect } from "react";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";

export default function EditarPerfil() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [formDados, setFormDados] = useState({
    nome: "",
    email: "",
    fone: "",
    distancia: "",
    profissao: "",
  });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    carregarDadosUsuario();
  }, []);

  const carregarDadosUsuario = async () => {
    setCarregando(true);
    try {
      const usuarioAutenticado = auth.currentUser;
      if (usuarioAutenticado) {
        const docSnap = await firestore.collection("Usuario").doc(usuarioAutenticado.uid).get();
        
        if (docSnap.exists) {
          const dados = docSnap.data();
          setFormDados({
            nome: dados.nome || "",
            email: usuarioAutenticado.email || "",
            fone: dados.fone || "",
            distancia: dados.distancia || "",
            profissao: dados.profissao || "",
          });
        } else {
          setFormDados(prev => ({
            ...prev,
            email: usuarioAutenticado.email || "",
          }));
        }
      }
      setCarregando(false);
    } catch (erro) {
      console.error("Erro ao carregar dados:", erro);
      setCarregando(false);
    }
  };

  const validarFormulario = () => {
    let novoErros = {};
    
    if (!formDados.nome?.trim()) {
      novoErros.nome = "Nome é obrigatório";
    } else if (formDados.nome.trim().length < 3) {
      novoErros.nome = "Nome deve ter no mínimo 3 caracteres";
    }

    if (!formDados.fone?.trim()) {
      novoErros.fone = "Telefone é obrigatório";
    }
    setErrors(novoErros);
    return Object.keys(novoErros).length === 0;
  };

  const salvarDados = async () => {
    if (!validarFormulario()) return;

    setSalvando(true);
    try {
      const usuarioAutenticado = auth.currentUser;
      if (usuarioAutenticado) {
        const refUsuario = firestore.collection("Usuario").doc(usuarioAutenticado.uid);
        
        const dadosAtualizacao = {
          nome: formDados.nome,
          fone: formDados.fone,
          distancia: formDados.distancia,
          profissao: formDados.profissao,
        };

        await refUsuario.update(dadosAtualizacao);
        
        alert("Perfil atualizado com sucesso!");
        navigation.goBack();
      }
    } catch (erro) {
      console.error("Erro ao salvar dados:", erro);
      alert("Erro ao salvar dados. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };



  if (carregando) {
    return (
      <View style={[styles.carregandoContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#005362" />
        <Text style={styles.carregandoTexto}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#000" style={{ 
            marginTop:40 
          }}/>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <TouchableOpacity 
          onPress={salvarDados}
          disabled={salvando}
          style={styles.botaoSalvar}
        >
          {salvando ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Save size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nome Completo</Text>
          <TextInput
            style={[styles.input, errors.nome && styles.inputError]}
            placeholder="Digite seu nome"
            value={formDados.nome}
            onChangeText={(valor) => {
              setFormDados({ ...formDados, nome: valor });
              if (errors.nome) setErrors({ ...errors, nome: "" });
            }}
            editable={!salvando}
          />
          {errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            placeholder="E-mail"
            value={formDados.email}
            editable={false}
          />
          <Text style={styles.helperText}>E-mail não pode ser alterado</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={[styles.input, errors.fone && styles.inputError]}
            placeholder="(XX) XXXXX-XXXX"
            value={formDados.fone}
            onChangeText={(valor) => {
              setFormDados({ ...formDados, fone: valor });
              if (errors.fone) setErrors({ ...errors, fone: "" });
            }}
            keyboardType="phone-pad"
            editable={!salvando}
          />
          {errors.fone && <Text style={styles.errorText}>{errors.fone}</Text>}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Profissão</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Eletricista"
            value={formDados.profissao}
            onChangeText={(valor) => setFormDados({ ...formDados, profissao: valor })}
            editable={!salvando}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Distância (km)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 2 km"
            value={formDados.distancia}
            onChangeText={(valor) => setFormDados({ ...formDados, distancia: valor })}
            editable={!salvando}
          />
        </View>

        <TouchableOpacity
          style={[styles.botaoSalvarCompleto, salvando && styles.botaoDesabilitado]}
          onPress={salvarDados}
          disabled={salvando}
        >
          {salvando ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.botaoTexto}>Salvando...</Text>
            </>
          ) : (
            <>
              <Save size={20} color="#fff" />
              <Text style={styles.botaoTexto}>Salvar Alterações</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoCancelar}
          onPress={() => navigation.goBack()}
          disabled={salvando}
        >
          <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginTop:40,
  },

  botaoSalvar: {
    backgroundColor: "#005362",
    padding: 8,
    borderRadius: 8,
    marginTop:40,
  },

  formContainer: {
    padding: 20,
  },

  fieldGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#000",
    backgroundColor: "#fafafa",
  },

  inputError: {
    borderColor: "#E74C3C",
    backgroundColor: "#ffefef",
  },

  inputDisabled: {
    backgroundColor: "#f0f0f0",
    color: "#999",
  },

  errorText: {
    color: "#E74C3C",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    marginLeft: 4,
  },

  helperText: {
    color: "#999",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontStyle: "italic",
  },

  botaoSalvarCompleto: {
    backgroundColor: "#005362",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 8,
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
  },

  botaoCancelar: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },

  botaoCancelarTexto: {
    color: "#666",
    fontWeight: "600",
    fontSize: 14,
  },

  botaoTexto: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  botaoDesabilitado: {
    opacity: 0.6,
  },













});
