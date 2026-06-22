import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DrawerActions, useFocusEffect, useNavigation } from "@react-navigation/native";
import { Calendar, ChevronLeft, Download, Menu } from "lucide-react-native";
import Svg, { Rect } from "react-native-svg";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";
import { printToFileAsync } from "expo-print";
import { shareAsync } from "expo-sharing";

type Summary = {
  realizados: number;
  ganhos: number;
  porDia: { label: string; count: number; ganhos: number }[];
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeekMonday(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // Monday=0
  x.setDate(x.getDate() - diff);
  return x;
}

function currencyBRL(value: number) {
  try {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

function parseValor(valor: any): number {
  if (typeof valor === "number") return valor;
  const s = String(valor ?? "").trim();
  if (!s) return 0;
  const cleaned = s
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export default function RelatoriosPrestador() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const unsubscribeRef = useRef<null | (() => void)>(null);

  const [carregando, setCarregando] = useState(true);
  const [summary, setSummary] = useState<Summary>({
    realizados: 0,
    ganhos: 0,
    porDia: [],
  });

  const [dataPickerTipo, setDataPickerTipo] = useState<"inicio" | "fim" | null>(null);
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);

  const [dataInicio, setDataInicio] = useState(() => {
    const now = new Date();
    return startOfWeekMonday(now);
  });
  const [dataFim, setDataFim] = useState(() => endOfDay(new Date()));

  const { rangeStart, rangeEnd, rangeTitle, quantidadeDias } = useMemo(() => {
    const start = startOfDay(dataInicio);
    const end = endOfDay(dataFim);
    const dias = Math.max(
      1,
      Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
    );
    const title = `${start.toLocaleDateString("pt-BR")} — ${end.toLocaleDateString("pt-BR")}`;
    return { rangeStart: start, rangeEnd: end, rangeTitle: title, quantidadeDias: dias };
  }, [dataInicio, dataFim]);

  const abrirSeletorData = (tipo: "inicio" | "fim") => {
    setDataPickerTipo(tipo);
    setMostrarDatePicker(true);
  };

  const confirmarData = (selecionada: Date) => {
    const nova = startOfDay(selecionada);
    if (dataPickerTipo === "inicio") {
      if (nova > dataFim) {
        Alert.alert("Período inválido", "A data inicial não pode ser maior que a data final.");
        return;
      }
      setDataInicio(nova);
      return;
    }

    if (nova < dataInicio) {
      Alert.alert("Período inválido", "A data final não pode ser menor que a data inicial.");
      return;
    }
    setDataFim(endOfDay(nova));
  };

  const resetarUltimos7Dias = () => {
    const now = new Date();
    const start = startOfWeekMonday(now);
    setDataInicio(start);
    setDataFim(endOfDay(now));
  };

  const carregar = useCallback(() => {
    const usuarioId = auth.currentUser?.uid;
    if (!usuarioId) {
      setCarregando(false);
      return;
    }

    setCarregando(true);

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const ref = firestore
      .collection("ServicosAgendados")
      .doc(usuarioId)
      .collection("ServicoStatus");

    unsubscribeRef.current = ref.onSnapshot(
      (snapshot) => {
        const map = new Map<string, { label: string; count: number; ganhos: number }>();
        let totalRealizados = 0;
        let totalGanhos = 0;

        const base = new Date(rangeStart);
        const days = quantidadeDias;

        for (let i = 0; i < days; i++) {
          const d = new Date(base);
          d.setDate(base.getDate() + i);
          const key = startOfDay(d).toISOString();
          const label = d.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          });
          map.set(key, { label, count: 0, ganhos: 0 });
        }

        snapshot.forEach((doc) => {
          const data: any = doc.data();
          const status = String(data.status ?? "").toLowerCase();
          const isRealizado = status === "realizado" || status === "finalizado" || status === "concluido" || status === "concluído";
          if (!isRealizado) return;

          const whenRaw = data.dataFinalizado || data.dataRealizado || data.dataAceito;
          const when: Date | null =
            whenRaw?.toDate?.() instanceof Date ? whenRaw.toDate() : whenRaw instanceof Date ? whenRaw : null;
          const whenSafe = when ?? new Date();

          if (whenSafe < rangeStart || whenSafe > rangeEnd) return;

          const key = startOfDay(whenSafe).toISOString();
          const current = map.get(key);
          if (!current) return;

          const v = parseValor(data.valor);
          current.count += 1;
          current.ganhos += v;
          map.set(key, current);

          totalRealizados += 1;
          totalGanhos += v;
        });

        setSummary({
          realizados: totalRealizados,
          ganhos: totalGanhos,
          porDia: Array.from(map.values()),
        });
        setCarregando(false);
      },
      (err) => {
        console.log("Erro ao carregar relatórios:", err);
        setCarregando(false);
      }
    );
  }, [rangeStart, rangeEnd, quantidadeDias]);

  useFocusEffect(
    useCallback(() => {
      carregar();
      return () => {
        if (unsubscribeRef.current) unsubscribeRef.current();
      };
    }, [carregar])
  );

  const exportarPDF = async () => {
    try {
      const htmlRows = summary.porDia
        .map(
          (d) =>
            `<tr><td>${d.label}</td><td style="text-align:right">${d.count}</td><td style="text-align:right">${currencyBRL(
              d.ganhos
            )}</td></tr>`
        )
        .join("");

      const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, Segoe UI, Roboto, Arial; padding: 24px; color: #0F2937; }
            .title { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
            .sub { color: #64748B; margin-bottom: 16px; }
            .cards { display: flex; gap: 12px; margin-bottom: 18px; }
            .card { flex: 1; border: 1px solid #E2E8F0; border-radius: 14px; padding: 12px; background: #fff; }
            .label { font-size: 12px; color: #64748B; font-weight: 700; }
            .value { font-size: 18px; font-weight: 900; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border-bottom: 1px solid #E2E8F0; padding: 10px 6px; font-size: 13px; }
            th { text-align: left; color: #64748B; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="title">Relatório por período</div>
          <div class="sub">${rangeTitle}</div>
          <div class="cards">
            <div class="card">
              <div class="label">Serviços realizados</div>
              <div class="value">${summary.realizados}</div>
            </div>
            <div class="card">
              <div class="label">Ganhos</div>
              <div class="value">${currencyBRL(summary.ganhos)}</div>
            </div>
          </div>
          <div class="label">Resumo por dia</div>
          <table>
            <thead>
              <tr><th>Dia</th><th style="text-align:right">Qtd.</th><th style="text-align:right">Ganhos</th></tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>
        </body>
      </html>`;

      const file = await printToFileAsync({ html, base64: false });
      await shareAsync(file.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
    } catch (err) {
      console.log("Erro ao exportar PDF:", err);
      Alert.alert("Erro", "Não foi possível exportar o PDF. Verifique se o `expo-print` está instalado.");
    }
  };

  const max = Math.max(1, ...summary.porDia.map((d) => d.count));

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => {
              const anyNav = navigation as any;
              if (typeof anyNav?.openDrawer === "function") {
                anyNav.openDrawer();
                return;
              }
              anyNav?.dispatch?.(DrawerActions.openDrawer());
            }}
          >
            <Menu size={22} color="#0F2937" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Relatórios</Text>

          <TouchableOpacity style={styles.headerIcon} onPress={exportarPDF}>
            <Download size={22} color="#0F2937" />
          </TouchableOpacity>
        </View>

        <View style={styles.rangeRow}>
          <Calendar size={16} color="#64748B" />
          <Text style={styles.rangeText}>{rangeTitle}</Text>
        </View>
        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>Filtrar datas</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={styles.filterDateButton}
              activeOpacity={0.85}
              onPress={() => abrirSeletorData("inicio")}
            >
              <Text style={styles.filterDateLabel}>De</Text>
              <Text style={styles.filterDateValue}>
                {dataInicio.toLocaleDateString("pt-BR")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterDateButton}
              activeOpacity={0.85}
              onPress={() => abrirSeletorData("fim")}
            >
              <Text style={styles.filterDateLabel}>Até</Text>
              <Text style={styles.filterDateValue}>{dataFim.toLocaleDateString("pt-BR")}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.quickButton} onPress={resetarUltimos7Dias} activeOpacity={0.85}>
            <Text style={styles.quickButtonText}>Últimos 7 dias</Text>
          </TouchableOpacity>
        </View>

        {carregando ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Calculando desempenho...</Text>
          </View>
        ) : (
          <>
            <View style={styles.kpisRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Serviços realizados</Text>
                <Text style={styles.kpiValue}>{summary.realizados}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Ganhos</Text>
                <Text style={styles.kpiValue}>{currencyBRL(summary.ganhos)}</Text>
              </View>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Desempenho</Text>
              <Text style={styles.chartSub}>Quantidade de serviços por dia no período</Text>

              <View style={styles.chartWrap}>
                <Svg width="100%" height="140" viewBox="0 0 320 140">
                  {summary.porDia.map((d, i) => {
                    const barW = 320 / summary.porDia.length;
                    const h = Math.round((d.count / max) * 100);
                    const x = i * barW + 6;
                    const y = 130 - h;
                    return (
                      <Rect
                        key={`${d.label}-${i}`}
                        x={x}
                        y={y}
                        width={Math.max(8, barW - 12)}
                        height={h}
                        rx={6}
                        fill={d.count === 0 ? "rgba(37, 99, 235, 0.18)" : "#2563EB"}
                      />
                    );
                  })}
                </Svg>
                <View style={styles.chartLabels}>
                  {summary.porDia.map((d, i) => (
                    <Text key={`${d.label}-${i}`} style={styles.chartLabel} numberOfLines={1}>
                      {d.label}
                    </Text>
                  ))}
                </View>
              </View>

              <TouchableOpacity activeOpacity={0.9} style={styles.exportBtn} onPress={exportarPDF}>
                <Download size={18} color="#fff" />
                <Text style={styles.exportText}>Exportar PDF (período)</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
      <DateTimePickerModal
        isVisible={mostrarDatePicker}
        mode="date"
        date={dataPickerTipo === "inicio" ? dataInicio : dataFim}
        onConfirm={(date) => {
          confirmarData(date);
          setMostrarDatePicker(false);
          setDataPickerTipo(null);
        }}
        onCancel={() => {
          setMostrarDatePicker(false);
          setDataPickerTipo(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: Platform.OS === "android" ? 10 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "android" ? 16 : 10,
    paddingBottom: 10,
    marginTop: 40,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 41, 55, 0.06)",
  },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#0F2937" },

  rangeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  rangeText: { color: "#64748B", fontWeight: "700" },
  filterCard: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 41, 55, 0.08)",
  },
  filterTitle: { color: "#0F2937", fontWeight: "800", fontSize: 13, marginBottom: 10 },
  filterRow: { flexDirection: "row", gap: 10 },
  filterDateButton: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  filterDateLabel: { color: "#64748B", fontWeight: "700", fontSize: 12 },
  filterDateValue: { color: "#0F2937", fontWeight: "800", fontSize: 14, marginTop: 4 },
  quickButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  quickButtonText: { color: "#1D4ED8", fontWeight: "800", fontSize: 12 },

  loading: { alignItems: "center", paddingVertical: 40 },
  loadingText: { marginTop: 10, color: "#64748B", fontWeight: "700" },

  kpisRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  kpiCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 41, 55, 0.08)",
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2,
  },
  kpiLabel: { fontSize: 12, color: "#64748B", fontWeight: "800" },
  kpiValue: { marginTop: 6, fontSize: 20, color: "#0F2937", fontWeight: "900" },

  chartCard: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 41, 55, 0.06)",
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2,
  },
  chartTitle: { fontSize: 16, fontWeight: "900", color: "#0F2937" },
  chartSub: { marginTop: 4, fontSize: 12, color: "#64748B", fontWeight: "700" },
  chartWrap: { marginTop: 12 },
  chartLabels: { flexDirection: "row", marginTop: 6 },
  chartLabel: { flex: 1, textAlign: "center", fontSize: 10, color: "#64748B", fontWeight: "700" },

  exportBtn: {
    marginTop: 14,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  exportText: { color: "#fff", fontWeight: "900", fontSize: 13 },
});
