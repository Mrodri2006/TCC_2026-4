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
import { auth, firestore } from "../firebase";
import QRCode from "react-native-qrcode-svg";

export default function ConfiguracoesPrestador() {
  const navigation = useNavigation();
  const MENSALIDADE_VALOR = 28.9;
  const PIX_CHAVE = "05475674051";
  const PIX_NOME = "MIGUEL MACHADO";
  const PIX_CIDADE = "BAGE";
  const PIX_VALOR = MENSALIDADE_VALOR;
  const [notificacoes, setNotificacoes] = useState(true);
  const [modoEscuro, setModoEscuro] = useState(false);
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

  const pagarMensalidade = async () => {
    if (mensalidade.status === "paga") return;
    setSalvando(true);
    try {

      const usuarioAutenticado = auth.currentUser;
      if (!usuarioAutenticado) return;
      const refUsuario = firestore.collection("Usuario").doc(usuarioAutenticado.uid);
      const pagoEm = new Date();
      await refUsuario.update({
        mensalidadeStatus: "paga",
        mensalidadePagoEm: pagoEm,
      });
      setMensalidade((prev) => ({
        ...prev,
        status: "paga",
        pagoEm,
      }));
    } catch (erro) {
      console.log("Erro ao pagar mensalidade:", erro);
      Alert.alert("Pagamento", "Falha ao processar pagamento. Tente novamente.");
    } finally {
      setSalvando(false);
    }
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
    const chave = normalizarChavePix(PIX_CHAVE);
    if (!chave || chave === "SUA_CHAVE_PIX_AQUI") {
      const mensagem = "Informe sua chave PIX no código para gerar o QR.";
      setErroPix(mensagem);
      Alert.alert("PIX", mensagem);
      return;
    }
// Gerar uma chave de idempotência para evitar cobranças duplicadas
// A chave de idempotência é uma string única que identifica a transação de pagamento.
    setCarregandoPix(true);
    try {
      const payload = gerarPixCopiaECola({
        chave,
        nome: PIX_NOME,
        cidade: PIX_CIDADE,
        valor: PIX_VALOR,
        txid: "***",
      });
// Atualiza o estado com o payload do QR Code e limpa qualquer URL de ticket anterior
      setQrCopiaCola(payload);
      setQrTicketUrl("");
      if (!payload) {
        setErroPix("Não foi possível obter o QR Code.");
      }
    } catch (erro: any) {
      console.log("Erro ao gerar Pix:", erro);
      const mensagem = "Falha ao gerar o QR Code. Tente novamente.";
      setErroPix(mensagem);
      Alert.alert("PIX", mensagem);
    } finally {
      setCarregandoPix(false);
    }
  };
// Função para gerar o payload do QR Code Pix no formato "Copia e Cola",
// seguindo as especificações do Banco Central para garantir compatibilidade com leitores de QR Code.
  const gerarPixCopiaECola = ({
    chave,
    nome,
    cidade,
    valor,
    txid,
  }: {
    chave: string;
    nome: string;
    cidade: string;
    valor?: number;
    txid: string;
  }) => {
    const nomeFormatado = limparTextoPix(nome).toUpperCase().slice(0, 25);
    const cidadeFormatada = limparTextoPix(cidade).toUpperCase().slice(0, 15);
    const valorFormatado =
      typeof valor === "number" && valor > 0 ? valor.toFixed(2) : "";
// O payload do Pix é construído utilizando o formato TLV (Tag-Length-Value), 
// onde cada campo é representado por uma tag (ID), seguida pelo comprimento do valor e pelo próprio valor.
    const merchantAccount =
      "0014br.gov.bcb.pix" + montarTLV("01", chave);
    const additionalData = montarTLV("05", txid || "***");
// 54 é a tag para o valor da transação, 
// 58 para o país, 
// 59 para o nome do recebedor, 
// 60 para a cidade e 62 para dados adicionais como o txid.
    let payload =
      montarTLV("00", "01") +
      montarTLV("26", merchantAccount) +
      montarTLV("52", "0000") +
      montarTLV("53", "986") +
      (valorFormatado ? montarTLV("54", valorFormatado) : "") +
      montarTLV("58", "BR") +
      montarTLV("59", nomeFormatado) +
      montarTLV("60", cidadeFormatada) +
      montarTLV("62", additionalData);
    const crc = calcularCRC16(payload + "6304");
    payload += "6304" + crc;
    return payload;
  };
// Função auxiliar para montar o formato TLV (Tag-Length-Value) utilizado no payload do Pix,
// onde "id" é a tag, "valor" é o conteúdo e o comprimento é calculado automaticamente.
  const montarTLV = (id: string, valor: string) => {
    const tamanho = valor.length.toString().padStart(2, "0");
    return `${id}${tamanho}${valor}`;
  };

  const limparTextoPix = (texto: string) => {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 .-]/g, "")
      .trim();
  };
// Função para normalizar a chave Pix, garantindo que ela esteja 
// no formato correto para geração do QR Code,
  const normalizarChavePix = (chave: string) => {
    const valor = String(chave || "").trim();
    if (!valor) return "";
    if (valor.includes("@")) {
      return valor.toLowerCase();
    }
    if (valor.startsWith("+")) {
      return "+" + valor.replace(/[^\d]/g, "");
    }
    const somenteDigitos = valor.replace(/[^\d]/g, "");
    if (somenteDigitos.length === 11 || somenteDigitos.length === 14) {
      return somenteDigitos;
    }
    return valor.replace(/\s+/g, "");
  };

  const calcularCRC16 = (payload: string) => {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            padding: 8,
            borderRadius: 10,
            backgroundColor: "#f1f1f1",
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
            color: "#000",
            alignItems: "center",
          }}
        >
          Configurações
        </Text>
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
        <Text style={styles.sectionTitle}>Pagamento</Text>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Mensalidade</Text>
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
            <Text style={styles.infoLabel}>Vencimento:</Text>
            <Text style={styles.infoValue}>{formatarData(mensalidade.vencimento)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pago em:</Text>
            <Text style={styles.infoValue}>
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
              <Text style={styles.loadingText}>Gerando QR Code...</Text>
            </View>
          )}

          {!!erroPix && !carregandoPix && (
            <Text style={styles.errorText}>{erroPix}</Text>
          )}

          {!!qrCopiaCola && !carregandoPix && (
            <View style={styles.qrBox}>
              <View style={styles.qrImage}>
                <QRCode value={qrCopiaCola} size={200} />
              </View>
              <Text style={styles.qrLabel}>PIX Copia e Cola</Text>
              <Text style={styles.qrCodeText} selectable>
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
