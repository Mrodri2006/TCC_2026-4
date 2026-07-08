import { useEffect, useState } from "react";
import { FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft, Bell, BriefcaseBusiness, Check, CheckCheck, ChevronRight, CreditCard, Inbox, MessageCircle, Shield } from "lucide-react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import firebase from "firebase/compat/app";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";
import { StateView } from "../components/ui";
import { useFeedback } from "../components/ui";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type?: string;
  category?: string;
  lida?: boolean;
  criadoEm?: firebase.firestore.Timestamp;
  data?: Record<string, unknown>;
};

export default function Notificacoes() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useTheme();
  const feedback = useFeedback();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("todas");

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
    try {
      if (!item.lida) await notificationRef(item.id).set({ lida: true }, { merge: true });
      const explicitScreen = typeof item.data?.screen === "string" ? item.data.screen : null;
      const type = String(item.type || "");
      const fallbackScreen = type === "service_request"
        ? "MenuTrabalhador"
        : type.startsWith("service_")
          ? "Home"
          : type.startsWith("chat")
            ? "ChatList"
            : type.includes("payment") || type.includes("billing")
              ? "PagamentoMensalidade"
              : null;
      const screen = explicitScreen || fallbackScreen;
      if (screen && screen !== "Notificacoes") navigation.navigate(screen, item.data?.params);
      else if (!screen) feedback.show("Notificação marcada como lida.", "success");
    } catch {
      feedback.show("Não foi possível abrir esta notificação.", "error");
    }
  };

  const markAllRead = async () => {
    const unread = items.filter((item) => !item.lida);
    if (!unread.length) return;
    const batch = firestore.batch();
    unread.forEach((item) => batch.set(notificationRef(item.id), { lida: true }, { merge: true }));
    try {
      await batch.commit();
      feedback.show(`${unread.length} notificação${unread.length === 1 ? "" : "es"} marcada${unread.length === 1 ? "" : "s"} como lida${unread.length === 1 ? "" : "s"}.`, "success");
    } catch {
      feedback.show("Não foi possível marcar as notificações como lidas.", "error");
    }
  };

  const unreadCount = items.filter((item) => !item.lida).length;
  const categoryOf = (item: NotificationItem) => item.category || (item.type?.startsWith("service") ? "servicos" : item.type?.startsWith("chat") ? "chat" : item.type?.includes("payment") || item.type?.includes("billing") ? "pagamentos" : "sistema");
  const categoryLabel = (item: NotificationItem) => ({ servicos: "Serviço", chat: "Conversa", pagamentos: "Pagamento", sistema: "Sistema" }[categoryOf(item)]);
  const categoryIcon = (item: NotificationItem) => {
    const iconProps = { size: 19, color: "#FF8700" };
    const itemCategory = categoryOf(item);
    if (itemCategory === "servicos") return <BriefcaseBusiness {...iconProps} />;
    if (itemCategory === "chat") return <MessageCircle {...iconProps} />;
    if (itemCategory === "pagamentos") return <CreditCard {...iconProps} />;
    return <Shield {...iconProps} />;
  };
  const filterIcon = (key: string, active: boolean) => {
    const color = active ? "#FF8700" : theme.textPrimary;
    const props = { size: 23, color, strokeWidth: active ? 2.4 : 2 };
    if (key === "todas") return <Bell {...props} />;
    if (key === "servicos") return <BriefcaseBusiness {...props} />;
    if (key === "chat") return <MessageCircle {...props} />;
    if (key === "pagamentos") return <CreditCard {...props} />;
    return <Shield {...props} />;
  };
  const filteredItems = category === "todas" ? items : items.filter((item) => categoryOf(item) === category);

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
          <CheckCheck size={21} color={unreadCount ? "#FF8700" : theme.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={[styles.filters, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {[["todas", "Todas"], ["servicos", "Serviços"], ["chat", "Chat"], ["pagamentos", "Pagamentos"], ["sistema", "Sistema"]].map(([key, label]) => {
          const active = category === key;
          return <TouchableOpacity key={key} style={styles.filter} onPress={() => setCategory(key)} activeOpacity={0.75}>
            <View style={styles.filterIcon}>{filterIcon(key, active)}</View>
            <Text style={[styles.filterText, { color: active ? (isDark ? "#FFB13B" : "#E86F00") : theme.textSecondary }]}>{label}</Text>
            <View style={[styles.filterIndicator, active && { backgroundColor: "#FF8700" }]} />
          </TouchableOpacity>;
        })}
      </View>

      {loading ? (
        <StateView kind="loading" message="Buscando suas atualizações..." />
      ) : error ? (
        <StateView kind="error" message={error} />
      ) : filteredItems.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.emptyArtwork, { backgroundColor: isDark ? "rgba(255,135,0,0.12)" : "#FFF4E5" }]}>
            <Inbox size={74} color="#FF8700" strokeWidth={1.8} />
            <View style={styles.emptyBell}><Bell size={23} color="#FFFFFF" fill="#FF9D00" /></View>
          </View>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Nenhuma notificação</Text>
          <Text style={[styles.emptyMessage, { color: theme.textMuted }]}>As novidades dos seus serviços aparecerão aqui.</Text>
          <TouchableOpacity style={[styles.tipCard, { backgroundColor: isDark ? "rgba(255,135,0,0.10)" : "#FFF9F2", borderColor: isDark ? "rgba(255,135,0,0.28)" : "#FFEDD5" }]} onPress={() => Linking.openSettings()} activeOpacity={0.8}>
            <View style={styles.tipIcon}><Bell size={24} color="#FF8700" /></View>
            <View style={styles.tipCopy}>
              <Text style={[styles.tipTitle, { color: theme.textPrimary }]}>Fique por dentro!</Text>
              <Text style={[styles.tipText, { color: theme.textMuted }]}>Ative as notificações para não perder nenhuma novidade importante.</Text>
            </View>
            <ChevronRight size={22} color="#FF8700" />
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Swipeable overshootRight={false} renderRightActions={() => !item.lida ? <TouchableOpacity style={styles.swipeRead} onPress={async () => { await notificationRef(item.id).set({ lida: true }, { merge: true }); feedback.show("Notificação marcada como lida.", "success"); }}><Check size={21} color="#FFFFFF" /><Text style={styles.swipeText}>Lida</Text></TouchableOpacity> : null}>
            <TouchableOpacity style={[styles.card, { backgroundColor: !item.lida ? (isDark ? "rgba(255,135,0,0.10)" : "#FFF7ED") : theme.card, borderColor: item.lida ? theme.border : "#FFB13B" }]} onPress={() => openItem(item)} activeOpacity={0.8}>
              <View style={[styles.iconWrap, { backgroundColor: isDark ? "rgba(255,135,0,0.15)" : "#FFEDD5" }]}>
                {categoryIcon(item)}
              </View>
              <View style={styles.cardCopy}>
                <View style={styles.cardMeta}>
                  <Text style={styles.categoryLabel}>{categoryLabel(item)}</Text>
                  {!item.lida ? <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>NOVA</Text></View> : null}
                </View>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]} numberOfLines={2}>{item.title || "Atualização"}</Text>
                <Text style={[styles.cardBody, { color: theme.textSecondary }]}>{item.body}</Text>
                <Text style={[styles.date, { color: theme.textMuted }]}>{item.criadoEm?.toDate?.().toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) || "Agora"}</Text>
              </View>
              {item.data?.screen ? <ChevronRight size={18} color={theme.textMuted} /> : null}
            </TouchableOpacity>
            </Swipeable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, alignItems: "center" },
  title: { fontSize: 22, fontWeight: "900" },
  subtitle: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  list: { padding: 16, paddingTop: 8, paddingBottom: 32 },
  filters: { height: 106, marginHorizontal: 16, marginTop: 14, marginBottom: 12, borderWidth: 1, borderRadius: 24, flexDirection: "row", overflow: "hidden", shadowColor: "#071A33", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  filter: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingTop: 15 },
  filterIcon: { height: 31, alignItems: "center", justifyContent: "center" },
  filterText: { fontSize: 11, fontWeight: "800", marginTop: 5, marginBottom: 13 },
  filterIndicator: { width: "72%", height: 4, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: "transparent" },
  swipeRead: { width: 86, minHeight: 92, marginBottom: 10, borderRadius: 18, backgroundColor: "#16A34A", alignItems: "center", justifyContent: "center", gap: 4 },
  swipeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  card: { minHeight: 112, borderRadius: 22, borderWidth: 1, padding: 15, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#071A33", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  iconWrap: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  cardCopy: { flex: 1 },
  cardMeta: { minHeight: 17, flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 4 },
  categoryLabel: { color: "#E86F00", fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  unreadBadge: { backgroundColor: "#FF8700", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  unreadBadgeText: { color: "#FFFFFF", fontSize: 8, fontWeight: "900", letterSpacing: 0.4 },
  cardTitle: { fontSize: 15, lineHeight: 20, fontWeight: "900" },
  cardBody: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  date: { fontSize: 10, fontWeight: "600", marginTop: 7 },
  emptyCard: { flex: 1, marginHorizontal: 16, marginBottom: 18, borderWidth: 1, borderRadius: 28, paddingHorizontal: 20, paddingTop: 48, paddingBottom: 22, alignItems: "center", shadowColor: "#071A33", shadowOpacity: 0.04, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 1 },
  emptyArtwork: { width: 176, height: 176, borderRadius: 88, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  emptyBell: { position: "absolute", top: 34, width: 42, height: 42, borderRadius: 21, backgroundColor: "#FF9D00", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#FFF4E5" },
  emptyTitle: { fontSize: 22, fontWeight: "900", textAlign: "center" },
  emptyMessage: { maxWidth: 310, fontSize: 16, lineHeight: 23, fontWeight: "600", textAlign: "center", marginTop: 12 },
  tipCard: { width: "100%", minHeight: 98, borderWidth: 1, borderRadius: 20, marginTop: 38, paddingHorizontal: 15, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  tipIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,135,0,0.10)", alignItems: "center", justifyContent: "center" },
  tipCopy: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: "900", marginBottom: 4 },
  tipText: { fontSize: 12, lineHeight: 18, fontWeight: "600" },
});
