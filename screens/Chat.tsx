import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, MessageCircle, Send, ShieldCheck } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, firestore } from "../firebase";
import firebase from "firebase/compat/app";
import { useTheme } from "../theme/ThemeContext";

type Message = {
  id: string;
  text: string;
  senderId: string;
  createdAt?: any;
};

export default function Chat() {
  const navigation = useNavigation<any>();
  const route = useRoute() as any;
  const { otherUserId, otherUserName } = route.params || {};
  const { isDark, theme } = useTheme();

  const [mensagens, setMensagens] = useState<Message[]>([]);
  const [texto, setTexto] = useState("");
  const listRef = useRef<FlatList<Message>>(null);

  const chatId = useMemo(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !otherUserId) return null;
    return [uid, otherUserId].sort().join("_");
  }, [otherUserId]);

  useEffect(() => {
    if (!chatId) return;

    const uid = auth.currentUser?.uid;
    if (!uid || !otherUserId) return;

    let unsubscribe: undefined | (() => void);
    let active = true;

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
            },
            (erro) => {
              console.error("Erro ao carregar mensagens:", erro);
              setMensagens([]);
            }
          );
      } catch (erro) {
        console.error("Erro ao preparar chat:", erro);
        setMensagens([]);
      }
    };

    prepararChat();

    return () => {
      active = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [chatId, otherUserId]);

  const enviarMensagem = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !otherUserId || !chatId) return;
    const text = texto.trim();
    if (!text) return;

    setTexto("");

    try {
      const chatRef = firestore.collection("Chats").doc(chatId);
      const msgRef = chatRef.collection("Messages").doc();
      const timestamp = firebase.firestore.FieldValue.serverTimestamp();

      const batch = firestore.batch();
      
      // Adicionar mensagem
      batch.set(msgRef, {
        text,
        senderId: uid,
        createdAt: timestamp,
      });
      
      // Atualizar documento do chat com merge true
      batch.set(
        chatRef,
        {
          participants: [uid, otherUserId].sort(),
          lastMessage: text,
          lastMessageAt: timestamp,
          createdAt: timestamp,
        },
        { merge: true }
      );

      await batch.commit();
    } catch (erro) {
      console.error("Erro ao enviar mensagem:", erro);
      setTexto(texto);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMine = item.senderId === auth.currentUser?.uid;
    const dataMensagem = item.createdAt?.toDate?.();
    const horario = dataMensagem
      ? dataMensagem.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : "";

    return (
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : [styles.bubbleOther, { backgroundColor: theme.card }],
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isMine ? styles.textMine : [styles.textOther, { color: theme.textPrimary }],
          ]}
        >
          {item.text}
        </Text>
        {!!horario && (
          <Text style={[styles.messageTime, isMine ? styles.timeMine : { color: theme.textMuted }]}>
            {horario}
          </Text>
        )}
      </View>
    );
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
          >
            <ArrowLeft size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
              {otherUserName || "Conversa"}
            </Text>
            <View style={styles.secureRow}>
              <ShieldCheck size={12} color="#16A34A" />
              <Text style={styles.secureText}>Conversa protegida</Text>
            </View>
          </View>
          <View style={styles.headerBtnGhost} />
        </View>

        <FlatList
          ref={listRef}
          data={mensagens}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.headerBtnBg }]}>
                <MessageCircle size={30} color="#2563EB" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Comece a conversa</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Combine os detalhes do serviço com clareza e segurança.
              </Text>
            </View>
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        />

        <View
          style={[
            styles.inputRow,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}
        >
          <TextInput
            style={[styles.input, { backgroundColor: theme.actionBg, color: theme.textPrimary }]}
            placeholder="Digite sua mensagem..."
            placeholderTextColor={isDark ? theme.textMuted : "#7A8797"}
            value={texto}
            onChangeText={setTexto}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !texto.trim() && styles.sendButtonDisabled]}
            onPress={enviarMensagem}
            disabled={!texto.trim()}
            activeOpacity={0.8}
          >
            <Send size={18} color="#fff" />
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
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F4FF",
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
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
    backgroundColor: "#2563EB",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
