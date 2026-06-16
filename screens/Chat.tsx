import { useEffect, useMemo, useState } from "react";
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
import { ArrowLeft, Send } from "lucide-react-native";
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
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: theme.headerBtnBg }]}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {otherUserName || "Chat"}
          </Text>
          <View style={styles.headerBtnGhost} />
        </View>

        <FlatList
          data={mensagens}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
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
          />
          <TouchableOpacity style={styles.sendButton} onPress={enviarMensagem}>
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
    paddingTop: 10,
    paddingBottom: 12,
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
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F2937",
  },
  listContent: {
    padding: 16,
    paddingBottom: 12,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 8,
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
    fontWeight: "600",
  },
  textMine: {
    color: "#fff",
  },
  textOther: {
    color: "#0F2937",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  input: {
    flex: 1,
    backgroundColor: "#F3F7FB",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F2937",
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#2563EB",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
