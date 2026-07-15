import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft, FileCheck2, FileUp, ShieldCheck } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { auth, firestore } from "../firebase";
import { uploadFileUri } from "../utils/storageUpload";
import { useTheme } from "../theme/ThemeContext";
import { ProviderTrustCard } from "../components/ProviderTrustBadge";

const documentTypes = [
  { key: "identidade", label: "Documento com foto", hint: "RG, CNH ou documento oficial." },
  { key: "cpf_cnpj", label: "CPF ou CNPJ", hint: "Comprovante cadastral ou documento equivalente." },
  { key: "endereco", label: "Comprovante de endereço", hint: "Conta recente com cidade e bairro." },
  { key: "certificado", label: "Certificado profissional", hint: "Curso, certificado ou registro da área." },
];

const safeName = (name: string) => String(name || "documento").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);

export default function VerificacaoPrestador() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [userData, setUserData] = useState<any>({});
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState("");

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsubUser = firestore.collection("Usuario").doc(uid).onSnapshot((snapshot) => setUserData(snapshot.data() || {}));
    const unsubDocs = firestore.collection("Usuario").doc(uid).collection("DocumentosVerificacao")
      .orderBy("criadoEm", "desc")
      .onSnapshot((snapshot) => setDocuments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))), () => undefined);
    return () => {
      unsubUser();
      unsubDocs();
    };
  }, []);

  const enviarDocumento = async (tipo: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert("Verificação", "Usuário não autenticado.");
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setUploading(tipo);
      const contentType = asset.mimeType || (asset.name?.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
      const storagePath = `verificacao/${uid}/${Date.now()}_${safeName(asset.name || tipo)}`;
      const { url } = await uploadFileUri(asset.uri, storagePath, contentType, 10 * 1024 * 1024);
      const now = new Date();
      await firestore.collection("Usuario").doc(uid).collection("DocumentosVerificacao").add({
        tipo,
        nomeArquivo: asset.name || tipo,
        contentType,
        tamanho: asset.size || null,
        storagePath,
        url,
        status: "enviado",
        criadoEm: now,
      });
      await firestore.collection("Usuario").doc(uid).set({
        verificacaoStatus: "pendente",
        verificacaoSolicitadaEm: now,
      }, { merge: true });
      Alert.alert("Documento enviado", "O administrador poderá revisar sua verificação.");
    } catch (error: any) {
      Alert.alert("Verificação", error?.message || "Não foi possível enviar o documento.");
    } finally {
      setUploading("");
    }
  };

  const countByType = (tipo: string) => documents.filter((doc) => doc.tipo === tipo).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.headerBtnBg }]} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Verificação</Text>
          <View style={{ width: 44 }} />
        </View>

        <ProviderTrustCard provider={userData} style={styles.trustCard} />

        <View style={[styles.notice, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ShieldCheck size={22} color="#047857" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.noticeTitle, { color: theme.textPrimary }]}>Envie documentos legíveis</Text>
            <Text style={[styles.noticeText, { color: theme.textMuted }]}>
              O selo só deve ser aprovado pelo ADM após conferir identidade, contato, cidade e atuação profissional.
            </Text>
          </View>
        </View>

        {documentTypes.map((item) => {
          const sent = countByType(item.key);
          const busy = uploading === item.key;
          return (
            <View key={item.key} style={[styles.docCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.docHeader}>
                <View style={[styles.docIcon, { backgroundColor: sent ? "#ECFDF5" : "#FFF7ED" }]}>
                  <FileCheck2 size={20} color={sent ? "#047857" : "#E86F00"} />
                </View>
                <View style={styles.docCopy}>
                  <Text style={[styles.docTitle, { color: theme.textPrimary }]}>{item.label}</Text>
                  <Text style={[styles.docHint, { color: theme.textMuted }]}>{sent ? `${sent} arquivo(s) enviado(s)` : item.hint}</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.uploadButton, busy && styles.disabled]} onPress={() => enviarDocumento(item.key)} disabled={busy}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <FileUp size={18} color="#FFFFFF" />}
                <Text style={styles.uploadText}>{busy ? "Enviando..." : sent ? "Enviar outro" : "Enviar arquivo"}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  iconButton: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "900" },
  trustCard: { marginHorizontal: 0 },
  notice: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: "row", gap: 12, marginBottom: 12 },
  noticeTitle: { fontSize: 14, fontWeight: "900" },
  noticeText: { fontSize: 12, lineHeight: 17, marginTop: 4, fontWeight: "600" },
  docCard: { borderWidth: 1, borderRadius: 18, padding: 15, marginBottom: 12 },
  docHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  docIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  docCopy: { flex: 1 },
  docTitle: { fontSize: 15, fontWeight: "900" },
  docHint: { marginTop: 3, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  uploadButton: { minHeight: 46, marginTop: 14, borderRadius: 14, backgroundColor: "#FF8700", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  uploadText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.6 },
});
