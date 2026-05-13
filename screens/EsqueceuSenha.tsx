import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Mail } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../firebase";
import { useNavigation } from "@react-navigation/native";

export default function EsqueceuSenha() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [erroEmail, setErroEmail] = useState("");

  const validarEmail = (valor: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);

  const enviarRecuperacao = async () => {
    const emailLimpo = email.trim().toLowerCase();

    if (!emailLimpo) {
      setErroEmail("Informe seu e-mail para recuperar a senha");
      return;
    }

    if (!validarEmail(emailLimpo)) {
      setErroEmail("E-mail inválido");
      return;
    }

    try {
      setLoading(true);
      setErroEmail("");
      try {
        await auth.sendPasswordResetEmail(emailLimpo, {
          url: "https://info-650fe.firebaseapp.com/__/auth/action",
          handleCodeInApp: false,
        });
      } catch (erroComUrl: any) {
        const codigosDeConfig = [
          "auth/invalid-continue-uri",
          "auth/unauthorized-continue-uri",
          "auth/missing-continue-uri",
          "auth/argument-error",
        ];

        if (codigosDeConfig.includes(erroComUrl?.code)) {
          await auth.sendPasswordResetEmail(emailLimpo);
        } else {
          throw erroComUrl;
        }
      }
      Alert.alert(
        "E-mail enviado",
        "Enviamos o link de redefinição. Verifique sua caixa de entrada e spam.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (erro: any) {
      if (erro?.code === "auth/user-not-found") {
        Alert.alert("Conta não encontrada", "Não existe conta cadastrada com esse e-mail.");
      } else if (erro?.code === "auth/invalid-email") {
        setErroEmail("E-mail inválido");
      } else if (erro?.code === "auth/too-many-requests") {
        Alert.alert("Muitas tentativas", "Aguarde alguns minutos e tente novamente.");
      } else if (erro?.code === "auth/network-request-failed") {
        Alert.alert("Sem conexão", "Verifique sua internet e tente novamente.");
      } else {
        Alert.alert(
          "Erro ao recuperar senha",
          `Não foi possível enviar o e-mail agora.\n\nCódigo: ${erro?.code || "desconhecido"}`
        );
      }
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={18} color="#D1D5DB" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.title}>Recuperar senha</Text>
          <Text style={styles.subtitle}>Digite seu e-mail para enviar o link de recuperação.</Text>

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
          {erroEmail ? <Text style={styles.error}>{erroEmail}</Text> : null}

          <TouchableOpacity
            style={styles.actionButtonWrap}
            onPress={enviarRecuperacao}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient colors={["#0EA5A8", "#0B7280"]} style={styles.actionButton}>
              {loading ? (
                <ActivityIndicator color="#EAFBFF" />
              ) : (
                <Text style={styles.actionButtonText}>Enviar link</Text>
              )}
            </LinearGradient>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  backText: {
    color: "#D1D5DB",
    fontSize: 14,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
  },
  title: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    marginBottom: 16,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: "#0F172A",
    fontSize: 15,
  },
  error: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 6,
  },
  actionButtonWrap: {
    marginTop: 20,
    borderRadius: 14,
    overflow: "hidden",
  },
  actionButton: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});
