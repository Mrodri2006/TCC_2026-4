import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft, Heart, RotateCcw, Star } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, firestore } from "../firebase";
import { setProviderFavorite } from "../services/favoriteService";
import { useTheme } from "../theme/ThemeContext";
import { Skeleton, StateView } from "../components/ui";
import { getProviderRating } from "../services/reviewService";

export default function Favoritos() {
  const navigation = useNavigation<any>(); const { theme } = useTheme();
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { const uid = auth.currentUser?.uid; if (!uid) { setLoading(false); return; }
    return firestore.collection("Usuario").doc(uid).collection("Favoritos").onSnapshot(async (snapshot) => {
      try { const providers = await Promise.all(snapshot.docs.map(async (favorite) => { const saved = favorite.data(); try { const user = await firestore.collection("Usuario").doc(favorite.id).get(); const userData = user.exists ? user.data() : {}; const rating = await getProviderRating(favorite.id, { ...saved, ...userData }); return { id: favorite.id, ...saved, ...userData, ...rating }; } catch { return { id: favorite.id, ...saved }; } })); providers.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)); setItems(providers); }
      finally { setLoading(false); }
    }, () => setLoading(false)); }, []);
  return <View style={[styles.screen, { backgroundColor: theme.background }]}>
    <View style={[styles.header, { borderBottomColor: theme.border }]}><TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft color={theme.textPrimary} /></TouchableOpacity><Text style={[styles.title, { color: theme.textPrimary }]}>Favoritos</Text><View style={{ width: 24 }} /></View>
    {loading ? <View style={styles.skeletons}>{[0, 1, 2].map((item) => <Skeleton key={item} style={styles.skeleton} />)}</View> : <FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ListEmptyComponent={<StateView kind="empty" title="Nenhum favorito ainda" message="Salve profissionais para encontrá-los e contratá-los novamente." />} renderItem={({ item }) => <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}><View style={{ flex: 1 }}><Text style={[styles.name, { color: theme.textPrimary }]}>{item.nome}</Text><Text style={{ color: theme.textMuted }}>{item.profissao || "Profissional"}</Text><Text style={styles.rating}><Star size={13} color="#F59E0B" /> {Number(item.avaliacao || 0).toFixed(1)}</Text></View><TouchableOpacity style={styles.hire} onPress={() => navigation.navigate("DetalheProfissional", { profissional: { id: item.id, ...item } })}><RotateCcw size={16} color="#FFFFFF" /><Text style={styles.hireText}>Recontratar</Text></TouchableOpacity><TouchableOpacity onPress={() => setProviderFavorite(item, false)}><Heart size={22} fill="#EF4444" color="#EF4444" /></TouchableOpacity></View>} />}
  </View>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, header: { paddingTop: 55, paddingBottom: 16, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1 }, title: { fontSize: 20, fontWeight: "900" }, list: { padding: 16, flexGrow: 1 }, card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, marginBottom: 12, borderRadius: 18, borderWidth: 1 }, name: { fontSize: 16, fontWeight: "900" }, rating: { color: "#B45309", marginTop: 6 }, hire: { flexDirection: "row", gap: 5, backgroundColor: "#FF8700", paddingHorizontal: 10, paddingVertical: 9, borderRadius: 12 }, hireText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" }, skeletons: { padding: 16, gap: 12 }, skeleton: { height: 96, borderRadius: 18 } });
