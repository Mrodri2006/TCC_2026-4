import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, ChevronRight, MessageCircle } from "lucide-react-native";
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
    const rootNavigation = navigation.getParent?.() || navigation;
    rootNavigation.navigate("Chat", {
      otherUserId: item.otherUserId,
      otherUserName: item.otherUserName,
    });
  };

  const formatarHorario = (valor: any) => {
    const data = valor?.toDate?.();
    if (!data) return "";
    const hoje = new Date();
    return data.toDateString() === hoje.toDateString()
      ? data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
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

          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>Carregando conversas...</Text>
          </View>
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
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.headerBtnBg }]}>
              <MessageCircle size={31} color="#2563EB" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Nenhuma conversa ainda</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Suas conversas com clientes e profissionais aparecerão aqui.
            </Text>
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => abrirChat(item)}
                activeOpacity={0.78}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.otherUserName.trim().charAt(0).toUpperCase() || "U"}</Text>
                </View>
                <View style={styles.cardCopy}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>
                      {item.otherUserName}
                    </Text>
                    <Text style={[styles.time, { color: theme.textMuted }]}>{formatarHorario(item.lastMessageAt)}</Text>
                  </View>
                  <Text style={[styles.lastMessage, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.lastMessage || "Conversa iniciada"}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.textMuted} />
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 11,
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
    fontSize: 20,
    fontWeight: "800",
    color: "#0F2937",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  card: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 9,
    shadowColor: "#0F2937",
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  cardCopy: {
    flex: 1,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F2937",
    marginBottom: 4,
  },
  time: { fontSize: 10, fontWeight: "700" },
  lastMessage: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 13, fontWeight: "600" },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 44,
    paddingBottom: 70,
  },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginBottom: 7 },
  emptyText: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
  },
});
