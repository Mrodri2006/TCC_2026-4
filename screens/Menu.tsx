import * as React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ClipboardCheck, Heart, Home as HomeIcon, MessageCircle, Search } from "lucide-react-native";
import { LiquidTabBar } from "../components/ui";
import { useLanguage } from "../i18n/LanguageContext";
import ChatList from "./ChatList";
import Favoritos from "./Favoritos";
import HistoricoServicos from "./HistoricoServicos";
import Home from "./Home";

const Tab = createBottomTabNavigator();

export default function Menu() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      id="MenuTabs"
      initialRouteName="ClienteHome"
      tabBar={(props) => <LiquidTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#FF8700",
        tabBarIcon: ({ color, size }) => {
          if (route.name === "ClienteHome") return <HomeIcon color={color} size={size} />;
          if (route.name === "ClienteBuscar") return <Search color={color} size={size} />;
          if (route.name === "ClienteStatus") return <ClipboardCheck color={color} size={size} />;
          if (route.name === "ClienteFavoritos") return <Heart color={color} size={size} />;
          return <MessageCircle color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="ClienteHome" component={Home} options={{ title: t("home") }} />
      <Tab.Screen
        name="ClienteBuscar"
        component={Home}
        initialParams={{ initialTab: "busca" }}
        options={{ title: t("search") }}
      />
      <Tab.Screen name="ClienteStatus" component={HistoricoServicos} options={{ title: t("services") }} />
      <Tab.Screen name="ClienteFavoritos" component={Favoritos} options={{ title: t("favorites") }} />
      <Tab.Screen name="ClienteConversas" component={ChatList} options={{ title: t("chats") }} />
    </Tab.Navigator>
  );
}
