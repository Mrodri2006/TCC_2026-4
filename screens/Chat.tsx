import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Ban, File, MapPin, MessageCircle, Mic, Paperclip, Play, Search, Send, ShieldCheck, Square, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, firestore } from "../firebase";
import firebase from "firebase/compat/app";
import { useTheme } from "../theme/ThemeContext";
import { deleteChatMessage, editChatMessage, markChatRead, reactToChatMessage, sendChatMessage } from "../services/chatService";
import * as DocumentPicker from "expo-document-picker";
import * as Location from "expo-location";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { uploadFileUri } from "../utils/storageUpload";

type Message = {
  id: string;
  text: string;
  senderId: string;
  createdAt?: any;
  editedAt?: any;
  deletedAt?: any;
  readBy?: string[];
  replyTo?: { id: string; text: string; senderId: string };
  reactions?: Record<string, string>;
  attachment?: { url: string; name: string; mimeType: string; size?: number };
  location?: { latitude: number; longitude: number };
};

function AudioAttachment({ url }: { url: string }) { const player = useAudioPlayer(url); return <TouchableOpacity style={styles.attachmentButton} onPress={() => player.play()}><Play size={16} color="#FF8700" /><Text style={styles.attachmentText}>Reproduzir áudio</Text></TouchableOpacity>; }

export default function Chat() {
  const navigation = useNavigation<any>();
  const route = useRoute() as any;
  const { otherUserId, otherUserName } = route.params || {};
  const { isDark, theme } = useTheme();

  const [mensagens, setMensagens] = useState<Message[]>([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [bloqueado, setBloqueado] = useState(false);
  const [editing, setEditing] = useState<Message | null>(null);
  const [replying, setReplying] = useState<Message | null>(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [otherPresence, setOtherPresence] = useState<{ online?: boolean; typing?: boolean }>({});
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const listRef = useRef<FlatList<Message>>(null);

  const chatId = useMemo(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !otherUserId) return null;
    return [uid, otherUserId].sort().join("_");
  }, [otherUserId]);

  useEffect(() => {
    if (!chatId) {
      setCarregando(false);
      setErro("Não foi possível identificar esta conversa.");
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid || !otherUserId) return;

    let unsubscribe: undefined | (() => void);
    let active = true;
    setCarregando(true);
    setErro("");

    const prepararChat = async () => {
      try {
        const chatRef = firestore.collection("Chats").doc(chatId);

        await chatRef.set(
          {
            participants: [uid, otherUserId].sort(),
          },
          { merge: true }
        );

        if (!active) return;

        unsubscribe = chatRef
          .collection("Messages")
          .orderBy("createdAt", "asc")
          .onSnapshot(
            (snapshot) => {
              const lista: Message[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as any),
              }));
              setMensagens(lista);
              markChatRead(chatId).catch((): void => undefined);
              chatRef.set({
                unreadFor: firebase.firestore.FieldValue.arrayRemove(uid),
              }, { merge: true }).catch((): void => undefined);
              setCarregando(false);
              setErro("");
            },
            (erro) => {
              console.error("Erro ao carregar mensagens:", erro);
              if (!active) return;
              setCarregando(false);
              setErro("Não foi possível carregar as mensagens.");
            }
          );
      } catch (erro) {
        console.error("Erro ao preparar chat:", erro);
        if (!active) return;
        setCarregando(false);
        setErro("Não foi possível abrir a conversa.");
      }
    };

    prepararChat();

    return () => {
      active = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [chatId, otherUserId, tentativa]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !otherUserId) return;
    return firestore.collection("Usuario").doc(uid).collection("Bloqueados").doc(otherUserId)
      .onSnapshot((snapshot) => setBloqueado(snapshot.exists), () => undefined);
  }, [otherUserId]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!chatId || !uid || !otherUserId) return;
    const ref = firestore.collection("Chats").doc(chatId).collection("Presence");
    ref.doc(uid).set({ online: true, typing: false, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch((): void => undefined);
    const unsubscribe = ref.doc(otherUserId).onSnapshot((snapshot) => setOtherPresence(snapshot.data() || {}), () => undefined);
    return () => { unsubscribe(); ref.doc(uid).set({ online: false, typing: false, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch((): void => undefined); };
  }, [chatId, otherUserId]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!chatId || !uid) return;
    const ref = firestore.collection("Chats").doc(chatId).collection("Presence").doc(uid);
    ref.set({ typing: !!texto.trim(), online: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch((): void => undefined);
    const timer = setTimeout(() => ref.set({ typing: false }, { merge: true }).catch((): void => undefined), 1800);
    return () => clearTimeout(timer);
  }, [texto, chatId]);

  const bloquearUsuario = () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !otherUserId) return;
    Alert.alert(bloqueado ? "Desbloquear usuário?" : "Bloquear usuário?", bloqueado ? "Vocês poderão trocar mensagens novamente." : "Você não poderá enviar mensagens para esta pessoa.", [
      { text: "Cancelar", style: "cancel" },
      { text: bloqueado ? "Desbloquear" : "Bloquear", style: bloqueado ? "default" : "destructive", onPress: async () => {
        const ref = firestore.collection("Usuario").doc(uid).collection("Bloqueados").doc(otherUserId);
        if (bloqueado) await ref.delete(); else await ref.set({ blockedUserId: otherUserId, criadoEm: firebase.firestore.FieldValue.serverTimestamp() });
      } },
    ]);
  };

  const denunciarUsuario = () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !otherUserId) return;
    navigation.navigate("Denunciar", { targetId: otherUserId, chatId });
  };

  const abrirOpcoesDeProtecao = () => Alert.alert("Bloqueio e denúncia", undefined, [
    { text: bloqueado ? "Desbloquear usuário" : "Bloquear usuário", onPress: bloquearUsuario },
    { text: "Denunciar usuário", onPress: denunciarUsuario },
    { text: "Voltar", style: "cancel", onPress: abrirSeguranca },
  ]);

  const abrirSeguranca = () => Alert.alert("Segurança da conversa", undefined, [
    { text: "Pesquisar na conversa", onPress: () => setShowSearch(true) },
    { text: "Bloqueio e denúncia", onPress: abrirOpcoesDeProtecao },
    { text: "Voltar", style: "cancel" },
  ]);

  const sendRichMessage = async (preview: string, extra: Record<string, unknown>) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !otherUserId || !chatId || bloqueado) return;
    await sendChatMessage({ chatId, recipientId: otherUserId, text: preview, ...extra });
  };

  const attachDocument = async () => {
    if (!chatId) return;
    try { setEnviando(true); const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false }); if (result.canceled) return; const asset = result.assets[0]; const uid = auth.currentUser!.uid; const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, "_"); const uploaded = await uploadFileUri(asset.uri, `chats/${chatId}/${uid}/${Date.now()}_${safeName}`, asset.mimeType || "application/octet-stream"); await sendRichMessage(`📎 ${asset.name}`, { attachment: { url: uploaded.url, name: asset.name, mimeType: asset.mimeType || "application/octet-stream", size: asset.size || 0 } }); }
    catch (error: any) { Alert.alert("Anexo", error?.message || "Não foi possível enviar o documento."); } finally { setEnviando(false); }
  };

  const shareLocation = async () => {
    try { setEnviando(true); const permission = await Location.requestForegroundPermissionsAsync(); if (!permission.granted) return Alert.alert("Localização", "Autorize o acesso para compartilhar sua posição."); const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); await sendRichMessage("📍 Localização compartilhada", { location: { latitude: position.coords.latitude, longitude: position.coords.longitude } }); }
    catch { Alert.alert("Localização", "Não foi possível obter sua posição."); } finally { setEnviando(false); }
  };

  const toggleRecording = async () => {
    try {
      if (recorderState.isRecording) { await recorder.stop(); const uri = recorder.uri; if (!uri || !chatId) return; setEnviando(true); const uid = auth.currentUser!.uid; const uploaded = await uploadFileUri(uri, `chats/${chatId}/${uid}/${Date.now()}_audio.m4a`, "audio/mp4", 10 * 1024 * 1024); await sendRichMessage("🎙️ Mensagem de áudio", { attachment: { url: uploaded.url, name: "audio.m4a", mimeType: "audio/mp4" } }); setEnviando(false); return; }
      const permission = await requestRecordingPermissionsAsync(); if (!permission.granted) return Alert.alert("Áudio", "Autorize o microfone para gravar mensagens."); await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }); await recorder.prepareToRecordAsync(); recorder.record();
    } catch (error: any) { setEnviando(false); Alert.alert("Áudio", error?.message || "Não foi possível gravar o áudio."); }
  };

  const enviarMensagem = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !otherUserId || !chatId || enviando || bloqueado) return;
    const text = texto.trim();
    if (!text) return;

    setTexto("");
    setEnviando(true);
    setErro("");

    try {
      if (editing) {
        await editChatMessage(chatId, editing.id, text);
        setEditing(null);
        setReplying(null);
        return;
      }
      await sendChatMessage({ chatId, recipientId: otherUserId, text, ...(replying ? { replyTo: { id: replying.id, text: replying.text.slice(0, 120), senderId: replying.senderId } } : {}) });
      setReplying(null);
    } catch (erro) {
      console.error("Erro ao enviar mensagem:", erro);
      setTexto((atual) => (atual.trim() ? atual : text));
      setErro("A mensagem não foi enviada. Verifique sua conexão e tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMine = item.senderId === auth.currentUser?.uid;
    const dataMensagem = item.createdAt?.toDate?.();
    const horario = dataMensagem
      ? dataMensagem.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : "";

    return (
      <TouchableOpacity
        onLongPress={() => messageActions(item)}
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : [styles.bubbleOther, { backgroundColor: theme.card }],
        ]}
      >
        {!!item.replyTo && <Text style={[styles.replyQuote, { color: isMine ? "#FFEDD5" : theme.textMuted }]}>{item.replyTo.text}</Text>}
        <Text
          style={[
            styles.bubbleText,
            isMine ? styles.textMine : [styles.textOther, { color: theme.textPrimary }],
          ]}
        >
          {item.deletedAt ? "Mensagem apagada" : item.text}
        </Text>
        {!!item.editedAt && <Text style={[styles.edited, isMine ? styles.timeMine : { color: theme.textMuted }]}>editada</Text>}
        {!!item.reactions && <Text style={styles.reactions}>{Object.values(item.reactions).join(" ")}</Text>}
        {!!item.attachment && (item.attachment.mimeType.startsWith("audio/") ? <AudioAttachment url={item.attachment.url} /> : <TouchableOpacity style={styles.attachmentButton} onPress={() => Linking.openURL(item.attachment!.url)}><File size={16} color="#FF8700" /><Text style={styles.attachmentText} numberOfLines={1}>{item.attachment.name}</Text></TouchableOpacity>)}
        {!!item.location && <TouchableOpacity style={styles.attachmentButton} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${item.location!.latitude},${item.location!.longitude}`)}><MapPin size={16} color="#FF8700" /><Text style={styles.attachmentText}>Abrir localização</Text></TouchableOpacity>}
        {!!horario && (
          <Text style={[styles.messageTime, isMine ? styles.timeMine : { color: theme.textMuted }]}>
            {horario}{isMine && item.readBy?.includes(otherUserId) ? "  ✓✓" : ""}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const messageActions = (item: Message) => {
    const mine = item.senderId === auth.currentUser?.uid;
    const actions: any[] = [
      { text: "Responder", onPress: () => setReplying(item) },
      { text: "Reagir 👍", onPress: () => chatId && reactToChatMessage(chatId, item.id, "👍") },
      { text: "Reagir ❤️", onPress: () => chatId && reactToChatMessage(chatId, item.id, "❤️") },
    ];
    if (mine && !item.deletedAt) actions.push(
      { text: "Editar", onPress: () => { setEditing(item); setTexto(item.text); } },
      { text: "Apagar", style: "destructive", onPress: () => chatId && deleteChatMessage(chatId, item.id) },
    );
    actions.push({ text: "Cancelar", style: "cancel" });
    Alert.alert("Mensagem", "Escolha uma ação", actions);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: theme.headerBtnBg }]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <ArrowLeft size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
              {otherUserName || "Conversa"}
            </Text>
            <View style={styles.secureRow}>
              <ShieldCheck size={12} color="#16A34A" />
              <Text style={styles.secureText}>{otherPresence.typing ? "digitando..." : otherPresence.online ? "online" : "Conversa protegida"}</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: theme.headerBtnBg }]} onPress={abrirSeguranca} accessibilityLabel="Segurança da conversa">
            <Ban size={19} color={bloqueado ? "#DC2626" : theme.textPrimary} />
          </TouchableOpacity>
        </View>

        {showSearch && <View style={[styles.searchRow, { borderBottomColor: theme.border }]}><Search size={17} color={theme.textMuted} /><TextInput style={[styles.searchInput, { color: theme.textPrimary }]} value={search} onChangeText={setSearch} placeholder="Pesquisar na conversa" placeholderTextColor={theme.textMuted} /><TouchableOpacity onPress={() => { setSearch(""); setShowSearch(false); }}><X size={18} color={theme.textMuted} /></TouchableOpacity></View>}

        <FlatList
          ref={listRef}
          data={search.trim() ? mensagens.filter((message) => message.text.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"))) : mensagens}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={carregando ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#FF8700" />
              <Text style={[styles.loadingText, { color: theme.textMuted }]}>Carregando mensagens...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.headerBtnBg }]}>
                <MessageCircle size={30} color="#FF8700" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Comece a conversa</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Combine os detalhes do serviço com clareza e segurança.
              </Text>
            </View>
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        />

        {!!erro && (
          <View style={[styles.errorBanner, { backgroundColor: isDark ? "#422006" : "#FFF7ED" }]}>
            <Text style={[styles.errorText, { color: isDark ? "#FCD34D" : "#9A3412" }]}>{erro}</Text>
            {!enviando && !carregando && mensagens.length === 0 && (
              <TouchableOpacity onPress={() => setTentativa((valor) => valor + 1)} accessibilityRole="button">
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!!(editing || replying) && <View style={[styles.composerContext, { backgroundColor: theme.card }]}><Text style={[styles.contextText, { color: theme.textSecondary }]} numberOfLines={1}>{editing ? `Editando: ${editing.text}` : `Respondendo: ${replying?.text}`}</Text><TouchableOpacity onPress={() => { setEditing(null); setReplying(null); setTexto(""); }}><X size={18} color={theme.textMuted} /></TouchableOpacity></View>}
        <View style={[styles.mediaActions, { backgroundColor: theme.background }]}><TouchableOpacity style={styles.mediaButton} onPress={attachDocument} disabled={enviando}><Paperclip size={18} color="#FF8700" /><Text style={styles.mediaLabel}>Documento</Text></TouchableOpacity><TouchableOpacity style={styles.mediaButton} onPress={shareLocation} disabled={enviando}><MapPin size={18} color="#16A34A" /><Text style={styles.mediaLabel}>Local</Text></TouchableOpacity><TouchableOpacity style={[styles.mediaButton, recorderState.isRecording && styles.recording]} onPress={toggleRecording} disabled={enviando}>{recorderState.isRecording ? <Square size={17} color="#FFFFFF" /> : <Mic size={18} color="#DC2626" />}<Text style={[styles.mediaLabel, recorderState.isRecording && { color: "#FFFFFF" }]}>{recorderState.isRecording ? `${Math.round(recorderState.durationMillis / 1000)}s` : "Áudio"}</Text></TouchableOpacity></View>
        <View
          style={[
            styles.inputRow,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}
        >
          <TextInput
            style={[styles.input, { backgroundColor: theme.actionBg, color: theme.textPrimary }]}
            placeholder={bloqueado ? "Usuário bloqueado" : "Digite sua mensagem..."}
            placeholderTextColor={isDark ? theme.textMuted : "#7A8797"}
            value={texto}
            onChangeText={setTexto}
            multiline
            maxLength={1000}
            editable={!enviando && !!chatId && !bloqueado}
            accessibilityLabel="Mensagem"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!texto.trim() || enviando || !chatId || bloqueado) && styles.sendButtonDisabled]}
            onPress={enviarMensagem}
            disabled={!texto.trim() || enviando || !chatId || bloqueado}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
          >
            {enviando ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 41, 55, 0.06)",
  },
  headerBtnGhost: {
    width: 44,
    height: 44,
  },
  headerCopy: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F2937",
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  secureText: {
    color: "#16A34A",
    fontSize: 10,
    fontWeight: "700",
  },
  searchRow: { minHeight: 46, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: 1 },
  searchInput: { flex: 1, fontSize: 13 },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 7,
    borderRadius: 18,
    marginBottom: 10,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "#FF8700",
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF4E5",
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  replyQuote: { fontSize: 11, fontWeight: "700", borderLeftWidth: 2, borderLeftColor: "#93C5FD", paddingLeft: 7, marginBottom: 5 },
  edited: { fontSize: 9, alignSelf: "flex-end" },
  reactions: { fontSize: 15, marginTop: 4 },
  attachmentButton: { minHeight: 38, marginTop: 7, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "#FFF7ED", flexDirection: "row", alignItems: "center", gap: 7 },
  attachmentText: { color: "#E86F00", fontSize: 11, fontWeight: "800", flexShrink: 1 },
  textMine: {
    color: "#fff",
  },
  textOther: {
    color: "#0F2937",
  },
  messageTime: {
    alignSelf: "flex-end",
    marginTop: 2,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "600",
  },
  timeMine: {
    color: "rgba(255,255,255,0.72)",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 38,
    paddingBottom: 56,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
  },
  loadingText: { fontSize: 13, fontWeight: "600", marginTop: 12 },
  errorBanner: { marginHorizontal: 14, marginBottom: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 10 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  retryText: { color: "#FF8700", fontSize: 12, fontWeight: "800" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 112,
    backgroundColor: "#F3F7FB",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F2937",
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#FF8700",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  composerContext: { minHeight: 40, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  contextText: { flex: 1, fontSize: 11, fontWeight: "700" },
  mediaActions: { minHeight: 42, paddingHorizontal: 14, flexDirection: "row", gap: 8, alignItems: "center" },
  mediaButton: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#F1F5F9" },
  mediaLabel: { color: "#475569", fontSize: 10, fontWeight: "800" },
  recording: { backgroundColor: "#DC2626" },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
