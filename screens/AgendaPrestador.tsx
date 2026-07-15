import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowLeft, CalendarClock, Clock, Plus, Save, Trash2 } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import firebase from "firebase/compat/app";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";

type DayAvailability = {
  id: string;
  label: string;
  shortLabel: string;
  enabled: boolean;
  start: string;
  end: string;
  lunchStart: string;
  lunchEnd: string;
  dailyLimit: number;
  slotDuration: number;
};

type TimeOff = {
  id: string;
  startDate: string;
  endDate: string;
  type: "folga" | "ferias" | "feriado";
  reason: string;
};

type Reservation = {
  id: string;
  data?: string;
  horario?: string;
};

type PreviewSlotStatus = "livre" | "ocupado" | "limite";

const DAY_LABELS = [
  { label: "Domingo", shortLabel: "Dom" },
  { label: "Segunda-feira", shortLabel: "Seg" },
  { label: "Terca-feira", shortLabel: "Ter" },
  { label: "Quarta-feira", shortLabel: "Qua" },
  { label: "Quinta-feira", shortLabel: "Qui" },
  { label: "Sexta-feira", shortLabel: "Sex" },
  { label: "Sabado", shortLabel: "Sab" },
];

const SLOT_OPTIONS = [30, 45, 60, 90, 120];

const INITIAL_DAYS: DayAvailability[] = DAY_LABELS.map((day, index) => ({
  id: String(index),
  label: day.label,
  shortLabel: day.shortLabel,
  enabled: index > 0 && index < 6,
  start: "08:00",
  end: index === 6 ? "13:00" : "18:00",
  lunchStart: "12:00",
  lunchEnd: "13:00",
  dailyLimit: index === 6 ? 2 : 4,
  slotDuration: 60,
}));

const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());

const toMinutes = (value: string) => {
  if (!validTime(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDateBr = (date: Date) =>
  `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

const formatDateIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const buildSlots = (day: DayAvailability) => {
  if (!day.enabled) return [];
  const start = toMinutes(day.start);
  const end = toMinutes(day.end);
  const lunchStart = toMinutes(day.lunchStart);
  const lunchEnd = toMinutes(day.lunchEnd);
  if (start === null || end === null || start >= end) return [];

  const slots: string[] = [];
  for (let current = start; current + day.slotDuration <= end; current += day.slotDuration) {
    const crossesLunch = lunchStart !== null && lunchEnd !== null && lunchStart < lunchEnd && current < lunchEnd && current + day.slotDuration > lunchStart;
    if (!crossesLunch) slots.push(minutesToTime(current));
  }
  return slots;
};

const getTimeOffForDate = (items: TimeOff[], isoDate: string) =>
  items.find((item) => item.startDate <= isoDate && item.endDate >= isoDate);

const normalizeStoredDay = (day: DayAvailability, stored?: any): DayAvailability => ({
  ...day,
  enabled: stored?.enabled === undefined ? day.enabled : stored.enabled === true,
  start: validTime(String(stored?.start || "")) ? String(stored.start) : day.start,
  end: validTime(String(stored?.end || "")) ? String(stored.end) : day.end,
  lunchStart: validTime(String(stored?.lunchStart || "")) ? String(stored.lunchStart) : day.lunchStart,
  lunchEnd: validTime(String(stored?.lunchEnd || "")) ? String(stored.lunchEnd) : day.lunchEnd,
  dailyLimit: Number.isFinite(Number(stored?.dailyLimit)) ? Number(stored.dailyLimit) : day.dailyLimit,
  slotDuration: Number.isFinite(Number(stored?.slotDuration || stored?.slotInterval))
    ? Number(stored.slotDuration || stored.slotInterval)
    : day.slotDuration,
});

export default function AgendaPrestador() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [days, setDays] = useState(INITIAL_DAYS);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [draft, setDraft] = useState<Omit<TimeOff, "id">>({ startDate: "", endDate: "", type: "folga", reason: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const nextDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(new Date(), index)), []);
  const nextDateTexts = useMemo(() => nextDates.map(formatDateBr), [nextDates]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const userRef = firestore.collection("Usuario").doc(uid);
        const [availability, unavailable, reserved] = await Promise.all([
          userRef.collection("Disponibilidade").get(),
          userRef.collection("Indisponibilidades").orderBy("startDate").get(),
          userRef.collection("ReservasAgenda").where("data", "in", nextDateTexts).get(),
        ]);

        const stored = new Map(availability.docs.map((doc) => [doc.id, doc.data()]));
        setDays((current) => current.map((day) => normalizeStoredDay(day, stored.get(day.id))));
        setTimeOff(unavailable.docs.map((doc) => ({ id: doc.id, ...doc.data() } as TimeOff)));
        setReservations(reserved.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Reservation)));
      } catch {
        Alert.alert("Agenda", "Nao foi possivel carregar sua agenda.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [nextDateTexts]);

  const reservationsByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    reservations.forEach((item) => {
      if (!item.data || !item.horario) return;
      if (!map.has(item.data)) map.set(item.data, new Set());
      map.get(item.data)?.add(item.horario);
    });
    return map;
  }, [reservations]);

  const agendaPreview = useMemo(
    () =>
      nextDates.map((date) => {
        const day = days[date.getDay()];
        const data = formatDateBr(date);
        const isoDate = formatDateIso(date);
        const blocked = getTimeOffForDate(timeOff, isoDate);
        const slots = buildSlots(day);
        const reserved = reservationsByDate.get(data) || new Set<string>();
        const limitReached = day.dailyLimit > 0 && reserved.size >= day.dailyLimit;
        const previewSlots = slots.map((time) => ({
          time,
          status: reserved.has(time) ? "ocupado" : limitReached ? "limite" : "livre",
        })) as Array<{ time: string; status: PreviewSlotStatus }>;

        return {
          key: data,
          data,
          isoDate,
          day,
          blocked,
          previewSlots,
          freeCount: blocked || !day.enabled || limitReached ? 0 : previewSlots.filter((slot) => slot.status === "livre").length,
          busyCount: reserved.size,
        };
      }),
    [days, nextDates, reservationsByDate, timeOff]
  );

  const updateDay = (id: string, changes: Partial<DayAvailability>) =>
    setDays((current) => current.map((day) => (day.id === id ? { ...day, ...changes } : day)));

  const validateDay = (day: DayAvailability) => {
    if (!day.enabled) return false;
    const start = toMinutes(day.start);
    const end = toMinutes(day.end);
    const lunchStart = toMinutes(day.lunchStart);
    const lunchEnd = toMinutes(day.lunchEnd);
    return (
      start === null ||
      end === null ||
      lunchStart === null ||
      lunchEnd === null ||
      start >= end ||
      lunchStart >= lunchEnd ||
      lunchStart < start ||
      lunchEnd > end ||
      day.slotDuration < 15 ||
      day.slotDuration > 480 ||
      day.dailyLimit < 1 ||
      day.dailyLimit > 40 ||
      buildSlots(day).length === 0
    );
  };

  const save = async () => {
    const invalid = days.find(validateDay);
    if (invalid) {
      Alert.alert("Horario invalido", `Confira expediente, intervalo, duracao e limite de ${invalid.label}.`);
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      setSaving(true);
      const batch = firestore.batch();
      days.forEach((day) => {
        batch.set(
          firestore.collection("Usuario").doc(uid).collection("Disponibilidade").doc(day.id),
          {
            enabled: day.enabled,
            start: day.start,
            end: day.end,
            lunchStart: day.lunchStart,
            lunchEnd: day.lunchEnd,
            dailyLimit: day.dailyLimit,
            slotDuration: day.slotDuration,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });
      await batch.commit();
      Alert.alert("Agenda atualizada", "Novas solicitacoes passam a respeitar esses horarios.");
    } catch {
      Alert.alert("Erro", "Nao foi possivel salvar sua agenda.");
    } finally {
      setSaving(false);
    }
  };

  const addTimeOff = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !validDate(draft.startDate) || !validDate(draft.endDate) || draft.startDate > draft.endDate) {
      Alert.alert("Periodo invalido", "Use AAAA-MM-DD e confira o intervalo.");
      return;
    }

    try {
      const ref = firestore.collection("Usuario").doc(uid).collection("Indisponibilidades").doc();
      await ref.set({ ...draft, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      setTimeOff((current) => [...current, { id: ref.id, ...draft }]);
      setDraft({ startDate: "", endDate: "", type: "folga", reason: "" });
    } catch {
      Alert.alert("Erro", "Nao foi possivel adicionar o periodo.");
    }
  };

  const removeTimeOff = async (item: TimeOff) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await firestore.collection("Usuario").doc(uid).collection("Indisponibilidades").doc(item.id).delete();
      setTimeOff((current) => current.filter((value) => value.id !== item.id));
    } catch {
      Alert.alert("Erro", "Nao foi possivel remover o periodo.");
    }
  };

  const inputStyle = { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.actionBg };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.headerBtnBg }]} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Minha agenda</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Horarios do prestador</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF8700" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.intro, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <CalendarClock size={27} color="#FF8700" />
            <View style={styles.introCopy}>
              <Text style={[styles.introTitle, { color: theme.textPrimary }]}>Agenda por horarios</Text>
              <Text style={[styles.introText, { color: theme.textSecondary }]}>
                Cada horario vira um slot de atendimento. Horarios reservados e periodos bloqueados deixam de aparecer para o cliente.
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Proximos dias</Text>
          {agendaPreview.map((item) => (
            <View key={item.key} style={[styles.previewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.previewHeader}>
                <View>
                  <Text style={[styles.previewDay, { color: theme.textPrimary }]}>{item.day.shortLabel} • {item.data}</Text>
                  <Text style={[styles.previewMeta, { color: theme.textMuted }]}>
                    {item.blocked
                      ? `${item.blocked.type === "ferias" ? "Ferias" : item.blocked.type} bloqueado`
                      : item.day.enabled
                        ? `${item.freeCount} livres • ${item.busyCount} ocupados`
                        : "Sem atendimento"}
                  </Text>
                </View>
                <Clock size={18} color="#FF8700" />
              </View>

              {item.blocked || !item.day.enabled ? (
                <Text style={[styles.offText, { color: theme.textMuted }]}>
                  {item.blocked?.reason || "Dia indisponivel na agenda."}
                </Text>
              ) : (
                <View style={styles.slotWrap}>
                  {item.previewSlots.map((slot) => (
                    <View
                      key={`${item.key}-${slot.time}`}
                      style={[
                        styles.slot,
                        slot.status === "ocupado" ? styles.slotBusy : slot.status === "limite" ? styles.slotLimit : styles.slotFree,
                      ]}
                    >
                      <Text
                        style={[
                          styles.slotText,
                          slot.status === "ocupado" ? styles.slotBusyText : slot.status === "limite" ? styles.slotLimitText : styles.slotFreeText,
                        ]}
                      >
                        {slot.time}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.slotFree]} /><Text style={[styles.legendText, { color: theme.textMuted }]}>Livre</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.slotBusy]} /><Text style={[styles.legendText, { color: theme.textMuted }]}>Ocupado</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.slotLimit]} /><Text style={[styles.legendText, { color: theme.textMuted }]}>Limite</Text></View>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Configurar semana</Text>
          {days.map((day) => (
            <View key={day.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.dayName, { color: theme.textPrimary }]}>{day.label}</Text>
                  <Text style={[styles.dayMeta, { color: theme.textMuted }]}>
                    {day.enabled ? `${buildSlots(day).length} horarios de ${day.slotDuration} min` : "Indisponivel"}
                  </Text>
                </View>
                <Switch value={day.enabled} onValueChange={(enabled) => updateDay(day.id, { enabled })} />
              </View>

              {day.enabled ? (
                <>
                  <Text style={[styles.label, { color: theme.textMuted }]}>Expediente</Text>
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.time, inputStyle]}
                      value={day.start}
                      onChangeText={(start) => updateDay(day.id, { start })}
                      maxLength={5}
                      keyboardType="numbers-and-punctuation"
                    />
                    <Text style={{ color: theme.textMuted }}>ate</Text>
                    <TextInput
                      style={[styles.time, inputStyle]}
                      value={day.end}
                      onChangeText={(end) => updateDay(day.id, { end })}
                      maxLength={5}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>

                  <Text style={[styles.label, { color: theme.textMuted }]}>Intervalo</Text>
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.time, inputStyle]}
                      value={day.lunchStart}
                      onChangeText={(lunchStart) => updateDay(day.id, { lunchStart })}
                      maxLength={5}
                      keyboardType="numbers-and-punctuation"
                    />
                    <Text style={{ color: theme.textMuted }}>ate</Text>
                    <TextInput
                      style={[styles.time, inputStyle]}
                      value={day.lunchEnd}
                      onChangeText={(lunchEnd) => updateDay(day.id, { lunchEnd })}
                      maxLength={5}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>

                  <Text style={[styles.label, { color: theme.textMuted }]}>Duracao media</Text>
                  <View style={styles.durationRow}>
                    {SLOT_OPTIONS.map((option) => {
                      const selected = day.slotDuration === option;
                      return (
                        <TouchableOpacity
                          key={`${day.id}-${option}`}
                          style={[styles.durationChip, selected && styles.durationChipActive]}
                          onPress={() => updateDay(day.id, { slotDuration: option })}
                        >
                          <Text style={[styles.durationText, selected && styles.durationTextActive]}>{option} min</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.label, { color: theme.textMuted }]}>Limite diario</Text>
                  <TextInput
                    style={[styles.limit, inputStyle]}
                    value={String(day.dailyLimit)}
                    onChangeText={(value) => updateDay(day.id, { dailyLimit: Number(value) || 0 })}
                    keyboardType="number-pad"
                  />
                </>
              ) : (
                <Text style={[styles.offText, { color: theme.textMuted }]}>Este dia fica fechado para novas solicitacoes.</Text>
              )}
            </View>
          ))}

          <TouchableOpacity style={[styles.save, saving && styles.disabled]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Save size={18} color="#FFFFFF" />}
            <Text style={styles.saveText}>Salvar disponibilidade</Text>
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Bloqueios</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.row}>
              <TextInput
                style={[styles.date, inputStyle]}
                placeholder="Inicio AAAA-MM-DD"
                placeholderTextColor={theme.textMuted}
                value={draft.startDate}
                onChangeText={(startDate) => setDraft((current) => ({ ...current, startDate }))}
              />
              <TextInput
                style={[styles.date, inputStyle]}
                placeholder="Fim AAAA-MM-DD"
                placeholderTextColor={theme.textMuted}
                value={draft.endDate}
                onChangeText={(endDate) => setDraft((current) => ({ ...current, endDate }))}
              />
            </View>
            <View style={styles.types}>
              {(["folga", "ferias", "feriado"] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, draft.type === type && styles.chipActive]}
                  onPress={() => setDraft((current) => ({ ...current, type }))}
                >
                  <Text style={[styles.chipText, draft.type === type && styles.chipTextActive]}>
                    {type === "ferias" ? "Ferias" : type[0].toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.date, inputStyle]}
              placeholder="Motivo (opcional)"
              placeholderTextColor={theme.textMuted}
              value={draft.reason}
              onChangeText={(reason) => setDraft((current) => ({ ...current, reason }))}
            />
            <TouchableOpacity style={styles.add} onPress={addTimeOff}>
              <Plus size={17} color="#FFFFFF" />
              <Text style={styles.saveText}>Adicionar periodo</Text>
            </TouchableOpacity>
          </View>

          {timeOff.map((item) => (
            <View key={item.id} style={[styles.timeOff, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dayName, { color: theme.textPrimary }]}>
                  {item.type === "ferias" ? "Ferias" : item.type[0].toUpperCase() + item.type.slice(1)}
                </Text>
                <Text style={[styles.offText, { color: theme.textMuted }]}>
                  {item.startDate} ate {item.endDate}{item.reason ? ` • ${item.reason}` : ""}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeTimeOff(item)}>
                <Trash2 size={19} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  headerButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, alignItems: "center" },
  title: { fontSize: 19, fontWeight: "900" },
  subtitle: { fontSize: 11, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 42 },
  intro: { borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  introCopy: { flex: 1 },
  introTitle: { fontSize: 15, fontWeight: "900" },
  introText: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: "900", marginTop: 22, marginBottom: 10 },
  previewCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 9 },
  previewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  previewDay: { fontSize: 14, fontWeight: "900" },
  previewMeta: { fontSize: 11, marginTop: 3, fontWeight: "700" },
  slotWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  slot: { minWidth: 66, minHeight: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, borderWidth: 1 },
  slotText: { fontSize: 12, fontWeight: "900" },
  slotFree: { backgroundColor: "#ECFDF5", borderColor: "#BBF7D0" },
  slotBusy: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  slotLimit: { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" },
  slotFreeText: { color: "#15803D" },
  slotBusyText: { color: "#B91C1C" },
  slotLimitText: { color: "#475569" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4, marginBottom: 2 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  legendText: { fontSize: 11, fontWeight: "800" },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 9 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  dayName: { fontSize: 14, fontWeight: "900" },
  dayMeta: { fontSize: 11, marginTop: 3 },
  label: { fontSize: 11, fontWeight: "800", marginTop: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  time: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 11, textAlign: "center", fontWeight: "800" },
  limit: { width: 88, minHeight: 42, borderWidth: 1, borderRadius: 11, textAlign: "center", fontWeight: "800", marginTop: 6 },
  offText: { fontSize: 11, marginTop: 8, lineHeight: 16 },
  durationRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 },
  durationChip: { minHeight: 34, borderRadius: 10, backgroundColor: "#E2E8F0", paddingHorizontal: 11, alignItems: "center", justifyContent: "center" },
  durationChipActive: { backgroundColor: "#FF8700" },
  durationText: { color: "#475569", fontSize: 11, fontWeight: "900" },
  durationTextActive: { color: "#FFFFFF" },
  save: { minHeight: 50, borderRadius: 15, backgroundColor: "#FF8700", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 8 },
  disabled: { opacity: 0.6 },
  saveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  date: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 11, paddingHorizontal: 10, marginTop: 7 },
  types: { flexDirection: "row", gap: 7, marginTop: 12 },
  chip: { borderRadius: 999, backgroundColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: "#FF8700" },
  chipText: { color: "#475569", fontSize: 11, fontWeight: "800" },
  chipTextActive: { color: "#FFFFFF" },
  add: { minHeight: 44, borderRadius: 12, backgroundColor: "#FF8700", flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", marginTop: 12 },
  timeOff: { flexDirection: "row", alignItems: "center", padding: 13, borderRadius: 14, borderWidth: 1, marginTop: 8 },
});
