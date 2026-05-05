import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { ArrowLeft, Bell, Shield, Moon, Globe, LogOut } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, firestore, functions, getFunctionsByRegion } from "../firebase";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "../theme/ThemeContext";

export default function ConfiguracoesPrestador() {
  const navigation = useNavigation<any>();
  const MENSALIDADE_VALOR = 28.9;
  const [notificacoes, setNotificacoes] = useState(true);
  const [privacidade, setPrivacidade] = useState(true);
  const [qrCopiaCola, setQrCopiaCola] = useState("");
  const [qrTicketUrl, setQrTicketUrl] = useState("");
  const [carregandoPix, setCarregandoPix] = useState(false);
  const [erroPix, setErroPix] = useState("");
  const [mensalidade, setMensalidade] = useState({
    vencimento: null,
    status: "em_aberto",
    pagoEm: null,
  });
  const [salvando, setSalvando] = useState(false);
  const { isDark, setIsDark, theme } = useTheme();

  useEffect(() => {
    const carregarMensalidade = async () => {
      try {
        const usuarioAutenticado = auth.currentUser;
        if (!usuarioAutenticado) return;
        const docSnap = await firestore.collection("Usuario").doc(usuarioAutenticado.uid).get();
        if (docSnap.exists) {
          const dados = docSnap.data();
          setMensalidade({
            vencimento: dados.mensalidadeVencimento || null,
            status: dados.mensalidadeStatus || "em_aberto",
            pagoEm: dados.mensalidadePagoEm || null,
          });
        }
      } catch (erro) {
        console.log("Erro ao carregar mensalidade:", erro);
      }
    };

    carregarMensalidade();
  }, []);

  const formatarData = (valor: any) => {
    if (!valor) return "Nao informado";
    const data = valor?.toDate ? valor.toDate() : new Date(valor);
    if (Number.isNaN(data.getTime())) return "Nao informado";
    return data.toLocaleDateString("pt-BR");
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Deletar Conta",
      "Tem certeza que deseja deletar sua conta? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Deletar",
          style: "destructive",
          onPress: async () => {
            try {
              const usuarioAutenticado = auth.currentUser;
              if (!usuarioAutenticado) return;

              await firestore.collection("Usuario").doc(usuarioAutenticado.uid).delete();
              const servicosSnapshot = await firestore
                .collection("ServicosAdds")
                .doc(usuarioAutenticado.uid)
                .collection("ServicosOferecidos")
                .get();
              const deletePromises = servicosSnapshot.docs.map((doc) => doc.ref.delete());
              await Promise.all(deletePromises);

              await usuarioAutenticado.delete();

              Alert.alert("Conta deletada", "Sua conta foi deletada com sucesso.");
              navigation.reset({
                index: 0,
                routes: [{ name: "LoginTrabalhador" }],
              });
            } catch (erro) {
              console.log("Erro ao deletar conta:", erro);
              Alert.alert("Erro", "Não foi possível deletar a conta.");
            }
          },
        },
      ]
    );
  };
// Inicia o processo de geração do QR Pix, limpando estados anteriores e chamando a função de geração
// para evitar que dados antigos interfiram na nova geração do QR Code.
  const iniciarGeracaoQr = () => {
    setQrCopiaCola("");
    setQrTicketUrl("");
    setErroPix("");
    gerarQrPix();
  };
// Gera uma chave de idempotência única para cada transação, garantindo que 
// múltiplas tentativas de pagamento não resultem em cobranças duplicadas.
  const gerarIdempotencyKey = () => {
    return `pix_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  };
// Função principal para gerar o QR Code Pix, 
// incluindo validação da chave, construção do payload e tratamento de erros.
  const gerarQrPix = async () => {
    setCarregandoPix(true);
    setSalvando(true);
    try {
      const payloadRequest = {
        amount: MENSALIDADE_VALOR,
        description: "Mensalidade prestador",
        idempotencyKey: gerarIdempotencyKey(),
      };

      const regioesTentativa = ["us-central1", "southamerica-east1"];
      let response: any = null;
      let ultimoErro: any = null;

      for (const regiao of regioesTentativa) {
        try {
          const instanciaFunctions =
            regiao === "us-central1" ? functions : getFunctionsByRegion(regiao);
          const gerarPixMensalidade = instanciaFunctions.httpsCallable("gerarPixMensalidade");
          response = await gerarPixMensalidade(payloadRequest);
          break;
        } catch (erroRegiao: any) {
          ultimoErro = erroRegiao;
          const codigo = erroRegiao?.code || "";
          if (codigo !== "not-found" && codigo !== "functions/not-found") {
            throw erroRegiao;
          }
        }
      }

      if (!response) {
        throw ultimoErro || new Error("Falha ao localizar a função de geração Pix.");
      }

      const payload = response?.data || {};
      setQrCopiaCola(payload.qr_code || "");
      setQrTicketUrl(payload.ticket_url || "");
      if (!payload.qr_code) {
        setErroPix("Nao foi possivel obter o QR Code de pagamento.");
      }
    } catch (erro: any) {
      console.log("Erro ao gerar Pix:", erro);
      const codigo = erro?.code || "";
      const mensagem =
        codigo === "not-found" || codigo === "functions/not-found"
          ? "Funcao de pagamento nao encontrada no backend. Publique a Cloud Function gerarPixMensalidade."
          : "Falha ao gerar o QR Code no backend. Tente novamente.";
      setErroPix(mensagem);
      Alert.alert("PIX", mensagem);
    } finally {
      setCarregandoPix(false);
      setSalvando(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: "LoginTrabalhador" }],
      });
    } catch (erro) {
      console.log("Erro ao sair:", erro);
      Alert.alert("Erro", "Nao foi possivel sair da conta.");
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            padding: 8,
            borderRadius: 10,
            backgroundColor: theme.headerBtnBg,
            marginTop: 40,
          }}
        >
          <ArrowLeft size={20} color="#005362" />
        </TouchableOpacity>
        <Text
          style={{
            marginTop: 40,
            marginBottom: 4,
            fontSize: 28,
            fontWeight: "600",
            color: theme.textPrimary,
            alignItems: "center",
          }}
        >
          Configurações
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Preferências</Text>

        <View style={[styles.item, { borderTopColor: theme.border }]}>
          <View style={styles.itemLeft}>
            <Bell size={18} color="#005362" />
            <Text style={[styles.itemText, { color: theme.textSecondary }]}>Notificações</Text>
          </View>
          <Switch
            value={notificacoes}
            onValueChange={setNotificacoes}
            trackColor={{ false: isDark ? "#3a3a3a" : "#d0d0d0", true: "#5aa9b5" }}
            thumbColor={isDark ? "#f2f2f2" : "#fff"}
            ios_backgroundColor={isDark ? "#3a3a3a" : "#d0d0d0"}
          />
        </View>

        <View style={[styles.item, { borderTopColor: theme.border }]}>
          <View style={styles.itemLeft}>
            <Moon size={18} color="#005362" />
            <Text style={[styles.itemText, { color: theme.textSecondary }]}>Modo escuro</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={setIsDark}
            trackColor={{ false: isDark ? "#3a3a3a" : "#d0d0d0", true: "#5aa9b5" }}
            thumbColor={isDark ? "#f2f2f2" : "#fff"}
            ios_backgroundColor={isDark ? "#3a3a3a" : "#d0d0d0"}
          />
        </View>

        <View style={[styles.item, { borderTopColor: theme.border }]}>
          <View style={styles.itemLeft}>
            <Globe size={18} color="#005362" />
            <Text style={[styles.itemText, { color: theme.textSecondary }]}>Idioma</Text>
          </View>
          <Text style={[styles.itemValue, { color: theme.textMuted }]}>Português (BR)</Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Privacidade</Text>

        <View style={[styles.item, { borderTopColor: theme.border }]}>
          <View style={styles.itemLeft}>
            <Shield size={18} color="#005362" />
            <Text style={[styles.itemText, { color: theme.textSecondary }]}>Perfil visível</Text>
          </View>
          <Switch
            value={privacidade}
            onValueChange={setPrivacidade}
            trackColor={{ false: isDark ? "#3a3a3a" : "#d0d0d0", true: "#5aa9b5" }}
            thumbColor={isDark ? "#f2f2f2" : "#fff"}
            ios_backgroundColor={isDark ? "#3a3a3a" : "#d0d0d0"}
          />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Pagamento</Text>
        <View style={[styles.card, { backgroundColor: theme.actionBg, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Mensalidade</Text>
            <View
              style={[
                styles.statusBadge,
                mensalidade.status === "paga" ? styles.statusPago : styles.statusAberto,
              ]}
            >
              <Text style={[styles.statusText, { color: theme.textPrimary }]}>
                {mensalidade.status === "paga" ? "Paga" : "Em aberto"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Vencimento:</Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
              {formatarData(mensalidade.vencimento)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Pago em:</Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
              {mensalidade.status === "paga" ? formatarData(mensalidade.pagoEm) : "-"}
            </Text>
          </View>
        
          <TouchableOpacity
            style={[
              styles.botaoPagar,
              salvando && styles.botaoDesabilitado,
            ]}
            onPress={iniciarGeracaoQr}
            disabled={salvando}
          >
          <Text style={styles.botaoTexto}>Gerar QR Pix</Text>
          </TouchableOpacity>

          {carregandoPix && (
            <View style={styles.loadingBox}>
              <ActivityIndicator />
              <Text style={[styles.loadingText, { color: theme.textMuted }]}>Gerando QR Code...</Text>
            </View>
          )}

          {!!erroPix && !carregandoPix && (
            <Text style={styles.errorText}>{erroPix}</Text>
          )}

          {!!qrCopiaCola && !carregandoPix && (
            <View style={[styles.qrBox, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <View style={styles.qrImage}>
                <QRCode value={qrCopiaCola} size={200} />
              </View>
              <Text style={[styles.qrLabel, { color: theme.textSecondary }]}>PIX Copia e Cola</Text>
              <Text style={[styles.qrCodeText, { color: theme.textSecondary }]} selectable>
                {qrCopiaCola}
              </Text>
              {!!qrTicketUrl && (
                <Text style={styles.qrHint} selectable>
                  {qrTicketUrl}
                </Text>
              )}
            </View>
          )}

            
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Conta</Text>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.actionBg, borderColor: theme.actionBorder }]}
          onPress={() => navigation.navigate("EditarPerfil")}
        >
          <Text style={styles.actionText}>Editar perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.actionBg, borderColor: theme.actionBorder }]}
          onPress={handleLogout}
        >
          <LogOut size={18} color="#1e90ff" />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: theme.actionBg, borderColor: theme.deleteBorder }]}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.deleteButtonText}>Deletar Conta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerSpacer: {
    width: 36,
  },
  section: {
    backgroundColor: "#f7f7f7",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e6e6e6",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  itemValue: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  actionButton: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#005362",
  },
  logoutButton: {
    marginTop: 10,
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e90ff",
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPago: {
    backgroundColor: "#e6f6ee",
  },
  statusAberto: {
    backgroundColor: "#fff2e0",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: "#555",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },
  botaoPagar: {
    backgroundColor: "#005362",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  botaoTexto: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: "#555",
  },
  errorText: {
    fontSize: 13,
    color: "#b00020",
    marginBottom: 12,
    textAlign: "center",
  },
  qrBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  qrImage: {
    width: "100%",
    height: 220,
    marginBottom: 10,
  },
  qrLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  qrCodeText: {
    fontSize: 11,
    color: "#444",
  },
  qrHint: {
    fontSize: 11,
    color: "#1e90ff",
    marginTop: 8,
  },
  deleteButton: {
    marginTop: 10,
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1c0c0",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#b00020",
  },
});
