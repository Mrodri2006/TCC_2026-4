import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  TextInput,
  Linking,
} from "react-native";
import { ArrowLeft, Bell, Shield, Moon, Globe, LogOut, RefreshCcw, ExternalLink } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, firestore } from "../firebase";

const MENSALIDADE_VALOR = 28.9;
const CONFIG_COLLECTION = "Configuracoes";
const CONFIG_DOC = "mercadoPago";

type MensalidadeState = {
  vencimento: any;
  status: string;
  pagoEm: any;
  ultimoPagamentoId?: string;
  ultimoPagamentoStatus?: string;
  ultimoQrGeradoEm?: any;
};

type MercadoPagoConfig = {
  accessToken: string;
  descricao: string;
  titulo: string;
};

const configPadrao: MercadoPagoConfig = {
  accessToken: "",
  descricao: "Mensalidade do prestador",
  titulo: "Mensalidade",
};

export default function ConfiguracoesPrestador() {
  const navigation = useNavigation();
  const [notificacoes, setNotificacoes] = useState(true);
  const [modoEscuro, setModoEscuro] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [privacidade, setPrivacidade] = useState(true);
  const [qrBase64, setQrBase64] = useState("");
  const [qrCopiaCola, setQrCopiaCola] = useState("");
  const [qrTicketUrl, setQrTicketUrl] = useState("");
  const [carregandoPix, setCarregandoPix] = useState(false);
  const [erroPix, setErroPix] = useState("");
  const [carregandoConfig, setCarregandoConfig] = useState(true);
  const [mensalidade, setMensalidade] = useState<MensalidadeState>({
    vencimento: null,
    status: "em_aberto",
    pagoEm: null,
    ultimoPagamentoId: "",
    ultimoPagamentoStatus: "",
    ultimoQrGeradoEm: null,
  });
  const [configMercadoPago, setConfigMercadoPago] = useState<MercadoPagoConfig>(configPadrao);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const usuarioAutenticado = auth.currentUser;
        if (!usuarioAutenticado) return;

        const [docSnap, configSnap] = await Promise.all([
          firestore.collection("Usuario").doc(usuarioAutenticado.uid).get(),
          firestore.collection(CONFIG_COLLECTION).doc(CONFIG_DOC).get(),
        ]);

        if (docSnap.exists) {
          const dados = docSnap.data();
          setMensalidade({
            vencimento: dados?.mensalidadeVencimento || null,
            status: dados?.mensalidadeStatus || "em_aberto",
            pagoEm: dados?.mensalidadePagoEm || null,
            ultimoPagamentoId: dados?.mensalidadeUltimoPagamentoId || "",
            ultimoPagamentoStatus: dados?.mensalidadeUltimoPagamentoStatus || "",
            ultimoQrGeradoEm: dados?.mensalidadeUltimoQrGeradoEm || null,
          });
        }

        if (configSnap.exists) {
          const config = configSnap.data();
          setConfigMercadoPago({
            accessToken: String(config?.accessToken || "").trim(),
            descricao: String(config?.descricaoMensalidade || configPadrao.descricao),
            titulo: String(config?.tituloMensalidade || configPadrao.titulo),
          });
        }
      } catch (erro) {
        console.log("Erro ao carregar configuracoes:", erro);
      } finally {
        setCarregandoConfig(false);
      }
    };

    carregarDados();
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

  const abrirModal = () => {
    setQrBase64("");
    setQrCopiaCola("");
    setQrTicketUrl("");
    setErroPix("");
    setModalVisible(true);
  };

  const fecharModal = () => {
    setModalVisible(false);
  };

  const gerarIdempotencyKey = () => `pix_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const registrarPagamentoGerado = async (data: any, transaction: any) => {
    const usuarioAutenticado = auth.currentUser;
    if (!usuarioAutenticado) return;

    const agora = new Date();
    const atualizacao = {
      mensalidadeStatus: data?.status || "pendente",
      mensalidadeUltimoPagamentoId: String(data?.id || ""),
      mensalidadeUltimoPagamentoStatus: String(data?.status_detail || data?.status || ""),
      mensalidadeUltimoQrGeradoEm: agora,
      mensalidadeUltimoTicketUrl: transaction?.ticket_url || "",
      mensalidadeUltimoPixCode: transaction?.qr_code || "",
    };

    await firestore.collection("Usuario").doc(usuarioAutenticado.uid).update(atualizacao);
    setMensalidade((prev) => ({
      ...prev,
      status: data?.status === "approved" ? "paga" : prev.status,
      pagoEm: data?.status === "approved" ? agora : prev.pagoEm,
      ultimoPagamentoId: String(data?.id || ""),
      ultimoPagamentoStatus: String(data?.status_detail || data?.status || ""),
      ultimoQrGeradoEm: agora,
    }));
  };

  const gerarQrPix = async () => {
    const token = configMercadoPago.accessToken.trim();
    if (!token) {
      const mensagem = "Configure o access token em Configuracoes/mercadoPago no Firestore para habilitar o PIX.";
      setErroPix(mensagem);
      Alert.alert("Mercado Pago", mensagem);
      return;
    }

    const emailPagador = auth.currentUser?.email || "";
    const usuarioId = auth.currentUser?.uid;

    if (!emailPagador || !usuarioId) {
      const mensagem = "Não foi possível identificar o usuário autenticado.";
      setErroPix(mensagem);
      Alert.alert("Usuário", mensagem);
      return;
    }

    setCarregandoPix(true);
    setErroPix("");

    try {
      const payload = {
        transaction_amount: MENSALIDADE_VALOR,
        description: configMercadoPago.descricao,
        payment_method_id: "pix",
        external_reference: `mensalidade_${usuarioId}_${Date.now()}`,
        notification_url: "https://example.com/mercadopago/webhook",
        payer: {
          email: emailPagador,
        },
      };

      const response = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": gerarIdempotencyKey(),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        const causa = Array.isArray(data?.cause)
          ? data.cause.map((item: any) => item?.description).filter(Boolean).join(" | ")
          : "";
        const mensagem = causa || data?.message || data?.error || "Erro ao gerar PIX.";
        setErroPix(mensagem);
        Alert.alert("PIX", mensagem);
        return;
      }

      const transaction = data?.point_of_interaction?.transaction_data;
      setQrBase64(transaction?.qr_code_base64 || "");
      setQrCopiaCola(transaction?.qr_code || "");
      setQrTicketUrl(transaction?.ticket_url || "");

      await registrarPagamentoGerado(data, transaction);

      if (!transaction?.qr_code_base64 && !transaction?.qr_code) {
        setErroPix("O pagamento foi criado, mas o Mercado Pago não retornou o QR Code.");
      }
    } catch (erro) {
      console.log("Erro ao gerar Pix:", erro);
      const mensagem = "Falha ao gerar o QR Code. Tente novamente.";
      setErroPix(mensagem);
      Alert.alert("PIX", mensagem);
    } finally {
      setCarregandoPix(false);
    }
  };

  useEffect(() => {
    if (modalVisible) {
      gerarQrPix();
    }
  }, [modalVisible]);

  const abrirTicket = async () => {
    if (!qrTicketUrl) return;
    const supported = await Linking.canOpenURL(qrTicketUrl);
    if (!supported) {
      Alert.alert("PIX", "Não foi possível abrir o link do pagamento.");
      return;
    }
    await Linking.openURL(qrTicketUrl);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color="#005362" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferências</Text>

        <View style={styles.item}>
          <View style={styles.itemLeft}>
            <Bell size={18} color="#005362" />
            <Text style={styles.itemText}>Notificações</Text>
          </View>
          <Switch value={notificacoes} onValueChange={setNotificacoes} />
        </View>

        <View style={styles.item}>
          <View style={styles.itemLeft}>
            <Moon size={18} color="#005362" />
            <Text style={styles.itemText}>Modo escuro</Text>
          </View>
          <Switch value={modoEscuro} onValueChange={setModoEscuro} />
        </View>

        <View style={styles.item}>
          <View style={styles.itemLeft}>
            <Globe size={18} color="#005362" />
            <Text style={styles.itemText}>Idioma</Text>
          </View>
          <Text style={styles.itemValue}>Português (BR)</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacidade</Text>

        <View style={styles.item}>
          <View style={styles.itemLeft}>
            <Shield size={18} color="#005362" />
            <Text style={styles.itemText}>Perfil visível</Text>
          </View>
          <Switch value={privacidade} onValueChange={setPrivacidade} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Integração Mercado Pago</Text>
        <Text style={styles.helperText}>
          O app agora lê o token da coleção <Text style={styles.helperTextStrong}>Configuracoes/mercadoPago</Text> no Firestore.
        </Text>
        <TextInput
          style={styles.readonlyInput}
          value={carregandoConfig ? "Carregando configuração..." : (configMercadoPago.accessToken ? "Token configurado no Firestore" : "Token não configurado")}
          editable={false}
          multiline
        />
        <Text style={styles.helperText}>
          Campos esperados: <Text style={styles.helperTextStrong}>accessToken</Text>, <Text style={styles.helperTextStrong}>descricaoMensalidade</Text> e <Text style={styles.helperTextStrong}>tituloMensalidade</Text>.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pagamento</Text>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{configMercadoPago.titulo}</Text>
            <View
              style={[
                styles.statusBadge,
                mensalidade.status === "paga" ? styles.statusPago : styles.statusAberto,
              ]}
            >
              <Text style={styles.statusText}>
                {mensalidade.status === "paga" ? "Paga" : "Em aberto"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Valor:</Text>
            <Text style={styles.infoValue}>R$ {MENSALIDADE_VALOR.toFixed(2).replace(".", ",")}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vencimento:</Text>
            <Text style={styles.infoValue}>{formatarData(mensalidade.vencimento)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pago em:</Text>
            <Text style={styles.infoValue}>
              {mensalidade.status === "paga" ? formatarData(mensalidade.pagoEm) : "-"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Último pagamento:</Text>
            <Text style={styles.infoValue}>{mensalidade.ultimoPagamentoId || "-"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status MP:</Text>
            <Text style={styles.infoValue}>{mensalidade.ultimoPagamentoStatus || "-"}</Text>
          </View>

          <TouchableOpacity style={styles.botaoPagar} onPress={abrirModal}>
            <Text style={styles.botaoTexto}>Gerar QR Pix</Text>
          </TouchableOpacity>

          <Modal visible={modalVisible} transparent animationType="fade">
            <TouchableOpacity
              style={styles.modalOverlay}
              onPress={fecharModal}
              activeOpacity={1}
            >
              <TouchableOpacity
                style={styles.modalContent}
                onPress={() => {}}
                activeOpacity={1}
              >
                <ScrollView showsVerticalScrollIndicator={false}>
                  {carregandoPix && (
                    <View style={styles.loadingBox}>
                      <ActivityIndicator />
                      <Text style={styles.loadingText}>Gerando QR Code...</Text>
                    </View>
                  )}

                  {!!erroPix && !carregandoPix && (
                    <Text style={styles.errorText}>{erroPix}</Text>
                  )}

                  {!!qrBase64 && !carregandoPix && (
                    <View style={styles.qrBox}>
                      <Image
                        source={{ uri: `data:image/png;base64,${qrBase64}` }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                      <Text style={styles.qrLabel}>PIX Copia e Cola</Text>
                      <Text style={styles.qrCodeText} selectable>
                        {qrCopiaCola}
                      </Text>
                    </View>
                  )}

                  {!!qrTicketUrl && !carregandoPix && (
                    <TouchableOpacity style={styles.ticketButton} onPress={abrirTicket}>
                      <ExternalLink size={16} color="#005362" />
                      <Text style={styles.ticketButtonText}>Abrir comprovante no navegador</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.modalButtonGhost} onPress={fecharModal}>
                      <Text style={styles.modalButtonGhostText}>Fechar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalButtonPrimary} onPress={gerarQrPix}>
                      <RefreshCcw size={16} color="#fff" />
                      <Text style={styles.modalButtonPrimaryText}>Gerar novamente</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conta</Text>

        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("EditarPerfil")}>
          <Text style={styles.actionText}>Editar perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.navigate("LoginTrabalhador")}>
          <LogOut size={18} color="#1e90ff" />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
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
  backButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#f1f1f1",
    marginTop: 40,
  },
  headerTitle: {
    marginTop: 40,
    marginBottom: 4,
    fontSize: 28,
    fontWeight: "600",
    color: "#000",
    alignItems: "center",
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
    flex: 1,
    textAlign: "right",
    marginLeft: 12,
  },
  helperText: {
    fontSize: 13,
    color: "#4b5563",
    marginBottom: 10,
    lineHeight: 18,
  },
  helperTextStrong: {
    fontWeight: "700",
    color: "#111827",
  },
  readonlyInput: {
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#374151",
    marginBottom: 10,
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
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 13,
    color: "#000",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  botaoPagar: {
    marginTop: 14,
    backgroundColor: "#005362",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  botaoTexto: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    maxHeight: "85%",
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: "#444",
  },
  errorText: {
    fontSize: 14,
    color: "#d93025",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  qrBox: {
    alignItems: "center",
    gap: 10,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  qrLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  qrCodeText: {
    fontSize: 13,
    color: "#374151",
    textAlign: "center",
  },
  ticketButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ticketButtonText: {
    color: "#005362",
    fontSize: 14,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 18,
  },
  modalButtonGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalButtonGhostText: {
    color: "#374151",
    fontWeight: "600",
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: "#005362",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  modalButtonPrimaryText: {
    color: "#fff",
    fontWeight: "700",
  },
  deleteButton: {
    marginTop: 10,
    backgroundColor: "#fff5f5",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffd6d6",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#d93025",
  },
});
