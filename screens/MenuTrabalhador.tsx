import * as React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BarChart3, BriefcaseBusiness, Home, MessageCircle } from "lucide-react-native";
import { View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useMensalidadeStatus } from "../hooks/useMensalidadeStatus";
import { StateView } from "../components/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeTrabalhador from "./HomeTrabalhador";
import ChatList from "./ChatList";
import Servicos from "./Servicos";
import RelatoriosPrestador from "./RelatoriosPrestador";
import MensalidadeBloqueada from "./MensalidadeBloqueada";
import { useLanguage } from "../i18n/LanguageContext";
const Tab = createBottomTabNavigator();
export default function MenuTrabalhador() { const { theme } = useTheme(); const { t } = useLanguage(); const insets = useSafeAreaInsets(); const { status, loading } = useMensalidadeStatus(30000); if (loading && !status) return <View style={{ flex: 1, backgroundColor: theme.background }}><StateView kind="loading" message={t("checkingSubscription")} /></View>; if (status?.contaAtiva === false || status?.assinaturaAtiva === false) return <MensalidadeBloqueada />;
  return <Tab.Navigator id="MenuTrabalhadorTabs" initialRouteName="Pagina Inicial" screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: "#FF8700", tabBarInactiveTintColor: theme.textMuted, tabBarStyle: { position: "absolute", left: 14, right: 14, bottom: Math.max(insets.bottom, 10), height: 64, paddingTop: 7, paddingBottom: 7, backgroundColor: theme.card, borderTopColor: theme.border, borderWidth: 1, borderRadius: 22, elevation: 10, shadowColor: "#0F172A", shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }, tabBarLabelStyle: { fontSize: 10, fontWeight: "800" }, tabBarIcon: ({ color, size }) => route.name === "Pagina Inicial" ? <Home color={color} size={size} /> : route.name === "Servicos" ? <BriefcaseBusiness color={color} size={size} /> : route.name === "RelatoriosPrestador" ? <BarChart3 color={color} size={size} /> : <MessageCircle color={color} size={size} /> })}>
    <Tab.Screen name="Pagina Inicial" component={HomeTrabalhador} options={{ title: t("home") }} /><Tab.Screen name="Servicos" component={Servicos} options={{ title: t("services") }} /><Tab.Screen name="RelatoriosPrestador" component={RelatoriosPrestador} options={{ title: t("reports") }} /><Tab.Screen name="Conversas" component={ChatList} options={{ title: t("chats") }} />
  </Tab.Navigator>;
}
