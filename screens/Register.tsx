
import { useMemo, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from "expo-linear-gradient";
import { Briefcase, Calendar, Eye, EyeOff, Lock, Mail, MapPin, Phone, User } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, firestore } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { Usuario } from '../model/Usuario';
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from 'react-native-modal-datetime-picker';

export default function Register() {

  const [formUsuario, setFormUsuario] = useState<Partial<Usuario>>({});
  const [profissao, setProfissao] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataPickerVisivel, setDataPickerVisivel] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [termosVisivel, setTermosVisivel] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfCarregando, setPdfCarregando] = useState(false);
  const [pdfErro, setPdfErro] = useState(false);

  useEffect(() => {
    const carregarPdf = async () => {
      try {
        setPdfCarregando(true);
        const asset = Asset.fromModule(require('../assets/termos_prestador_app.pdf'));
        await asset.downloadAsync();
        const sourceUri = asset.localUri || asset.uri;
        const cacheUri = `${FileSystem.cacheDirectory}termos_prestador_app.pdf`;
        const info = await FileSystem.getInfoAsync(cacheUri);
        if (!info.exists) {
          await FileSystem.copyAsync({ from: sourceUri, to: cacheUri });
        }
        setPdfUri(cacheUri);
        setPdfErro(false);
      } catch {
        setPdfUri(null);
        setPdfErro(true);
      } finally {
        setPdfCarregando(false);
      }
    };
    carregarPdf();
  }, []);

  const abrirPdfExterno = async () => {
    try {
      setPdfCarregando(true);
      let uri = pdfUri;
      if (!uri) {
        const asset = Asset.fromModule(require('../assets/termos_prestador_app.pdf'));
        await asset.downloadAsync();
        const sourceUri = asset.localUri || asset.uri;
        const cacheUri = `${FileSystem.cacheDirectory}termos_prestador_app.pdf`;
        const info = await FileSystem.getInfoAsync(cacheUri);
        if (!info.exists) {
          await FileSystem.copyAsync({ from: sourceUri, to: cacheUri });
        }
        uri = cacheUri;
        setPdfUri(uri);
      }
      if (uri) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf',
          });
        } else {
          await Linking.openURL(uri);
        }
        setPdfErro(false);
      } else {
        setPdfErro(true);
      }
    } catch {
      setPdfErro(true);
    } finally {
      setPdfCarregando(false);
    }
  };

  const tiposProfissao = [
    { id: 1, nome: 'Eletricista' },
    { id: 2, nome: 'Diarista' },
    { id: 3, nome: 'Encanador' },
    { id: 4, nome: 'Montagem de Móveis' },
    { id: 5, nome: 'Jardinagem' },
  ];

  const navigation = useNavigation<any>();

  const headerTitle = useMemo(() => {
    return (
      <>
        <Text style={styles.headerTitleAqua}>CADASTRO</Text>
        <Text style={styles.headerTitleWhite}> PRESTADOR</Text>
      </>
    );
  }, []);

  const calcularIdade = (data: Date) => {
    const hoje = new Date();
    let idade = hoje.getFullYear() - data.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNasc = data.getMonth();
    if (mesAtual < mesNasc || (mesAtual === mesNasc && hoje.getDate() < data.getDate())) idade--;
    return idade;
  };

  const registrar = async () => {

    if (!formUsuario.email || !formUsuario.senha || !profissao || !formUsuario.dataNascimento || !formUsuario.localizacao) {
      alert("Preencha todos os campos!");
      return;
    }
    if (!aceitouTermos) {
      alert("Aceite os termos e as especificacoes do app para continuar.");
      return;
    }
    if (calcularIdade(formUsuario.dataNascimento) < 18) {
      alert("Você deve ter no mínino 18 anos de idade para se cadstrar!");
      return;
    }

    setLoading(true);

    try {

      await auth.createUserWithEmailAndPassword(
        formUsuario.email,
        formUsuario.senha
      );

      await firestore
        .collection('Usuario')
        .doc(auth.currentUser!.uid)
        .set({
          id: auth.currentUser!.uid,
          nome: formUsuario.nome,
          email: formUsuario.email,
          fone: formUsuario.fone,
          localizacao: formUsuario.localizacao,
          dataNascimento: formUsuario.dataNascimento?.toISOString() || null,
          tipo: 'prestador',
          admin: false,
          profissao: profissao,
          criadoEm: new Date(),
        });

      navigation.replace('MenuTrabalhador');

    } catch (erro: any) {
      alert(erro.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmarData = (data: Date) => {
    setFormUsuario({ ...formUsuario, dataNascimento: data });
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
              <TouchableOpacity
                style={styles.segmentedInactive}
                activeOpacity={0.85}
                onPress={() => navigation.replace("Register2")}
              >
                <User size={18} color="#9CA3AF" />
                <Text style={styles.segmentedInactiveText}>Contratante</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.segmentedActive} activeOpacity={0.85}>
                <LinearGradient
                  colors={["#0EA5A8", "#0B7280"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.segmentedActiveBg}
                >
                  <Briefcase size={18} color="#EAFBFF" />
                  <Text style={styles.segmentedActiveText}>Prestador</Text>
                </LinearGradient>
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

              <TouchableOpacity style={styles.inputWrap} onPress={() => setDataPickerVisivel(true)} activeOpacity={0.85}>
                <Calendar size={18} color="#0EA5A8" />
                <Text style={styles.dateText}>
                  {formUsuario.dataNascimento
                    ? formUsuario.dataNascimento.toLocaleDateString("pt-BR")
                    : "Selecionar data de nascimento"}
                </Text>
              </TouchableOpacity>

              <DateTimePicker
                isVisible={dataPickerVisivel}
                mode="date"
                onConfirm={confirmarData}
                onCancel={() => setDataPickerVisivel(false)}
                maximumDate={new Date()}
              />

              <Text style={styles.profissaoLabel}>Selecione sua profissão:</Text>

              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={profissao}
                  onValueChange={(itemValue) => setProfissao(itemValue)}
                  style={styles.picker}
                  dropdownIconColor="#9CA3AF"
                >
                  <Picker.Item label="Selecione uma profissão" value="" color="#9CA3AF" />
                  {tiposProfissao.map((prof) => (
                    <Picker.Item key={prof.id} label={prof.nome} value={prof.nome} />
                  ))}
                </Picker>
              </View>

              <View style={styles.termosRow}>
                <TouchableOpacity
                  style={[styles.checkbox, aceitouTermos && styles.checkboxChecked]}
                  onPress={() => setAceitouTermos(!aceitouTermos)}
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
                  <Text style={styles.modalTitle}>Termos de uso (Prestador)</Text>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalText}>Para ver o PDF completo, abra no visualizador externo.</Text>
                    {!!pdfErro && (
                      <Text style={styles.modalText}>
                        Não foi possível abrir o PDF. Verifique o arquivo em assets.
                      </Text>
                    )}
                    <TouchableOpacity style={styles.openPdfButton} onPress={abrirPdfExterno} disabled={pdfCarregando} activeOpacity={0.85}>
                      {pdfCarregando ? <ActivityIndicator color="#001518" /> : <Text style={styles.openPdfButtonText}>Abrir PDF</Text>}
                    </TouchableOpacity>
                  </View>

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

  profissaoLabel: {
    marginTop: 6,
    marginBottom: 8,
    fontWeight: "800",
    color: "rgba(229,231,235,0.85)",
  },

  pickerWrap: {
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
    marginBottom: 12,
  },

  picker: {
    color: "#E5E7EB",
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

  openPdfButton: {
    marginTop: 8,
    backgroundColor: "#0EA5A8",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  openPdfButtonText: {
    color: "#001518",
    fontWeight: "900",
  },

});
