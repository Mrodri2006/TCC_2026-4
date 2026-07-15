import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowLeft, Calendar, Clock, FileText, MapPin } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { auth, firestore, functions } from "../firebase";
import firebase from "firebase/compat/app";
import { useTheme } from "../theme/ThemeContext";

type AgendaSlot = {
  horario: string;
  status: "disponivel" | "ocupado" | "limite";
};

type AvailabilityDay = {
  enabled: boolean;
  start: string;
  end: string;
  lunchStart: string;
  lunchEnd: string;
  dailyLimit: number;
  slotDuration: number;
};

const DEFAULT_AVAILABILITY: AvailabilityDay[] = [
  { enabled: false, start: "08:00", end: "18:00", lunchStart: "12:00", lunchEnd: "13:00", dailyLimit: 0, slotDuration: 60 },
  { enabled: true, start: "08:00", end: "18:00", lunchStart: "12:00", lunchEnd: "13:00", dailyLimit: 4, slotDuration: 60 },
  { enabled: true, start: "08:00", end: "18:00", lunchStart: "12:00", lunchEnd: "13:00", dailyLimit: 4, slotDuration: 60 },
  { enabled: true, start: "08:00", end: "18:00", lunchStart: "12:00", lunchEnd: "13:00", dailyLimit: 4, slotDuration: 60 },
  { enabled: true, start: "08:00", end: "18:00", lunchStart: "12:00", lunchEnd: "13:00", dailyLimit: 4, slotDuration: 60 },
  { enabled: true, start: "08:00", end: "18:00", lunchStart: "12:00", lunchEnd: "13:00", dailyLimit: 4, slotDuration: 60 },
  { enabled: false, start: "08:00", end: "13:00", lunchStart: "12:00", lunchEnd: "13:00", dailyLimit: 2, slotDuration: 60 },
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDateBr = (date: Date) =>
  `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

const formatDateIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const parseBrazilianDate = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || ""));
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  if (date.getFullYear() !== Number(match[3]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[1])) return null;
  return date;
};

const toMinutes = (value: string) => {
  if (!validTime(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

const normalizeAvailability = (dayIndex: number, stored?: any): AvailabilityDay => {
  const base = DEFAULT_AVAILABILITY[dayIndex] || DEFAULT_AVAILABILITY[0];
  const slotDuration = Number(stored?.slotDuration || stored?.slotInterval || base.slotDuration);
  const dailyLimit = Number(stored?.dailyLimit ?? base.dailyLimit);
  return {
    enabled: stored?.enabled === undefined ? base.enabled : stored.enabled === true,
    start: validTime(String(stored?.start || "")) ? String(stored.start) : base.start,
    end: validTime(String(stored?.end || "")) ? String(stored.end) : base.end,
    lunchStart: validTime(String(stored?.lunchStart || "")) ? String(stored.lunchStart) : base.lunchStart,
    lunchEnd: validTime(String(stored?.lunchEnd || "")) ? String(stored.lunchEnd) : base.lunchEnd,
    dailyLimit: Number.isFinite(dailyLimit) ? dailyLimit : base.dailyLimit,
    slotDuration: Number.isFinite(slotDuration) ? slotDuration : base.slotDuration,
  };
};

const buildSlots = (availability: AvailabilityDay) => {
  if (!availability.enabled) return [];
  const start = toMinutes(availability.start);
  const end = toMinutes(availability.end);
  const lunchStart = toMinutes(availability.lunchStart);
  const lunchEnd = toMinutes(availability.lunchEnd);
  if (start === null || end === null || start >= end) return [];

  const slots: string[] = [];
  for (let current = start; current + availability.slotDuration <= end; current += availability.slotDuration) {
    const crossesLunch = lunchStart !== null && lunchEnd !== null && lunchStart < lunchEnd && current < lunchEnd && current + availability.slotDuration > lunchStart;
    if (!crossesLunch) slots.push(minutesToTime(current));
  }
  return slots;
};

const canFallbackFromFunction = (error: any) => {
  const code = String(error?.code || "");
  return code.includes("not-found") || code.includes("unavailable") || code.includes("internal");
};

export default function SolicitarServico() {
  const navigation = useNavigation<any>();
  const route = useRoute() as any;
  const { prestadorId, prestadorNome, servico } = route.params || {};
  const { theme } = useTheme();
  const serviceTitle = String(servico || "Serviço");

  const dateOptions = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => {
        const date = addDays(new Date(), index);
        return {
          data: formatDateBr(date),
          isoDate: formatDateIso(date),
          weekday: WEEKDAYS[date.getDay()],
          day: String(date.getDate()).padStart(2, "0"),
          month: String(date.getMonth() + 1).padStart(2, "0"),
        };
      }),
    []
  );

  const [data, setData] = useState(dateOptions[0]?.data || "");
  const [horario, setHorario] = useState("");
  const [local, setLocal] = useState("");
  const [descricao, setDescricao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [carregandoAgenda, setCarregandoAgenda] = useState(false);
  const [slots, setSlots] = useState<AgendaSlot[]>([]);
  const [agendaMessage, setAgendaMessage] = useState("");
  const [fallbackAgenda, setFallbackAgenda] = useState(false);

  useEffect(() => {
    carregarAgenda(data);
  }, [data, prestadorId]);

  const applySlots = (nextSlots: AgendaSlot[], message = "", fallback = false) => {
    setSlots(nextSlots);
    setAgendaMessage(message);
    setFallbackAgenda(fallback);
    setHorario((current) => {
      if (nextSlots.some((slot) => slot.status === "disponivel" && slot.horario === current)) return current;
      return nextSlots.find((slot) => slot.status === "disponivel")?.horario || "";
    });
  };

  const carregarAgendaLocal = async (selectedDate: string, originalError?: any) => {
    const date = parseBrazilianDate(selectedDate);
    if (!prestadorId || !date) {
      applySlots([], "Não foi possível carregar os horários.", true);
      return;
    }

    try {
      const [availabilityDoc, unavailableSnapshot] = await Promise.all([
        firestore.collection("Usuario").doc(prestadorId).collection("Disponibilidade").doc(String(date.getDay())).get(),
        firestore.collection("Usuario").doc(prestadorId).collection("Indisponibilidades").get(),
      ]);
      const availability = normalizeAvailability(date.getDay(), availabilityDoc.exists ? availabilityDoc.data() : undefined);
      const isoDate = formatDateIso(date);
      const blocked = unavailableSnapshot.docs.some((doc) => {
        const item = doc.data() || {};
        return String(item.startDate || "") <= isoDate && String(item.endDate || "") >= isoDate;
      });

      if (blocked || !availability.enabled) {
        applySlots([], "Este prestador nao atende nessa data.", true);
        return;
      }

      applySlots(
        buildSlots(availability).map((time) => ({ horario: time, status: "disponivel" })),
        canFallbackFromFunction(originalError) ? "Horários ocupados serão confirmados ao solicitar." : "",
        true
      );
    } catch {
      applySlots([], "Não foi possível carregar a agenda do prestador.", true);
    }
  };

  const carregarAgenda = async (selectedDate: string) => {
    if (!prestadorId || !selectedDate) return;
    setCarregandoAgenda(true);
    try {
      const response: any = await functions.httpsCallable("obterAgendaPrestador")({ prestadorId, data: selectedDate });
      const result = response.data || {};
      const nextSlots = Array.isArray(result.slots) ? result.slots : [];
      const message =
        result.reason === "fechado"
          ? "Este prestador nao atende nesse dia."
          : result.reason === "indisponivel"
            ? "Este prestador bloqueou essa data."
            : result.reason === "limite"
              ? "Limite de serviços atingido nessa data."
              : "";
      applySlots(nextSlots, message, false);
    } catch (error: any) {
      if (canFallbackFromFunction(error)) {
        await carregarAgendaLocal(selectedDate, error);
      } else {
        applySlots([], error?.message?.replace(/^.*?:\s*/, "") || "Não foi possível carregar a agenda.", false);
      }
    } finally {
      setCarregandoAgenda(false);
    }
  };

  const salvarSemFunctions = async () => {
    const usuarioLogado = auth.currentUser?.uid;
    if (!usuarioLogado) throw new Error("Usuário não autenticado");
    const date = parseBrazilianDate(data);
    if (!date || !validTime(horario)) throw new Error("Informe data e horário válidos");

    const [availabilityDoc, unavailableSnapshot, clienteSnapshot] = await Promise.all([
      firestore.collection("Usuario").doc(prestadorId).collection("Disponibilidade").doc(String(date.getDay())).get(),
      firestore.collection("Usuario").doc(prestadorId).collection("Indisponibilidades").get(),
      firestore.collection("Usuario").doc(usuarioLogado).get(),
    ]);

    const availability = normalizeAvailability(date.getDay(), availabilityDoc.exists ? availabilityDoc.data() : undefined);
    const allowedSlots = buildSlots(availability);
    const isoDate = formatDateIso(date);
    const blocked = unavailableSnapshot.docs.some((doc) => {
      const item = doc.data() || {};
      return String(item.startDate || "") <= isoDate && String(item.endDate || "") >= isoDate;
    });

    if (blocked || !availability.enabled || !allowedSlots.includes(horario)) {
      throw new Error("Escolha um horário disponível na agenda do prestador");
    }

    const nomeCliente = String(clienteSnapshot.data()?.nome || auth.currentUser?.displayName || "Cliente").trim();
    const ref = firestore.collection("ServicosAgendados").doc(prestadorId).collection("ServicoStatus").doc();
    const reservationKey = `${data.replace(/\D/g, "")}_${horario.replace(":", "")}`;
    const payload = {
      id: ref.id,
      estilo: serviceTitle,
      tipo: serviceTitle,
      data,
      horario,
      local: local.trim(),
      descricao: descricao.trim(),
      status: "aguardando",
      clienteId: usuarioLogado,
      nomeCliente,
      prestadorId,
      prestadorNome,
      reservationKey,
      duracaoMinutos: availability.slotDuration,
      dataSolicitacao: firebase.firestore.FieldValue.serverTimestamp(),
      criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const batch = firestore.batch();
    batch.set(ref, payload);
    batch.set(firestore.collection("ServicosClientes").doc(usuarioLogado).collection("ServicoStatus").doc(ref.id), payload);
    await batch.commit();
  };

  const salvarSolicitacao = async () => {
    if (!data || !horario || !local.trim()) {
      Alert.alert("Erro", "Escolha data, horário e informe o local.");
      return;
    }

    const selectedSlot = slots.find((slot) => slot.horario === horario);
    if (selectedSlot && selectedSlot.status !== "disponivel") {
      Alert.alert("Horário indisponível", "Escolha um horário livre.");
      return;
    }

    setCarregando(true);
    try {
      try {
        await functions.httpsCallable("criarSolicitacaoServico")({
          prestadorId,
          prestadorNome,
          servico: serviceTitle,
          data,
          horario,
          local,
          descricao,
        });
      } catch (functionError: any) {
        if (!canFallbackFromFunction(functionError)) throw functionError;
        await salvarSemFunctions();
      }

      Alert.alert("Sucesso!", `Serviço solicitado com sucesso para ${prestadorNome}`, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (erro: any) {
      console.error("Erro ao solicitar serviço:", erro);
      Alert.alert("Não foi possível solicitar", erro?.message?.replace(/^.*?:\s*/, "") || "Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  const availableCount = slots.filter((slot) => slot.status === "disponivel").length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F2937" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Solicitar Serviço</Text>
        <View style={{ width: 42 }} />
      </View>

      <View style={styles.cardPrestador}>
        <View style={styles.avatarPrestador}>
          <Text style={styles.avatarTexto}>{String(prestadorNome || "P").charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.infoPrestador}>
          <Text style={styles.nomePrestador}>{prestadorNome || "Prestador"}</Text>
          <View style={styles.profissaoBadge}>
            <Text style={styles.profissaoTexto}>{serviceTitle}</Text>
          </View>
        </View>
      </View>

      <View style={styles.formulario}>
        <View style={styles.sectionHeader}>
          <Calendar size={17} color="#FF8700" />
          <Text style={styles.sectionTitle}>Escolha o dia</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateList}>
          {dateOptions.map((option) => {
            const selected = option.data === data;
            return (
              <TouchableOpacity
                key={option.data}
                style={[styles.dateChip, selected && styles.dateChipActive]}
                onPress={() => setData(option.data)}
                activeOpacity={0.85}
                disabled={carregando}
              >
                <Text style={[styles.dateWeekday, selected && styles.dateTextActive]}>{option.weekday}</Text>
                <Text style={[styles.dateDay, selected && styles.dateTextActive]}>{option.day}/{option.month}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Clock size={17} color="#FF8700" />
          <Text style={styles.sectionTitle}>Horários</Text>
          {!carregandoAgenda && <Text style={styles.sectionCounter}>{availableCount} livres</Text>}
        </View>

        {carregandoAgenda ? (
          <View style={styles.loadingAgenda}>
            <ActivityIndicator color="#FF8700" />
            <Text style={styles.loadingText}>Carregando agenda...</Text>
          </View>
        ) : slots.length > 0 ? (
          <View style={styles.slotGrid}>
            {slots.map((slot) => {
              const selected = slot.horario === horario;
              const disabled = slot.status !== "disponivel" || carregando;
              return (
                <TouchableOpacity
                  key={slot.horario}
                  style={[
                    styles.slotButton,
                    slot.status === "ocupado" ? styles.slotBusy : slot.status === "limite" ? styles.slotLimit : styles.slotFree,
                    selected && styles.slotSelected,
                  ]}
                  onPress={() => setHorario(slot.horario)}
                  disabled={disabled}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.slotText,
                      slot.status === "ocupado" ? styles.slotBusyText : slot.status === "limite" ? styles.slotLimitText : styles.slotFreeText,
                      selected && styles.slotSelectedText,
                    ]}
                  >
                    {slot.horario}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyAgenda}>
            <Text style={styles.emptyTitle}>{agendaMessage || "Nenhum horário disponível"}</Text>
          </View>
        )}

        {!!agendaMessage && slots.length > 0 && (
          <Text style={styles.hint}>{fallbackAgenda ? agendaMessage : agendaMessage}</Text>
        )}

        <View style={styles.campoGrupo}>
          <Text style={styles.label}>
            <MapPin size={16} color="#0F2937" /> Local do Serviço *
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Rua, numero, bairro..."
            placeholderTextColor="#94A3B8"
            value={local}
            onChangeText={setLocal}
            editable={!carregando}
          />
        </View>

        <View style={styles.campoGrupo}>
          <Text style={styles.label}>
            <FileText size={16} color="#0F2937" /> Descricao (opcional)
          </Text>
          <TextInput
            style={[styles.input, styles.inputLongo]}
            placeholder="Descreva detalhes do serviço desejado..."
            placeholderTextColor="#94A3B8"
            value={descricao}
            onChangeText={setDescricao}
            multiline
            numberOfLines={4}
            editable={!carregando}
          />
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>Data: {data || "-"}</Text>
          <Text style={styles.summaryText}>Horário: {horario || "-"}</Text>
        </View>

        <View style={styles.botoes}>
          <TouchableOpacity style={[styles.botao, styles.botaoCancelar]} onPress={() => navigation.goBack()} disabled={carregando}>
            <Text style={styles.botaoTexto}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botao, styles.botaoConfirmar, carregando && styles.botaoDesabilitado]}
            onPress={salvarSolicitacao}
            disabled={carregando}
          >
            <Text style={[styles.botaoTexto, styles.botaoTextoConfirmar]}>
              {carregando ? "Solicitando..." : "Solicitar Serviço"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 34 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4E5",
    borderRadius: 24,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#0F2937",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  backButton: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  titulo: { fontSize: 21, fontWeight: "900", color: "#0F2937", flex: 1, textAlign: "center" },
  cardPrestador: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#FF8700",
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  avatarPrestador: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FF8700", justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarTexto: { color: "#fff", fontSize: 18, fontWeight: "800" },
  infoPrestador: { flex: 1 },
  nomePrestador: { fontSize: 16, fontWeight: "900", color: "#0F2937", marginBottom: 6 },
  profissaoBadge: { alignSelf: "flex-start", backgroundColor: "rgba(255, 135, 0, 0.12)", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  profissaoTexto: { fontSize: 12, color: "#E86F00", fontWeight: "800" },
  formulario: {
    marginBottom: 30,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: "#0F2937", flex: 1 },
  sectionCounter: { fontSize: 12, color: "#64748B", fontWeight: "800" },
  dateList: { gap: 8, paddingBottom: 14 },
  dateChip: { width: 76, minHeight: 64, borderRadius: 16, borderWidth: 1, borderColor: "rgba(15, 41, 55, 0.10)", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  dateChipActive: { backgroundColor: "#FF8700", borderColor: "#FF8700" },
  dateWeekday: { fontSize: 12, color: "#64748B", fontWeight: "800" },
  dateDay: { fontSize: 16, color: "#0F2937", fontWeight: "900", marginTop: 4 },
  dateTextActive: { color: "#FFFFFF" },
  loadingAgenda: { minHeight: 84, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 8, color: "#64748B", fontSize: 12, fontWeight: "700" },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  slotButton: { minWidth: 76, minHeight: 42, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  slotText: { fontSize: 13, fontWeight: "900" },
  slotFree: { backgroundColor: "#ECFDF5", borderColor: "#BBF7D0" },
  slotBusy: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  slotLimit: { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" },
  slotSelected: { backgroundColor: "#FF8700", borderColor: "#FF8700" },
  slotFreeText: { color: "#15803D" },
  slotBusyText: { color: "#B91C1C" },
  slotLimitText: { color: "#475569" },
  slotSelectedText: { color: "#FFFFFF" },
  emptyAgenda: { minHeight: 70, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(15, 41, 55, 0.14)", alignItems: "center", justifyContent: "center", paddingHorizontal: 12, marginBottom: 10 },
  emptyTitle: { fontSize: 13, color: "#64748B", fontWeight: "800", textAlign: "center" },
  campoGrupo: { marginTop: 14 },
  label: { fontSize: 14, fontWeight: "800", color: "#0F2937", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "rgba(15, 41, 55, 0.12)", borderRadius: 14, padding: 12, fontSize: 14, color: "#0F2937", backgroundColor: "#F8FAFC" },
  inputLongo: { textAlignVertical: "top", paddingTop: 12, minHeight: 100 },
  hint: { fontSize: 12, color: "#64748B", marginTop: 2, marginBottom: 8, lineHeight: 17 },
  summary: { borderRadius: 15, backgroundColor: "#F8FAFC", padding: 12, marginTop: 16, gap: 5 },
  summaryText: { color: "#0F2937", fontSize: 13, fontWeight: "800" },
  botoes: { flexDirection: "row", marginTop: 20 },
  botao: { flex: 1, paddingVertical: 14, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  botaoCancelar: { marginRight: 12, backgroundColor: "rgba(15, 41, 55, 0.06)", borderWidth: 1, borderColor: "rgba(15, 41, 55, 0.12)" },
  botaoConfirmar: { backgroundColor: "#FF8700" },
  botaoTexto: { fontSize: 14, fontWeight: "900", color: "#0F2937" },
  botaoTextoConfirmar: { color: "#fff" },
  botaoDesabilitado: { opacity: 0.6 },
});
