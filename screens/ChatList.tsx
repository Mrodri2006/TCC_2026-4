import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
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
    padding: 16,
    paddingTop: 6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 10,
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F2937",
    marginBottom: 6,
  },
  lastMessage: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 30,
    color: "#64748B",
    fontSize: 14,
  },
});
