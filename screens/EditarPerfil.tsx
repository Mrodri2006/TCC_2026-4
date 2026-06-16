import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowLeft, Save } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";

export default function EditarPerfil() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useTheme();
  const [formDados, setFormDados] = useState({
    nome: "",
    email: "",
    fone: "",
    distancia: "",
    profissao: "",
  });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const topBarIconColor = isDark ? "#2563EB" : "#0F2937";
  const topBarBtnBg = isDark ? theme.headerBtnBg : "rgba(15, 41, 55, 0.06)";
  const topBarTitleColor = isDark ? "#2563EB" : "#0F2937";
  const cardBackground = isDark ? theme.surface : "#FFFFFF";
  const cardBorderColor = isDark ? theme.surfaceBorder : "transparent";
  const inputBackground = isDark ? theme.actionBg : "#F8FAFC";

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
          const dados: any = docSnap.data() || {};
          setFormDados({
            nome: dados.nome || "",
            email: usuarioAutenticado.email || "",
            fone: dados.fone || "",
            distancia: dados.distancia || "",
            profissao: dados.profissao || "",
          });
        } else {
          setFormDados((prev) => ({
            ...prev,
            email: usuarioAutenticado.email || "",
          }));
        }
      }
    } catch (erro) {
      console.error("Erro ao carregar dados:", erro);
    } finally {
      setCarregando(false);
    }
  };

  const validarFormulario = () => {
    const novoErros: Record<string, string> = {};

    if (!formDados.nome?.trim()) {
      novoErros.nome = "Nome e obrigatorio";
    } else if (formDados.nome.trim().length < 3) {
      novoErros.nome = "Nome deve ter no minimo 3 caracteres";
    }

    if (!formDados.fone?.trim()) {
      novoErros.fone = "Telefone e obrigatorio";
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

        await refUsuario.update({
          nome: formDados.nome,
          fone: formDados.fone,
          distancia: formDados.distancia,
          profissao: formDados.profissao,
        });

        Alert.alert("Sucesso", "Perfil atualizado com sucesso!");
        navigation.goBack();
      }
    } catch (erro) {
      console.error("Erro ao salvar dados:", erro);
      Alert.alert("Erro", "Erro ao salvar dados. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.carregandoContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={[styles.carregandoTexto, { color: theme.textMuted }]}>
            Carregando dados...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const inputThemeStyle = {
    backgroundColor: inputBackground,
    color: theme.textPrimary,
    borderColor: isDark ? theme.surfaceBorder : "#E2E8F0",
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.topBarBtn, { backgroundColor: topBarBtnBg }]}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={topBarIconColor} />
          </TouchableOpacity>

          <Text style={[styles.topBarTitle, { color: topBarTitleColor }]}>Editar Perfil</Text>

          <TouchableOpacity
            onPress={salvarDados}
            disabled={salvando}
            style={[styles.topBarBtn, { backgroundColor: topBarBtnBg }, salvando && styles.botaoDesabilitado]}
            activeOpacity={0.7}
          >
            {salvando ? (
              <ActivityIndicator size="small" color={topBarIconColor} />
            ) : (
              <Save size={18} color={topBarIconColor} />
            )}
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.formContainer,
            {
              backgroundColor: cardBackground,
              borderColor: cardBorderColor,
              borderWidth: isDark ? 1 : 0,
            },
          ]}
        >
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.surfaceTextPrimary }]}>Nome Completo</Text>
            <TextInput
              style={[styles.input, inputThemeStyle, errors.nome && styles.inputError]}
              placeholder="Digite seu nome"
              placeholderTextColor={theme.textMuted}
              value={formDados.nome}
              onChangeText={(valor) => {
                setFormDados({ ...formDados, nome: valor });
                if (errors.nome) setErrors({ ...errors, nome: "" });
              }}
              editable={!salvando}
            />
            {errors.nome ? <Text style={styles.errorText}>{errors.nome}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.surfaceTextPrimary }]}>E-mail</Text>
            <TextInput
              style={[
                styles.input,
                styles.inputDisabled,
                { color: theme.textMuted, borderColor: isDark ? theme.surfaceBorder : "#E2E8F0" },
              ]}
              placeholder="E-mail"
              placeholderTextColor={theme.textMuted}
              value={formDados.email}
              editable={false}
            />
            <Text style={[styles.helperText, { color: theme.textMuted }]}>
              E-mail nao pode ser alterado
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.surfaceTextPrimary }]}>Telefone</Text>
            <TextInput
              style={[styles.input, inputThemeStyle, errors.fone && styles.inputError]}
              placeholder="(XX) XXXXX-XXXX"
              placeholderTextColor={theme.textMuted}
              value={formDados.fone}
              onChangeText={(valor) => {
                setFormDados({ ...formDados, fone: valor });
                if (errors.fone) setErrors({ ...errors, fone: "" });
              }}
              keyboardType="phone-pad"
              editable={!salvando}
            />
            {errors.fone ? <Text style={styles.errorText}>{errors.fone}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.surfaceTextPrimary }]}>Profissao</Text>
            <TextInput
              style={[styles.input, inputThemeStyle]}
              placeholder="Ex: Eletricista"
              placeholderTextColor={theme.textMuted}
              value={formDados.profissao}
              onChangeText={(valor) => setFormDados({ ...formDados, profissao: valor })}
              editable={!salvando}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.surfaceTextPrimary }]}>Distancia (km)</Text>
            <TextInput
              style={[styles.input, inputThemeStyle]}
              placeholder="Ex: 2 km"
              placeholderTextColor={theme.textMuted}
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
                <Text style={styles.botaoTexto}>Salvar Alteracoes</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botaoCancelar,
              {
                backgroundColor: isDark ? theme.actionBg : "#FFFFFF",
                borderColor: isDark ? theme.surfaceBorder : "#E2E8F0",
              },
            ]}
            onPress={() => navigation.goBack()}
            disabled={salvando}
          >
            <Text style={[styles.botaoCancelarTexto, { color: theme.textSecondary }]}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  carregandoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  carregandoTexto: {
    fontSize: 14,
    marginTop: 12,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginBottom: 6,
  },
  topBarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 41, 55, 0.06)",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F2937",
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#0F2937",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F2937",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: "#0F2937",
    backgroundColor: "#F8FAFC",
  },
  inputError: {
    borderColor: "#E74C3C",
    backgroundColor: "#FEF2F2",
  },
  inputDisabled: {
    backgroundColor: "#EEF2F7",
    color: "#64748B",
  },
  errorText: {
    color: "#E74C3C",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    marginLeft: 4,
  },
  helperText: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontStyle: "italic",
  },
  botaoSalvarCompleto: {
    backgroundColor: "#2563EB",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  botaoCancelar: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  botaoCancelarTexto: {
    color: "#64748B",
    fontWeight: "700",
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
