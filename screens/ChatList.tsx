import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft } from "lucide-react-native";
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

  const voltar = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    const routeNames = navigation.getState?.()?.routeNames || [];
    const homeRoute = routeNames.find((name: string) => name.includes("Inicial"));

    if (homeRoute) {
      navigation.navigate(homeRoute);
      return;
    }

    navigation.navigate("MenuTrabalhador");
  };

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const unsub = firestore
      .collection("Chats")
      .where("participants", "array-contains", uid)
      .onSnapshot(
        async (snapshot) => {
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
        },
        (erro) => {
          console.error("Erro ao carregar conversas:", erro);
          setChats([]);
          setLoading(false);
        }
      );

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
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: theme.headerBtnBg }]}
              onPress={voltar}
            >
              <ArrowLeft size={22} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Conversas</Text>
            <View style={styles.headerBtnGhost} />
          </View>

          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            Carregando conversas...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: theme.headerBtnBg }]}
            onPress={voltar}
          >
            <ArrowLeft size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Conversas</Text>
          <View style={styles.headerBtnGhost} />
        </View>

        {chats.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            Nenhuma conversa ainda
          </Text>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.card }]}
                onPress={() => abrirChat(item)}
              >
                <Text style={[styles.name, { color: theme.textPrimary }]}>
                  {item.otherUserName}
                </Text>
                <Text style={[styles.lastMessage, { color: theme.textSecondary }]}>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
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
