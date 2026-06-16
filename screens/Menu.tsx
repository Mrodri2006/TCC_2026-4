import * as React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useTheme } from "../theme/ThemeContext";

import Home from "./Home";
import ServStatus from "./ServStatus";
import ChatList from "./ChatList";

const Drawer = createDrawerNavigator();

export default function Menu() {
  const { theme } = useTheme();
  return (
    <Drawer.Navigator
      id="MenuDrawer"
      initialRouteName="Página Inicial"
      screenOptions={{
        drawerStyle: { backgroundColor: theme.background },
        drawerActiveTintColor: "#2563EB",
        drawerInactiveTintColor: theme.textSecondary,
        drawerActiveBackgroundColor: theme.card,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.textPrimary,
      }}
    >
      <Drawer.Screen
        name="Página Inicial"
        component={Home}
        options={{ headerShown: false }}
      />
      <Drawer.Screen name="Status de Serviços" component={ServStatus} />
      <Drawer.Screen name="Conversas" component={ChatList} options={{ headerShown: false }} />
    </Drawer.Navigator>
  );
}
