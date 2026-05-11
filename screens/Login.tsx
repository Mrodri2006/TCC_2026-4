import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, firestore } from '../firebase';
import { useNavigation } from '@react-navigation/native';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', senha: '' });

  const navigation = useNavigation<any>();

  const headerTitle = useMemo(() => {
    return (
      <>
        <Text style={styles.headerTitleAqua}>TELA DE</Text>
        <Text style={styles.headerTitleWhite}> LOGIN</Text>
      </>
    );
  }, []);

  const validarEmail = (email: string) => {
    const valida = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return valida.test(email);
  };

  const validarFormulario = () => {
    let novoErros = { email: '', senha: '' };
    let valido = true;

    if (!email.trim()) {
      novoErros.email = 'E-mail é obrigatório';
      valido = false;
    } else if (!validarEmail(email)) {
      novoErros.email = 'E-mail inválido';
      valido = false;
    }

    if (!senha.trim()) {
      novoErros.senha = 'Senha é obrigatória';
      valido = false;
    } else if (senha.length < 6) {
      novoErros.senha = 'Senha deve ter no mínimo 6 caracteres';
      valido = false;
    }

    setErrors(novoErros);
    return valido;
  };

  const logar = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      const userCredentials = await auth.signInWithEmailAndPassword(email, senha);
      console.log('Logado como: ' + userCredentials.user?.email);
      const uid = userCredentials.user?.uid;
      if (uid) {
        const userDoc = await firestore.collection('Usuario').doc(uid).get();
        const userData = userDoc.exists ? userDoc.data() : null;
        const ehAdmin = userData?.admin === true || userData?.tipo === 'admin';
        if (ehAdmin) {
          navigation.replace('Adm');
          return;
        }

        const tipo = String(userData?.tipo || '').toLowerCase();
        if (tipo === 'prestador') {
          navigation.replace('MenuTrabalhador');
          return;
        }

        navigation.replace('Home');
      } else {
        navigation.replace('Menu');
      }
    } catch (erro: any) {
      alert(erro.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>

        <LinearGradient colors={["rgba(0,0,0,0.75)", "rgba(0,0,0,0.9)"]} style={styles.overlay} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.container}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <View style={styles.headerUnderline} />
          </View>

          <View style={styles.logoRow}>
            <Image source={require("../assets/logo8.png")} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={styles.card}>
            <View style={styles.inputWrap}>
              <Mail size={18} color="#0EA5A8" />
              <TextInput
                placeholder="E-mail"
                placeholderTextColor="#6B7280"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>
            {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

            <View style={styles.inputWrap}>
              <Lock size={18} color="#0EA5A8" />
              <TextInput
                placeholder="Senha"
                placeholderTextColor="#6B7280"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!mostrarSenha}
                style={styles.input}
              />
              <TouchableOpacity
                onPress={() => setMostrarSenha((v) => !v)}
                activeOpacity={0.8}
                style={styles.eyeBtn}
              >
                {mostrarSenha ? (
                  <EyeOff size={18} color="#9CA3AF" />
                ) : (
                  <Eye size={18} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            </View>
            {errors.senha ? <Text style={styles.error}>{errors.senha}</Text> : null}

            <TouchableOpacity style={styles.loginBtnWrap} onPress={logar} disabled={loading} activeOpacity={0.9}>
              <LinearGradient
                colors={["#0EA5A8", "#0B7280"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loginBtn}
              >
                {loading ? <ActivityIndicator color="#EAFBFF" /> : <Text style={styles.loginBtnText}>Entrar</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Não tem login? </Text>
              <TouchableOpacity onPress={() => navigation.replace("Register2")} activeOpacity={0.8}>
                <Text style={styles.link}>Contratante</Text>
              </TouchableOpacity>
              <Text style={styles.registerText}> ou </Text>
              <TouchableOpacity onPress={() => navigation.replace("Register")} activeOpacity={0.8}>
                <Text style={styles.link}>Prestador</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity activeOpacity={0.8}>
              <Text style={styles.forgot}>Esqueceu a senha?</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 26,
    paddingTop: 18,
  },

  header: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 24,
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
    marginBottom: 22,
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
    marginBottom: 18,
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

  eyeBtn: {
    padding: 6,
    marginRight: -6,
  },

  error: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: -6,
    paddingLeft: 4,
  },

  loginBtnWrap: {
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 6,
  },

  loginBtn: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  loginBtnText: {
    color: "#EAFBFF",
    fontWeight: "900",
    fontSize: 16,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    marginBottom: 10,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  dividerText: {
    color: "rgba(229, 231, 235, 0.55)",
    fontWeight: "800",
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  registerText: {
    color: "rgba(229,231,235,0.85)",
    fontWeight: "600",
  },

  link: {
    color: "#0EA5A8",
    fontWeight: "900",
  },

  forgot: {
    textAlign: "center",
    marginTop: 14,
    color: "#0EA5A8",
    fontWeight: "700",
  },
});

