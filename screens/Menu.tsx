import * as React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ClipboardCheck, Heart, Home as HomeIcon, MessageCircle, Search } from "lucide-react-native";
import { useTheme } from "../theme/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Home from "./Home";
import HistoricoServicos from "./HistoricoServicos";
import ChatList from "./ChatList";
import Favoritos from "./Favoritos";
const Tab = createBottomTabNavigator();
export default function Menu() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return <Tab.Navigator id="MenuTabs" initialRouteName="Página Inicial" screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: "#2563EB", tabBarInactiveTintColor: theme.textMuted,
    tabBarStyle: { position: "absolute", left: 14, right: 14, bottom: Math.max(insets.bottom, 10), height: 64, paddingTop: 7, paddingBottom: 7, backgroundColor: theme.card, borderTopColor: theme.border, borderWidth: 1, borderRadius: 22, elevation: 10, shadowColor: "#0F172A", shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
    tabBarLabelStyle: { fontSize: 10, fontWeight: "800" },
    tabBarIcon: ({ color, size }) => route.name === "Página Inicial" ? <HomeIcon color={color} size={size} /> : route.name === "Buscar" ? <Search color={color} size={size} /> : route.name === "Status de Serviços" ? <ClipboardCheck color={color} size={size} /> : route.name === "Favoritos" ? <Heart color={color} size={size} /> : <MessageCircle color={color} size={size} />,
  })}>
    <Tab.Screen name="Página Inicial" component={Home} options={{ title: "Início" }} />
    <Tab.Screen name="Buscar" component={Home} initialParams={{ initialTab: "busca" }} />
    <Tab.Screen name="Status de Serviços" component={HistoricoServicos} options={{ title: "Serviços" }} />
    <Tab.Screen name="Favoritos" component={Favoritos} />
    <Tab.Screen name="Conversas" component={ChatList} />
  </Tab.Navigator>;
}
