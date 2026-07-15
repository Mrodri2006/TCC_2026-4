import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ArrowLeft, HelpCircle, LifeBuoy, Send } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";

const faq = [
  ["Como funciona o orçamento?", "O cliente envia a solicitação, o prestador responde com proposta de valor e prazo, e o cliente confirma antes do serviço."],
  ["Quando posso cancelar?", "O cancelamento deve ser feito antes do atendimento começar. Cancelamentos recorrentes podem ser analisados pelo suporte."],
  ["O que significa prestador verificado?", "Significa que o administrador revisou documentos e dados básicos do perfil antes de liberar o selo."],
  ["Como reportar problema?", "Abra o serviço em andamento, toque em Relatar problema e descreva o ocorrido para análise."],
];

export default function AjudaSuporte() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [mensagem, setMensagem] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    return firestore.collection("SolicitacoesSuporte")
      .where("userId", "==", uid)
      .orderBy("criadoEm", "desc")
      .limit(10)
      .onSnapshot((snapshot) => setTickets(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))), () => undefined);
  }, []);

  const enviarChamado = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert("Suporte", "Usuário não autenticado.");
      return;
    }
    if (!mensagem.trim()) {
      Alert.alert("Suporte", "Descreva sua dúvida ou problema.");
      return;
    }
    try {
      setEnviando(true);
      await firestore.collection("SolicitacoesSuporte").add({
        userId: uid,
        email: auth.currentUser?.email || "",
        mensagem: mensagem.trim().slice(0, 1200),
        status: "aberto",
        criadoEm: new Date(),
      });
      setMensagem("");
      Alert.alert("Suporte", "Chamado enviado para análise.");
    } catch {
      Alert.alert("Suporte", "Não foi possível enviar o chamado.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.headerBtnBg }]} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Ajuda e suporte</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={[styles.hero, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <LifeBuoy size={28} color="#FF8700" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>Central de atendimento</Text>
            <Text style={[styles.heroText, { color: theme.textMuted }]}>Dúvidas, cancelamentos, verificação e problemas em serviços.</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Perguntas frequentes</Text>
        {faq.map(([question, answer]) => (
          <View key={question} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.faqTitleRow}>
              <HelpCircle size={18} color="#FF8700" />
              <Text style={[styles.question, { color: theme.textPrimary }]}>{question}</Text>
            </View>
            <Text style={[styles.answer, { color: theme.textMuted }]}>{answer}</Text>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Abrir chamado</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TextInput
            style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background }]}
            placeholder="Descreva sua dúvida ou problema..."
            placeholderTextColor={theme.textMuted}
            value={mensagem}
            onChangeText={setMensagem}
            multiline
          />
          <TouchableOpacity style={[styles.submitButton, enviando && styles.disabled]} onPress={enviarChamado} disabled={enviando}>
            {enviando ? <ActivityIndicator color="#FFFFFF" /> : <Send size={18} color="#FFFFFF" />}
            <Text style={styles.submitText}>{enviando ? "Enviando..." : "Enviar chamado"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Histórico</Text>
        {tickets.length > 0 ? tickets.map((ticket) => (
          <View key={ticket.id} style={[styles.ticket, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.ticketStatus, { color: ticket.status === "resolvido" ? "#047857" : "#E86F00" }]}>{ticket.status || "aberto"}</Text>
            <Text style={[styles.ticketText, { color: theme.textPrimary }]} numberOfLines={3}>{ticket.mensagem}</Text>
            {!!ticket.respostaAdmin && <Text style={[styles.answer, { color: theme.textMuted }]}>Resposta: {ticket.respostaAdmin}</Text>}
          </View>
        )) : (
          <Text style={[styles.empty, { color: theme.textMuted }]}>Nenhum chamado aberto.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  iconButton: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "900" },
  hero: { borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: "row", gap: 12, marginBottom: 18 },
  heroTitle: { fontSize: 16, fontWeight: "900" },
  heroText: { fontSize: 13, lineHeight: 18, marginTop: 4, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "900", marginTop: 8, marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 18, padding: 15, marginBottom: 10 },
  faqTitleRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  question: { flex: 1, fontSize: 14, fontWeight: "900" },
  answer: { marginTop: 8, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  input: { minHeight: 120, borderWidth: 1, borderRadius: 14, padding: 12, textAlignVertical: "top" },
  submitButton: { minHeight: 48, marginTop: 12, borderRadius: 14, backgroundColor: "#FF8700", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitText: { color: "#FFFFFF", fontWeight: "900" },
  ticket: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  ticketStatus: { fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  ticketText: { marginTop: 6, fontSize: 13, lineHeight: 19, fontWeight: "700" },
  empty: { textAlign: "center", paddingVertical: 20, fontWeight: "700" },
  disabled: { opacity: 0.6 },
});
