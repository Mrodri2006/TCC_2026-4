import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MailCheck, RefreshCw } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { auth, firestore } from "../firebase";
import { getFirebaseErrorMessage } from "../utils/firebaseError";

export default function VerificarEmail() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState<"check" | "resend" | "logout" | null>(null);

  const verificar = async () => {
    const user = auth.currentUser;
    if (!user) {
      navigation.replace("Login");
      return;
    }

    try {
      setLoading("check");
      await user.reload();
      const atualizado = auth.currentUser;
      if (!atualizado?.emailVerified) {
        Alert.alert("Ainda não confirmado", "Abra o link enviado ao seu e-mail e depois toque novamente neste botão.");
        return;
      }

      const snapshot = await firestore.collection("Usuario").doc(atualizado.uid).get();
      const tipo = String(snapshot.data()?.tipo || "").toLowerCase();
      navigation.replace(tipo === "prestador" ? "PagamentoMensalidade" : "Home");
    } catch (erro: unknown) {
      Alert.alert("Não foi possível verificar", getFirebaseErrorMessage(erro, "Tente novamente em alguns instantes."));
    } finally {
      setLoading(null);
    }
  };

  const reenviar = async () => {
    try {
      setLoading("resend");
      if (!auth.currentUser) throw new Error("Usuário desconectado");
      await auth.currentUser.sendEmailVerification();
      Alert.alert("E-mail enviado", "Confira também as pastas Spam e Lixo eletrônico.");
    } catch (erro: unknown) {
      Alert.alert("Não foi possível reenviar", getFirebaseErrorMessage(erro, "Aguarde um pouco e tente novamente."));
    } finally {
      setLoading(null);
    }
  };

  const sair = async () => {
    setLoading("logout");
    await auth.signOut();
    navigation.replace("Login");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <View style={styles.icon}><MailCheck size={42} color="#FF8700" /></View>
        <Text style={styles.title}>Confirme seu e-mail</Text>
        <Text style={styles.copy}>Enviamos um link para</Text>
        <Text style={styles.email}>{auth.currentUser?.email}</Text>
        <Text style={styles.copy}>Abra o link para comprovar que esse endereço de e-mail realmente pertence a você.</Text>

        <TouchableOpacity onPress={verificar} disabled={loading !== null} activeOpacity={0.9} style={styles.buttonWrap}>
          <LinearGradient colors={["#FFAA00", "#FF7200"]} style={styles.button}>
            {loading === "check" ? <ActivityIndicator color="#fff" /> : <><RefreshCw size={18} color="#fff" /><Text style={styles.buttonText}>Já confirmei meu e-mail</Text></>}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={reenviar} disabled={loading !== null} style={styles.linkButton}>
          {loading === "resend" ? <ActivityIndicator color="#FF8700" /> : <Text style={styles.link}>Reenviar link de confirmação</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={sair} disabled={loading !== null} style={styles.linkButton}>
          <Text style={styles.exit}>Usar outro e-mail</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F9FC", justifyContent: "center", padding: 24 },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 28, alignItems: "center", elevation: 3, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 14 },
  icon: { width: 76, height: 76, borderRadius: 38, backgroundColor: "#FFF3E6", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { color: "#111827", fontSize: 24, fontWeight: "800", marginBottom: 12, textAlign: "center" },
  copy: { color: "#6B7280", fontSize: 15, lineHeight: 22, textAlign: "center" },
  email: { color: "#111827", fontSize: 16, fontWeight: "700", marginVertical: 8, textAlign: "center" },
  buttonWrap: { width: "100%", marginTop: 26, borderRadius: 14, overflow: "hidden" },
  button: { minHeight: 52, paddingHorizontal: 18, flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  linkButton: { padding: 10, marginTop: 8 },
  link: { color: "#E66F00", fontSize: 14, fontWeight: "700", textAlign: "center" },
  exit: { color: "#6B7280", fontSize: 14, fontWeight: "600" },
});
