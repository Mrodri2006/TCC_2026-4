import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";

type ChatItem = {
  id: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage?: string;
  lastMessageAt?: any;
};

export default function ChatList() {
  const navigation = useNavigation() as any;
  const { theme } = useTheme();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const unsub = firestore
      .collection("Chats")
      .where("participants", "array-contains", uid)
      .onSnapshot(async (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
        const items: ChatItem[] = await Promise.all(
          docs.map(async (doc: any) => {
            const otherId = (doc.participants || []).find((p: string) => p !== uid);
            let otherName = "UsuÃ¡rio";
            if (otherId) {
              try {
                const userSnap = await firestore.collection("Usuario").doc(otherId).get();
                const userData = userSnap.data();
                otherName = userData?.nome || userData?.email || "UsuÃ¡rio";
              } catch {
                otherName = "UsuÃ¡rio";
              }
            }
            return {
              id: doc.id,
              otherUserId: otherId,
              otherUserName: otherName,
              lastMessage: doc.lastMessage,
              lastMessageAt: doc.lastMessageAt,
            };
          })
        );
        const sorted = items
          .filter((c) => !!c.otherUserId)
          .sort((a, b) => {
            const aTime = a.lastMessageAt?.toDate?.() || new Date(0);
            const bTime = b.lastMessageAt?.toDate?.() || new Date(0);
            return bTime.getTime() - aTime.getTime();
          });
        setChats(sorted);
        setLoading(false);
      });

    return () => unsub();
  }, []);

  const abrirChat = (item: ChatItem) => {
    navigation.navigate("Chat", {
      otherUserId: item.otherUserId,
      otherUserName: item.otherUserName,
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={styles.emptyText}>Carregando conversas...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {chats.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma conversa ainda</Text>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => abrirChat(item)}>
              <Text style={styles.name}>{item.otherUserName}</Text>
              <Text style={styles.lastMessage}>
                {item.lastMessage || "Sem mensagens"}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  card: {
    backgroundColor: "#f7f7f7",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    marginTop:4
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#005362",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 13,
    color: "#666",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 30,
    color: "#999",
    fontSize: 14,
  },
});
