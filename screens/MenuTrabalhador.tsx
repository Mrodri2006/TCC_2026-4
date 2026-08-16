import * as React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BarChart3, BriefcaseBusiness, Home, MessageCircle } from "lucide-react-native";
import { View } from "react-native";
import { LiquidTabBar, StateView } from "../components/ui";
import { useMensalidadeStatus } from "../hooks/useMensalidadeStatus";
import { useLanguage } from "../i18n/LanguageContext";
import { useTheme } from "../theme/ThemeContext";
import ChatList from "./ChatList";
import HomeTrabalhador from "./HomeTrabalhador";
import MensalidadeBloqueada from "./MensalidadeBloqueada";
import RelatoriosPrestador from "./RelatoriosPrestador";
import Servicos from "./Servicos";

const Tab = createBottomTabNavigator();

export default function MenuTrabalhador() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { status, loading } = useMensalidadeStatus(30000);

  if (loading && !status) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StateView kind="loading" message={t("checkingSubscription")} />
      </View>
    );
  }

  if (status?.contaAtiva === false || status?.assinaturaAtiva === false) {
    return <MensalidadeBloqueada />;
  }

  return (
    <Tab.Navigator
      id="MenuTrabalhadorTabs"
      initialRouteName="TrabalhadorHome"
      tabBar={(props) => <LiquidTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#FF8700",
        tabBarIcon: ({ color, size }) => {
          if (route.name === "TrabalhadorHome") return <Home color={color} size={size} />;
          if (route.name === "TrabalhadorServicos") return <BriefcaseBusiness color={color} size={size} />;
          if (route.name === "TrabalhadorRelatorios") return <BarChart3 color={color} size={size} />;
          return <MessageCircle color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="TrabalhadorHome" component={HomeTrabalhador} options={{ title: t("home") }} />
      <Tab.Screen name="TrabalhadorServicos" component={Servicos} options={{ title: t("services") }} />
      <Tab.Screen name="TrabalhadorRelatorios" component={RelatoriosPrestador} options={{ title: t("reports") }} />
      <Tab.Screen name="TrabalhadorConversas" component={ChatList} options={{ title: t("chats") }} />
    </Tab.Navigator>
  );
}
