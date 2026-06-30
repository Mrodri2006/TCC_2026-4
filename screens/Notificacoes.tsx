import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft, Bell, CheckCheck, ChevronRight } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import firebase from "firebase/compat/app";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type?: string;
  lida?: boolean;
  criadoEm?: firebase.firestore.Timestamp;
  data?: Record<string, unknown>;
};

export default function Notificacoes() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }
    return firestore.collection("Usuario").doc(uid).collection("Notificacoes")
      .orderBy("criadoEm", "desc")
      .limit(100)
      .onSnapshot((snapshot) => {
        setItems(snapshot.docs.map((document) => ({ id: document.id, ...document.data() } as NotificationItem)));
        setError("");
        setLoading(false);
      }, () => {
        setError("Não foi possível carregar suas notificações.");
        setLoading(false);
      });
  }, []);

  const notificationRef = (id: string) => firestore.collection("Usuario").doc(auth.currentUser!.uid).collection("Notificacoes").doc(id);

  const openItem = async (item: NotificationItem) => {
    if (!item.lida) await notificationRef(item.id).set({ lida: true }, { merge: true }).catch((): void => undefined);
    const screen = typeof item.data?.screen === "string" ? item.data.screen : null;
    if (screen) navigation.navigate(screen, item.data?.params);
  };

  const markAllRead = async () => {
    const unread = items.filter((item) => !item.lida);
    if (!unread.length) return;
    const batch = firestore.batch();
    unread.forEach((item) => batch.set(notificationRef(item.id), { lida: true }, { merge: true }));
    await batch.commit();
  };

  const unreadCount = items.filter((item) => !item.lida).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.headerBtnBg }]} onPress={() => navigation.goBack()} accessibilityLabel="Voltar">
          <ArrowLeft size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Notificações</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{unreadCount ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}` : "Tudo em dia"}</Text>
        </View>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.headerBtnBg }]} onPress={markAllRead} disabled={!unreadCount} accessibilityLabel="Marcar todas como lidas">
          <CheckCheck size={21} color={unreadCount ? "#2563EB" : theme.textMuted} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /><Text style={[styles.stateText, { color: theme.textMuted }]}>Carregando...</Text></View>
      ) : error ? (
        <View style={styles.center}><Bell size={36} color="#DC2626" /><Text style={[styles.stateText, { color: theme.textPrimary }]}>{error}</Text></View>
      ) : items.length === 0 ? (
        <View style={styles.center}><View style={[styles.emptyIcon, { backgroundColor: theme.headerBtnBg }]}><Bell size={30} color="#2563EB" /></View><Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Nenhuma notificação</Text><Text style={[styles.stateText, { color: theme.textMuted }]}>As novidades dos seus serviços aparecerão aqui.</Text></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.card, { backgroundColor: theme.card, borderColor: item.lida ? theme.border : "#93C5FD" }]} onPress={() => openItem(item)} activeOpacity={0.8}>
              <View style={[styles.dot, { backgroundColor: item.lida ? theme.border : "#2563EB" }]} />
              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{item.title || "Atualização"}</Text>
                <Text style={[styles.cardBody, { color: theme.textSecondary }]}>{item.body}</Text>
                <Text style={[styles.date, { color: theme.textMuted }]}>{item.criadoEm?.toDate?.().toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) || "Agora"}</Text>
              </View>
              {item.data?.screen ? <ChevronRight size={18} color={theme.textMuted} /> : null}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, alignItems: "center" },
  title: { fontSize: 19, fontWeight: "800" },
  subtitle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  list: { padding: 16, paddingBottom: 32 },
  card: { minHeight: 92, borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 11 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  cardCopy: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "800" },
  cardBody: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  date: { fontSize: 10, fontWeight: "600", marginTop: 7 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 42, gap: 12 },
  emptyIcon: { width: 66, height: 66, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "800" },
  stateText: { fontSize: 13, lineHeight: 19, textAlign: "center" },
});
