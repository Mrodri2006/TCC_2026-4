import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { Briefcase, Calendar, Eye, EyeOff, Lock, Mail, MapPin, Phone, User } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, firestore } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from 'react-native-modal-datetime-picker';
import { Usuario } from '../model/Usuario';

export default function Register2() {
  const [formUsuario, setFormUsuario] = useState<Partial<Usuario>>({});
  const [dataPickerVisivel, setDataPickerVisivel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [termosVisivel, setTermosVisivel] = useState(false);
  const [errors, setErrors] = useState({ nome: '', email: '', senha: '', fone: '', localizacao: '', dataNascimento: '', termos: '' });
  const [localizando, setLocalizando] = useState(false);

  const navigation = useNavigation<any>();

  const headerTitle = useMemo(() => {
    return (
      <>
        <Text style={styles.headerTitleAqua}>CADASTRO</Text>
        <Text style={styles.headerTitleWhite}> CONTRATANTE</Text>
      </>
    );
  }, []);
// Função para calcular a idade com base na data de nascimento
  const calcularIdade = (data: Date) => {
    const hoje = new Date();
    let idade = hoje.getFullYear() - data.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNasc = data.getMonth();
    if (mesAtual < mesNasc || (mesAtual === mesNasc && hoje.getDate() < data.getDate())) idade--;
    return idade;
  };

  const normalizarLocalizacao = (valor: string) =>
    valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const usarLocalizacaoAtual = async () => {
    try {
      setLocalizando(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permissão de localização negada.");
        return;
      }

      let posicao = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!posicao) {
        posicao = await Location.getLastKnownPositionAsync();
      }

      if (!posicao) {
        alert("Ative o GPS/localização do celular e tente novamente.");
        return;
      }

      const endereco = await Location.reverseGeocodeAsync({
        latitude: posicao.coords.latitude,
        longitude: posicao.coords.longitude,
      });

      const dado = endereco?.[0];
      const cidade = dado?.city || dado?.subregion || "";
      const estado = dado?.region || "";
      const localizacao = [cidade, estado].filter(Boolean).join(" - ");

      if (!localizacao) {
        alert("Não foi possível identificar sua localização.");
        return;
      }

      setFormUsuario((prev) => ({ ...prev, localizacao }));
      if (errors.localizacao) setErrors((prev) => ({ ...prev, localizacao: "" }));
    } catch (erro: any) {
      console.log("Erro ao obter localização:", erro);
      if (String(erro?.message || "").toLowerCase().includes("location is unavailable")) {
        alert("Localização indisponível. Verifique se o GPS do aparelho está ligado.");
        return;
      }
      alert("Não foi possível obter sua localização agora.");
    } finally {
      setLocalizando(false);
    }
  };

  const validarFormulario = () => {
    let novoErros = { nome: '', email: '', senha: '', fone: '', localizacao: '', dataNascimento: '', termos: '' };
    let valido = true;

    if (!formUsuario.nome?.trim()) {
      novoErros.nome = 'Nome é obrigatório'; valido = false;
    } else if (formUsuario.nome.trim().length < 3) {
      novoErros.nome = 'Nome deve ter no mínimo 3 caracteres'; valido = false;
    }
    if (!formUsuario.email?.trim()) {
      novoErros.email = 'E-mail é obrigatório'; valido = false;
    }
    if (!formUsuario.senha?.trim()) {
      novoErros.senha = 'Senha é obrigatória'; valido = false;
    }
    if (!formUsuario.fone?.trim()) {
      novoErros.fone = 'Telefone é obrigatório'; valido = false;
    }
    if (!formUsuario.localizacao?.trim()) {
      novoErros.localizacao = 'Localiza??o ? obrigat?ria'; valido = false;
    }
    if (!formUsuario.dataNascimento) {
      novoErros.dataNascimento = 'Data de nascimento é obrigatória'; valido = false;
    } else if (calcularIdade(formUsuario.dataNascimento) < 18) {
      novoErros.dataNascimento = 'Você deve ter no mínimo 18 anos'; valido = false;
    }
    if (!aceitouTermos) {
      novoErros.termos = 'Aceite os termos e as especificacoes do app'; valido = false;
    }

    setErrors(novoErros);
    return valido;
  };

  const registrar = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      await auth.createUserWithEmailAndPassword(formUsuario.email!, formUsuario.senha!);

      await firestore.collection('Usuario').doc(auth.currentUser!.uid).set({
        id: auth.currentUser!.uid,
        nome: formUsuario.nome,
        email: formUsuario.email,
        fone: formUsuario.fone,
        localizacao: formUsuario.localizacao?.trim(),
        localizacaoNormalizada: normalizarLocalizacao(formUsuario.localizacao || ""),
        dataNascimento: formUsuario.dataNascimento?.toISOString() || null,
        tipo: 'contratante',
        admin: false,
        criadoEm: new Date(),
      });

      navigation.replace('Home');
    } catch (erro: any) {
      alert(erro.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmarData = (data: Date) => {
    setFormUsuario({ ...formUsuario, dataNascimento: data });
    if (errors.dataNascimento) setErrors({ ...errors, dataNascimento: '' });
    setDataPickerVisivel(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
        <LinearGradient colors={["rgba(0,0,0,0.75)", "rgba(0,0,0,0.9)"]} style={styles.overlay} />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{headerTitle}</Text>
              <View style={styles.headerUnderline} />
            </View>

            <View style={styles.logoRow}>
              <Image source={require("../assets/logo8.jpg")} style={styles.logo} resizeMode="contain" />
            </View>

            <View style={styles.segmented}>
              <TouchableOpacity style={styles.segmentedActive} activeOpacity={0.85}>
                <LinearGradient
                  colors={["#0EA5A8", "#0B7280"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.segmentedActiveBg}
                >
                  <User size={18} color="#EAFBFF" />
                  <Text style={styles.segmentedActiveText}>Contratante</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.segmentedInactive}
                activeOpacity={0.85}
                onPress={() => navigation.replace("Register")}
              >
                <Briefcase size={18} color="#9CA3AF" />
                <Text style={styles.segmentedInactiveText}>Prestador</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.inputWrap}>
                <User size={18} color="#0EA5A8" />
                <TextInput
                  placeholder="Nome"
                  placeholderTextColor="#6B7280"
                  value={formUsuario.nome || ""}
                  onChangeText={(valor) => setFormUsuario({ ...formUsuario, nome: valor })}
                  style={styles.input}
                />
              </View>
              {!!errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}

              <View style={styles.inputWrap}>
                <Mail size={18} color="#0EA5A8" />
                <TextInput
                  placeholder="E-mail"
                  placeholderTextColor="#6B7280"
                  value={formUsuario.email || ""}
                  onChangeText={(valor) => setFormUsuario({ ...formUsuario, email: valor })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
              {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

              <View style={styles.inputWrap}>
                <Lock size={18} color="#0EA5A8" />
                <TextInput
                  placeholder="Senha"
                  placeholderTextColor="#6B7280"
                  value={formUsuario.senha || ""}
                  onChangeText={(valor) => setFormUsuario({ ...formUsuario, senha: valor })}
                  secureTextEntry={!mostrarSenha}
                  style={styles.input}
                />
                <TouchableOpacity onPress={() => setMostrarSenha((v) => !v)} activeOpacity={0.8} style={styles.eyeBtn}>
                  {mostrarSenha ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
                </TouchableOpacity>
              </View>
              {!!errors.senha && <Text style={styles.errorText}>{errors.senha}</Text>}

              <View style={styles.inputWrap}>
                <Phone size={18} color="#0EA5A8" />
                <TextInput
                  placeholder="Telefone"
                  placeholderTextColor="#6B7280"
                  value={formUsuario.fone || ""}
                  onChangeText={(valor) => setFormUsuario({ ...formUsuario, fone: valor })}
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </View>
              {!!errors.fone && <Text style={styles.errorText}>{errors.fone}</Text>}

              <View style={styles.inputWrap}>
                <MapPin size={18} color="#0EA5A8" />
                <TextInput
                  placeholder="Localização"
                  placeholderTextColor="#6B7280"
                  value={formUsuario.localizacao || ""}
                  onChangeText={(valor) => setFormUsuario({ ...formUsuario, localizacao: valor })}
                  style={styles.input}
                />
              </View>
              <TouchableOpacity style={styles.locationBtn} onPress={usarLocalizacaoAtual} disabled={localizando}>
                <Text style={styles.locationBtnText}>
                  {localizando ? "Obtendo localização..." : "Usar localização atual"}
                </Text>
              </TouchableOpacity>
              {!!errors.localizacao && <Text style={styles.errorText}>{errors.localizacao}</Text>}

              <TouchableOpacity style={styles.inputWrap} onPress={() => setDataPickerVisivel(true)} activeOpacity={0.85}>
                <Calendar size={18} color="#0EA5A8" />
                <Text style={styles.dateText}>
                  {formUsuario.dataNascimento
                    ? formUsuario.dataNascimento.toLocaleDateString("pt-BR")
                    : "Selecionar data de nascimento"}
                </Text>
              </TouchableOpacity>
              {!!errors.dataNascimento && <Text style={styles.errorText}>{errors.dataNascimento}</Text>}

              <DateTimePicker
                isVisible={dataPickerVisivel}
                mode="date"
                onConfirm={confirmarData}
                onCancel={() => setDataPickerVisivel(false)}
                maximumDate={new Date()}
              />

              <View style={styles.termosRow}>
                <TouchableOpacity
                  style={[styles.checkbox, aceitouTermos && styles.checkboxChecked]}
                  onPress={() => {
                    setAceitouTermos(!aceitouTermos);
                    if (errors.termos) setErrors({ ...errors, termos: "" });
                  }}
                >
                  {aceitouTermos ? <Text style={styles.checkboxMark}>✓</Text> : null}
                </TouchableOpacity>

                <Text style={styles.termosText}>
                  Eu li e aceito os{" "}
                  <Text style={styles.termosLink} onPress={() => setTermosVisivel(true)}>
                    Termos de uso
                  </Text>{" "}
                  e as{" "}
                  <Text style={styles.termosLink} onPress={() => setTermosVisivel(true)}>
                    especificações do app
                  </Text>
                  .
                </Text>
              </View>
              {!!errors.termos && <Text style={styles.errorText}>{errors.termos}</Text>}

              <TouchableOpacity style={styles.primaryBtnWrap} onPress={registrar} disabled={loading} activeOpacity={0.9}>
                <LinearGradient
                  colors={["#0EA5A8", "#0B7280"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryBtn}
                >
                  {loading ? <ActivityIndicator color="#EAFBFF" /> : <Text style={styles.primaryBtnText}>Registrar</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={() => navigation.replace("Login")} activeOpacity={0.8}>
                <Text style={styles.backButtonText}>Voltar ao Login</Text>
              </TouchableOpacity>
            </View>

            <Modal
              visible={termosVisivel}
              animationType="fade"
              transparent
              onRequestClose={() => setTermosVisivel(false)}
            >
              <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Termos de uso</Text>
                  <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.modalText}>
                      1. Ao criar a conta, você declara que as informações fornecidas são verdadeiras.
                      {"\n\n"}
                      2. O app conecta contratantes e prestadores. Não garantimos a execução do serviço.
                      {"\n\n"}
                      3. Conteúdos ofensivos, fraudulentos ou ilegais podem resultar em bloqueio da conta.
                    </Text>

                    <Text style={styles.modalTitle}>Especificações do app</Text>
                    <Text style={styles.modalText}>
                      1. O app utiliza seus dados de cadastro para criar seu perfil e facilitar contatos.
                      {"\n\n"}
                      2. As mensagens e solicitações podem ser registradas para fins de segurança.
                      {"\n\n"}
                      3. Atualizações do app podem alterar funcionalidades sem aviso prévio.
                    </Text>
                  </ScrollView>

                  <TouchableOpacity style={styles.modalButton} onPress={() => setTermosVisivel(false)} activeOpacity={0.85}>
                    <Text style={styles.modalButtonText}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </ScrollView>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#000",
  },

  bg: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
  },

  container: {
    flex: 1,
  },

  scroll: {
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 30,
  },

  header: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 18,
  },

  headerTitle: {
    flexDirection: "row",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  headerTitleAqua: {
    color: "#0EA5A8",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 1.2,
  },

  headerTitleWhite: {
    color: "#E5E7EB",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 1.2,
  },

  headerUnderline: {
    width: 44,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#0EA5A8",
    marginTop: 10,
    opacity: 0.9,
  },

  logoRow: {
    alignItems: "center",
    marginBottom: 18,
  },

  logo: {
    width: "100%",
    height: 200,
  },

  segmented: {
    flexDirection: "row",
    backgroundColor: "rgba(17, 24, 39, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 16,
  },

  segmentedActive: {
    flex: 1,
  },

  segmentedActiveBg: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  segmentedActiveText: {
    color: "#EAFBFF",
    fontWeight: "800",
    fontSize: 15,
  },

  segmentedInactive: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  segmentedInactiveText: {
    color: "#D1D5DB",
    fontWeight: "800",
    fontSize: 15,
  },

  card: {
    backgroundColor: "rgba(17, 24, 39, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 18,
    borderRadius: 26,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 12,
  },

  input: {
    flex: 1,
    color: "#E5E7EB",
    fontSize: 15,
    paddingVertical: 0,
  },

  dateText: {
    flex: 1,
    color: "#E5E7EB",
    fontSize: 15,
    fontWeight: "600",
  },

  eyeBtn: {
    padding: 6,
    marginRight: -6,
  },

  errorText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: -6,
    paddingLeft: 4,
  },

  locationBtn: {
    alignSelf: "flex-start",
    marginTop: -2,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(14,165,168,0.45)",
    backgroundColor: "rgba(14,165,168,0.12)",
  },

  locationBtnText: {
    color: "#67E8F9",
    fontSize: 12,
    fontWeight: "800",
  },

  termosRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
    marginBottom: 6,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: "rgba(14,165,168,0.85)",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
  },

  checkboxChecked: {
    backgroundColor: "#0EA5A8",
  },

  checkboxMark: {
    color: "#001518",
    fontWeight: "900",
  },

  termosText: {
    flex: 1,
    color: "rgba(229,231,235,0.86)",
    fontWeight: "600",
    lineHeight: 18,
  },

  termosLink: {
    color: "#0EA5A8",
    fontWeight: "900",
  },

  primaryBtnWrap: {
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 10,
  },

  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryBtnText: {
    color: "#EAFBFF",
    fontWeight: "900",
    fontSize: 16,
  },

  backButton: {
    alignItems: "center",
    marginTop: 16,
  },

  backButtonText: {
    color: "#0EA5A8",
    fontWeight: "800",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },

  modalCard: {
    backgroundColor: "rgba(17, 24, 39, 0.95)",
    borderRadius: 18,
    padding: 16,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
    color: "#E5E7EB",
  },

  modalContent: {
    marginBottom: 12,
  },

  modalText: {
    color: "rgba(229,231,235,0.85)",
    marginBottom: 12,
    lineHeight: 18,
  },

  modalButton: {
    backgroundColor: "#0EA5A8",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  modalButtonText: {
    color: "#001518",
    fontWeight: "900",
  },
});
