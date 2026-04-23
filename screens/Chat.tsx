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
  const navigation = useNavigation();
  const route = useRoute() as any;
  const { otherUserId, otherUserName } = route.params || {};
  const { theme } = useTheme();

  const [mensagens, setMensagens] = useState<Message[]>([]);
  const [texto, setTexto] = useState("");

  const chatId = useMemo(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !otherUserId) return null;
    return [uid, otherUserId].sort().join("_");
  }, [otherUserId]);

  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = firestore
      .collection("Chats")
      .doc(chatId)
      .collection("Messages")
      .orderBy("createdAt", "asc")
      .onSnapshot((snapshot) => {
        const lista: Message[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        }));
        setMensagens(lista);
      });

    return () => unsubscribe();
  }, [chatId]);

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
          isMine ? styles.bubbleMine : styles.bubbleOther,
        ]}
      >
        <Text style={[styles.bubbleText, isMine ? styles.textMine : styles.textOther]}>
          {item.text}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#0F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{otherUserName || "Chat"}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={mensagens}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Digite sua mensagem..."
          value={texto}
          onChangeText={setTexto}
        />
        <TouchableOpacity style={styles.sendButton} onPress={enviarMensagem}>
          <Send size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F2937",
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
  },
  bubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F7FB",
  },
  bubbleText: {
    fontSize: 14,
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
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  input: {
    flex: 1,
    backgroundColor: "#F3F7FB",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    margin:40,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#2563EB",
    padding: 12,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
