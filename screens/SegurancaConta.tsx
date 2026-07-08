import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft, ChevronRight, KeyRound, LogOut, MailCheck, ShieldCheck } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { auth, functions } from "../firebase";
import { useTheme } from "../theme/ThemeContext";
export default function SegurancaConta() {
  const navigation = useNavigation<any>(); const { isDark, theme } = useTheme(); const [loading, setLoading] = useState(""); const user = auth.currentUser;
  const run = async (key: string, action: () => Promise<unknown>, message: string) => { try { setLoading(key); await action(); Alert.alert("Segurança", message); } catch (error: any) { Alert.alert("Erro", error?.message || "A operação não foi concluída."); } finally { setLoading(""); } };
  const topBarIconColor = isDark ? "#FF8700" : "#0F2937";
  const topBarBtnBg = isDark ? theme.headerBtnBg : "rgba(15, 41, 55, 0.06)";
  const cardBackground = isDark ? theme.surface : "#FFFFFF";
  const cardBorderColor = isDark ? theme.surfaceBorder : "transparent";
  const actionBackground = isDark ? theme.actionBg : "#F8FAFC";
  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.topBarBtn, { backgroundColor: topBarBtnBg }]} activeOpacity={0.7}><ArrowLeft size={20} color={topBarIconColor} /></TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: topBarIconColor }]}>Segurança da conta</Text>
        <View style={styles.topBarBtn} />
      </View>
      <View style={[styles.formContainer, { backgroundColor: cardBackground, borderColor: cardBorderColor, borderWidth: isDark ? 1 : 0 }]}>
        <View style={[styles.hero, { backgroundColor: actionBackground, borderColor: theme.border }]}><View style={styles.heroIcon}><ShieldCheck size={32} color="#FF8700" /></View><Text style={[styles.heroTitle, { color: theme.surfaceTextPrimary }]}>{user?.emailVerified ? "E-mail verificado" : "Verificação pendente"}</Text><Text style={[styles.copy, { color: theme.textMuted }]}>{user?.email}</Text></View>
        <Text style={[styles.sectionLabel, { color: theme.surfaceTextPrimary }]}>Ações de segurança</Text>
        <Action icon={<MailCheck color="#FF8700" />} title="Verificar e-mail" subtitle="Envia um novo link de confirmação" theme={theme} background={actionBackground} loading={loading === "email"} onPress={() => run("email", () => user!.sendEmailVerification(), "Link de verificação enviado.")} />
        <Action icon={<KeyRound color="#F59E0B" />} title="Alterar senha" subtitle="Envia um link seguro para seu e-mail" theme={theme} background={actionBackground} loading={loading === "password"} onPress={() => run("password", () => auth.sendPasswordResetEmail(user!.email!), "Link para alterar a senha enviado.")} />
        <Action icon={<LogOut color="#DC2626" />} title="Encerrar outras sessões" subtitle="Revoga os acessos existentes em outros dispositivos" theme={theme} background={actionBackground} loading={loading === "sessions"} onPress={() => run("sessions", () => functions.httpsCallable("revokeMySessions")({}), "Sessões revogadas. Entre novamente nos seus dispositivos.")} />
        <View style={[styles.note, { backgroundColor: actionBackground, borderColor: theme.border }]}><Text style={[styles.noteTitle, { color: theme.surfaceTextPrimary }]}>Autenticação em duas etapas</Text><Text style={[styles.copy, { color: theme.textMuted }]}>A ativação por SMS depende do Firebase Identity Platform e de um provedor de telefone configurado.</Text></View>
        <TouchableOpacity style={[styles.cancelButton, { backgroundColor: cardBackground, borderColor: theme.border }]} onPress={() => navigation.goBack()}><Text style={[styles.cancelText, { color: theme.textSecondary }]}>Voltar</Text></TouchableOpacity>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
function Action({ icon, title, subtitle, theme, background, loading, onPress }: any) { return <TouchableOpacity style={[styles.action, { backgroundColor: background, borderColor: theme.border }, loading && styles.disabled]} onPress={onPress} disabled={loading} activeOpacity={0.75}><View style={styles.actionIcon}>{icon}</View><View style={{ flex: 1 }}><Text style={[styles.actionTitle, { color: theme.surfaceTextPrimary }]}>{title}</Text><Text style={[styles.copy, { color: theme.textMuted }]}>{subtitle}</Text></View>{loading ? <ActivityIndicator color="#FF8700" /> : <ChevronRight size={19} color={theme.textMuted} />}</TouchableOpacity>; }
const styles = StyleSheet.create({
  safe: { flex: 1 }, container: { flex: 1 }, content: { paddingTop: 12, paddingHorizontal: 16, paddingBottom: 40 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, marginBottom: 6 },
  topBarBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  topBarTitle: { fontSize: 18, fontWeight: "800" },
  formContainer: { borderRadius: 20, padding: 18, shadowColor: "#0F2937", shadowOpacity: 0.04, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  hero: { alignItems: "center", borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 22 }, heroIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: "rgba(255,135,0,0.12)", alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 17, fontWeight: "800", marginTop: 10 }, copy: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  sectionLabel: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  action: { flexDirection: "row", gap: 12, alignItems: "center", borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12 }, actionIcon: { width: 34, alignItems: "center" }, actionTitle: { fontSize: 14, fontWeight: "700" }, disabled: { opacity: 0.6 },
  note: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 8, marginBottom: 18 }, noteTitle: { fontSize: 14, fontWeight: "700" },
  cancelButton: { paddingVertical: 14, borderRadius: 16, alignItems: "center", borderWidth: 1 }, cancelText: { fontWeight: "700", fontSize: 14 },
});
