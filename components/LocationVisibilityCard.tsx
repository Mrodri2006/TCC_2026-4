import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Eye, EyeOff, LocateFixed, RefreshCw } from "lucide-react-native";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";
import {
  activateLocationPresence,
  deactivateLocationPresence,
  presenceIsActive,
  type ProviderPresence,
} from "../services/locationPresenceService";

export function LocationVisibilityCard() {
  const { isDark, theme } = useTheme();
  const [presence, setPresence] = useState<ProviderPresence | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const active = presenceIsActive(presence?.expiresAt);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    let expirationTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = firestore.collection("LocalizacoesPrestadores").doc(uid).onSnapshot(
      (snapshot) => {
        const nextPresence = snapshot.exists ? ({ id: snapshot.id, ...snapshot.data() } as ProviderPresence) : null;
        setPresence(nextPresence);
        if (expirationTimer) clearTimeout(expirationTimer);
        const remaining = nextPresence?.expiresAt?.toMillis?.() ? nextPresence.expiresAt.toMillis() - Date.now() : 0;
        if (remaining > 0) {
          expirationTimer = setTimeout(() => setPresence((current) => (current ? { ...current } : current)), remaining + 250);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => {
      if (expirationTimer) clearTimeout(expirationTimer);
      unsubscribe();
    };
  }, []);

  const activate = async () => {
    try {
      setUpdating(true);
      await activateLocationPresence();
      Alert.alert("Localização ativada", "Você ficará visível no mapa por duas horas. Pode desativar quando quiser.");
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code || "").replace("firestore/", "")
        : error instanceof Error
          ? error.message
          : "";
      if (__DEV__) console.error("Falha ao ativar localização:", code, error);
      if (code === "location-permission-denied") {
        Alert.alert(
          "Permissão necessária",
          "Autorize a localização nas configurações do aparelho para aparecer no mapa.",
          [{ text: "Cancelar", style: "cancel" }, { text: "Abrir configurações", onPress: () => Linking.openSettings() }]
        );
      } else if (code === "provider-inactive") {
        Alert.alert("Recurso indisponível", "Sua assinatura precisa estar ativa para aparecer no mapa.");
      } else if (code === "permission-denied") {
        Alert.alert(
          "Localização ainda não autorizada",
          "O servidor não autorizou o compartilhamento. Atualize as permissões do aplicativo e tente novamente."
        );
      } else if (code === "unavailable" || code === "network-request-failed") {
        Alert.alert("Sem conexão", "Não foi possível acessar o servidor. Verifique a internet e tente novamente.");
      } else {
        Alert.alert("Não foi possível ativar", "Confira se o GPS está ligado e tente novamente.");
      }
    } finally {
      setUpdating(false);
    }
  };

  const confirmActivate = () => {
    Alert.alert(
      "Aparecer no mapa?",
      "Sua posição aproximada será exibida apenas para contratantes autenticados durante duas horas.",
      [{ text: "Cancelar", style: "cancel" }, { text: "Ativar", onPress: activate }]
    );
  };

  const deactivate = () => {
    Alert.alert("Ocultar localização?", "Seu marcador será removido imediatamente do mapa.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Ocultar agora",
        style: "destructive",
        onPress: async () => {
          try {
            setUpdating(true);
            await deactivateLocationPresence();
          } catch {
            Alert.alert("Erro", "Não foi possível ocultar sua localização agora.");
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const expiration = presence?.expiresAt?.toDate?.();
  const expirationText = expiration
    ? expiration.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: active ? "#86EFAC" : theme.surfaceBorder }]}>
      <View style={[styles.icon, { backgroundColor: active ? (isDark ? "rgba(34,197,94,0.16)" : "#DCFCE7") : theme.headerBtnBg }]}>
        {active ? <LocateFixed size={25} color="#16A34A" /> : <EyeOff size={25} color={theme.textMuted} />}
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Visibilidade no mapa</Text>
          <View style={[styles.status, { backgroundColor: active ? "#DCFCE7" : theme.headerBtnBg }]}>
            <Text style={[styles.statusText, { color: active ? "#15803D" : theme.textMuted }]}>{active ? "ATIVA" : "OCULTA"}</Text>
          </View>
        </View>
        <Text style={[styles.description, { color: theme.textMuted }]}>
          {active ? `Visível até ${expirationText}. A posição exibida é aproximada.` : "Você não está aparecendo para os contratantes."}
        </Text>
        {loading ? (
          <ActivityIndicator style={styles.loader} color="#2563EB" />
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, active && styles.hideButton, updating && styles.disabled]}
              onPress={active ? deactivate : confirmActivate}
              disabled={updating}
              accessibilityRole="button"
            >
              {updating ? <ActivityIndicator size="small" color="#FFFFFF" /> : active ? <EyeOff size={17} color="#FFFFFF" /> : <Eye size={17} color="#FFFFFF" />}
              <Text style={styles.primaryText}>{active ? "Ocultar agora" : "Ativar localização"}</Text>
            </TouchableOpacity>
            {active && (
              <TouchableOpacity style={[styles.refreshButton, updating && styles.disabled]} onPress={activate} disabled={updating} accessibilityRole="button">
                <RefreshCw size={17} color="#2563EB" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: 13, borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1 },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: "800" },
  status: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.4 },
  description: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  loader: { alignSelf: "flex-start", marginTop: 13 },
  actions: { flexDirection: "row", gap: 8, marginTop: 13 },
  primaryButton: { minHeight: 42, flex: 1, paddingHorizontal: 13, borderRadius: 13, backgroundColor: "#2563EB", flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  hideButton: { backgroundColor: "#DC2626" },
  primaryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  refreshButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.6 },
});
