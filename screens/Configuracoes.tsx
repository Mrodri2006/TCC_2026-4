import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Alert } from "react-native";
import { ArrowLeft, Bell, Shield, Moon, Globe, LogOut } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";

export default function Configuracoes() {
  const navigation = useNavigation<any>();
  const [notificacoes, setNotificacoes] = useState(true);
  const [privacidade, setPrivacidade] = useState(true);
  const { isDark, setIsDark, theme } = useTheme();

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
                routes: [{ name: "Login" }],
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

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (erro) {
      console.log("Erro ao sair:", erro);
      Alert.alert("Erro", "Nao foi possivel sair da conta.");
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
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
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Conta</Text>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.actionBg, borderColor: theme.actionBorder }]}
          onPress={() => navigation.navigate("EditarPerfil")}
        >
          <Text style={[styles.actionText, { color: "#005362" }]}>Editar perfil</Text>
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
