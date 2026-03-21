import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Alert } from "react-native";
import { ArrowLeft, Bell, Shield, Moon, Globe, LogOut } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, firestore } from "../firebase";

export default function ConfiguracoesPrestador() {
  const navigation = useNavigation();
  const [notificacoes, setNotificacoes] = useState(true);
  const [modoEscuro, setModoEscuro] = useState(false);
  const [privacidade, setPrivacidade] = useState(true);
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
              (salvando || mensalidade.status === "paga") && styles.botaoDesabilitado,
            ]}
            onPress={pagarMensalidade}
            disabled={salvando || mensalidade.status === "paga"}
          >
            <Text style={styles.botaoTexto}>Pagar mensalidade</Text>
          </TouchableOpacity>
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
