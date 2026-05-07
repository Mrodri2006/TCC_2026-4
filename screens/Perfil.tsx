import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { ArrowLeft, Edit2, MapPin, Phone, Mail, LogOut } from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { auth, firestore } from "../firebase";
import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Perfil() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [usuario, setUsuario] = useState({
    nome: "",
    email: "",
    telefone: "",
    localizacao: "São Paulo, SP",
  });
  const [historico, setHistorico] = useState<any[]>([]);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const carregarDadosUsuario = async () => {
        try {
          const usuarioAutenticado = auth.currentUser;
          if (usuarioAutenticado) {
            const docSnap = await firestore.collection("Usuario").doc(usuarioAutenticado.uid).get();
            if (docSnap.exists) {
              const dados = docSnap.data();
              setUsuario((prevState) => ({
                ...prevState,
                nome: dados.nome || usuarioAutenticado.displayName || "Usuário",
                email: usuarioAutenticado.email || "",
                telefone: dados.fone || "",
                localizacao: dados.localizacao || prevState.localizacao,
              }));
            } else {
              setUsuario((prevState) => ({
                ...prevState,
                nome: usuarioAutenticado.displayName || "Usuário",
                email: usuarioAutenticado.email || "",
              }));
            }

            const servicosSnap = await firestore
              .collection("ServicosClientes")
              .doc(usuarioAutenticado.uid)
              .collection("ServicoStatus")
              .where("status", "==", "realizado")
              .get();

            const formatDate = (value: any) => {
              if (!value) return "Data não informada";
              if (value?.seconds) return new Date(value.seconds * 1000).toLocaleDateString("pt-BR");
              if (value instanceof Date) return value.toLocaleDateString("pt-BR");
              return String(value);
            };

            const getTimestamp = (value: any) => {
              if (!value) return 0;
              if (value?.seconds) return value.seconds * 1000;
              if (value instanceof Date) return value.getTime();
              if (typeof value === "number") return value;
              const parsed = Date.parse(String(value));
              return Number.isNaN(parsed) ? 0 : parsed;
            };

            const listaHistorico = servicosSnap.docs
              .map((doc) => {
                const data = doc.data();
                const dataFinalizado =
                  data.dataFinalizado || data.data || data.dataSolicitacao;
                return {
                  id: doc.id,
                  servico: data.titulo || data.estilo || data.tipo || "Serviço",
                  data:
                    formatDate(data.dataFinalizado) ||
                    formatDate(data.data) ||
                    formatDate(data.dataSolicitacao) ||
                    "Data não informada",
                  status: data.status || "realizado",
                  valor:
                    data.valor !== undefined && data.valor !== null
                      ? `R$ ${Number(data.valor).toFixed(2)}`
                      : "R$ 0",
                  timestamp: getTimestamp(dataFinalizado),
                };
              })
              .sort((a, b) => b.timestamp - a.timestamp);

            setHistorico(listaHistorico);
          }
        } catch (erro) {
          console.log("Erro ao carregar dados do usuário:", erro);
        }
      };

      carregarDadosUsuario();
    }, [])
  );

  const handleDeletarConta = () => {
    Alert.alert(
      "Deletar Conta",
      "Tem certeza? Esta ação não pode ser desfeita. Todos os seus dados serão permanentemente removidos.",
      [
        { text: "Cancelar", onPress: () => {}, style: "cancel" },
        {
          text: "Deletar",
          onPress: async () => {
            try {
              const usuarioId = auth.currentUser?.uid;
              if (usuarioId) {
                await firestore.collection("Usuario").doc(usuarioId).delete();
              }
              await auth.currentUser?.delete();
              navigation.reset({ index: 0, routes: [{ name: "Login" }] });
              Alert.alert("Sucesso", "Sua conta foi deletada com sucesso");
            } catch (erro: any) {
              console.log("Erro ao deletar conta:", erro);
              Alert.alert("Erro", "Não foi possível deletar sua conta: " + erro.message);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const initials = usuario.nome
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBarBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#0F2937" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Perfil</Text>
        <TouchableOpacity onPress={() => navigation.navigate("EditarPerfil")} style={styles.topBarBtn} activeOpacity={0.7}>
          <Edit2 size={18} color="#0F2937" />
        </TouchableOpacity>
      </View>

      <View style={styles.topHeader}>
        <View style={styles.profileBlock}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials || "US"}</Text>
          </View>
          <Text style={styles.profileName}>{usuario.nome || "Meu Perfil"}</Text>
          <View style={styles.locationRow}>
            <MapPin size={16} color="#64748B" />
            <Text style={styles.locationText}>{usuario.localizacao}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Informações de Contato</Text>
          <View style={styles.sectionUnderline} />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRowItem}>
            <View style={styles.iconBadge}><Phone size={18} color="#0F2937" /></View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoLabel}>Telefone</Text>
              <Text style={styles.infoValue}>{usuario.telefone || "Não informado"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRowItem}>
            <View style={styles.iconBadge}><Mail size={18} color="#0F2937" /></View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{usuario.email || "Não informado"}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Serviços Solicitados</Text>
          <Text style={styles.sectionMeta}>{historico.length} itens</Text>
        </View>
        <View style={styles.sectionUnderline} />

        {historico.slice(0, mostrarTodos ? historico.length : 4).map((item) => (
          <View key={item.id} style={styles.serviceCard}>
            <View style={styles.serviceTopRow}>
              <Text style={styles.serviceTitle}>{item.servico}</Text>
              <Text style={styles.servicePrice}>{item.valor}</Text>
            </View>
            <View style={styles.serviceBottomRow}>
              <Text style={styles.serviceDate}>{item.data}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
          </View>
        ))}

        {historico.length > 4 && (
          <TouchableOpacity
            style={styles.viewMoreButton}
            onPress={() => setMostrarTodos((prev) => !prev)}
          >
            <Text style={styles.viewMoreButtonText}>
              {mostrarTodos
                ? "Ver menos serviços"
                : `Ver mais ${historico.length - 4} serviços`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footerSection}>
        <Text style={styles.footerTitle}>Configurações</Text>
        <TouchableOpacity style={styles.settingsCard} onPress={() => navigation.navigate("Configuracoes") }>
          <Text style={styles.settingsLabel}>Acessar configurações</Text>
          <LogOut size={20} color="#0F2937" />
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginBottom: 6,
  },
  topBarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 41, 55, 0.06)",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F2937",
  },
  topHeader: {
    backgroundColor: "#E8F4FB",
    borderRadius: 28,
    paddingBottom: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
    marginBottom: 20,
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  profileBlock: {
    alignItems: "center",
  },
  avatarCircle: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: "#D9EEF7",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F2937",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F2937",
  },
  viewMoreButton: {
    marginTop: 12,
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  viewMoreButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F2937",
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionUnderline: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#2563EB",
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F2937",
  },
  sectionMeta: {
    fontSize: 13,
    color: "#64748B",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#0F2937",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  infoRowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#E8F4FB",
    justifyContent: "center",
    alignItems: "center",
  },
  infoTextGroup: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F2937",
  },
  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#0F2937",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  serviceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F2937",
    flex: 1,
    paddingRight: 12,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F2937",
  },
  serviceBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceDate: {
    fontSize: 13,
    color: "#64748B",
  },
  statusBadge: {
    backgroundColor: "#E6F7EC",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#276A45",
  },
  footerSection: {
    marginBottom: 80,
  },
  footerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F2937",
    marginBottom: 12,
  },
  settingsCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F2937",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  settingsLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F2937",
  },
});
