import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ArrowLeft, CalendarClock, Save } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import firebase from "firebase/compat/app";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";

type DayAvailability = { id: string; label: string; enabled: boolean; start: string; end: string };

const INITIAL_DAYS: DayAvailability[] = [
  { id: "0", label: "Domingo", enabled: false, start: "08:00", end: "18:00" },
  { id: "1", label: "Segunda-feira", enabled: true, start: "08:00", end: "18:00" },
  { id: "2", label: "Terça-feira", enabled: true, start: "08:00", end: "18:00" },
  { id: "3", label: "Quarta-feira", enabled: true, start: "08:00", end: "18:00" },
  { id: "4", label: "Quinta-feira", enabled: true, start: "08:00", end: "18:00" },
  { id: "5", label: "Sexta-feira", enabled: true, start: "08:00", end: "18:00" },
  { id: "6", label: "Sábado", enabled: false, start: "08:00", end: "13:00" },
];

const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export default function AgendaPrestador() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [days, setDays] = useState(INITIAL_DAYS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return setLoading(false);
    firestore.collection("Usuario").doc(uid).collection("Disponibilidade").get()
      .then((snapshot) => {
        const stored = new Map(snapshot.docs.map((document) => [document.id, document.data()]));
        setDays((current) => current.map((day) => stored.has(day.id) ? { ...day, ...stored.get(day.id), id: day.id, label: day.label } : day));
      })
      .catch(() => Alert.alert("Agenda", "Não foi possível carregar sua disponibilidade."))
      .finally(() => setLoading(false));
  }, []);

  const updateDay = (id: string, changes: Partial<DayAvailability>) => {
    setDays((current) => current.map((day) => day.id === id ? { ...day, ...changes } : day));
  };

  const save = async () => {
    const invalid = days.find((day) => day.enabled && (!validTime(day.start) || !validTime(day.end) || day.start >= day.end));
    if (invalid) {
      Alert.alert("Horário inválido", `Confira o período informado para ${invalid.label}.`);
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      setSaving(true);
      const batch = firestore.batch();
      days.forEach((day) => batch.set(
        firestore.collection("Usuario").doc(uid).collection("Disponibilidade").doc(day.id),
        { enabled: day.enabled, start: day.start, end: day.end, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      ));
      await batch.commit();
      Alert.alert("Agenda atualizada", "Os contratantes já verão os novos horários disponíveis.");
    } catch {
      Alert.alert("Erro", "Não foi possível salvar sua agenda.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.headerBtnBg }]} onPress={() => navigation.goBack()}><ArrowLeft size={22} color={theme.textPrimary} /></TouchableOpacity>
        <View style={styles.headerCopy}><Text style={[styles.title, { color: theme.textPrimary }]}>Minha agenda</Text><Text style={[styles.subtitle, { color: theme.textMuted }]}>Defina quando você pode atender</Text></View>
        <View style={styles.headerPlaceholder} />
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View> : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.intro, { backgroundColor: theme.card, borderColor: theme.border }]}><CalendarClock size={27} color="#2563EB" /><Text style={[styles.introText, { color: theme.textSecondary }]}>Solicitações fora destes horários serão bloqueadas automaticamente.</Text></View>
          {days.map((day) => (
            <View key={day.id} style={[styles.dayCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.dayHeader}><Text style={[styles.dayName, { color: theme.textPrimary }]}>{day.label}</Text><Switch value={day.enabled} onValueChange={(enabled) => updateDay(day.id, { enabled })} /></View>
              {day.enabled ? <View style={styles.timeRow}><TextInput style={[styles.timeInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.actionBg }]} value={day.start} onChangeText={(start) => updateDay(day.id, { start })} placeholder="08:00" keyboardType="numbers-and-punctuation" maxLength={5} /><Text style={[styles.to, { color: theme.textMuted }]}>até</Text><TextInput style={[styles.timeInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.actionBg }]} value={day.end} onChangeText={(end) => updateDay(day.id, { end })} placeholder="18:00" keyboardType="numbers-and-punctuation" maxLength={5} /></View> : <Text style={[styles.unavailable, { color: theme.textMuted }]}>Indisponível</Text>}
            </View>
          ))}
          <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Save size={19} color="#FFFFFF" />}<Text style={styles.saveText}>{saving ? "Salvando..." : "Salvar disponibilidade"}</Text></TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: StyleSheet.hairlineWidth }, headerButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "center" }, headerPlaceholder: { width: 44 }, title: { fontSize: 19, fontWeight: "800" }, subtitle: { fontSize: 11, marginTop: 2 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, content: { padding: 16, paddingBottom: 36 }, intro: { borderRadius: 18, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }, introText: { flex: 1, fontSize: 12, lineHeight: 18 }, dayCard: { borderRadius: 17, borderWidth: 1, padding: 14, marginBottom: 9 }, dayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, dayName: { fontSize: 14, fontWeight: "800" }, timeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }, timeInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 9, textAlign: "center", fontWeight: "700" }, to: { fontSize: 12, fontWeight: "600" }, unavailable: { fontSize: 12, marginTop: 4 }, saveButton: { minHeight: 50, borderRadius: 16, backgroundColor: "#2563EB", flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center", marginTop: 10 }, saveText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 }, disabled: { opacity: 0.6 },
});
