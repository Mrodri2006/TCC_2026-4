import * as React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useTheme } from "../theme/ThemeContext";

import HomeTrabalhador from "./HomeTrabalhador";
import ChatList from "./ChatList";
import Servicos from "./Servicos";
import RelatoriosPrestador from "./RelatoriosPrestador";

const Drawer = createDrawerNavigator();

export default function MenuTrabalhador() {
  const { theme } = useTheme();

  return (
    <Drawer.Navigator
      id="MenuTrabalhadorDrawer"
      initialRouteName="Pagina Inicial"
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: theme.background },
        drawerActiveTintColor: "#2563EB",
        drawerInactiveTintColor: theme.textSecondary,
        drawerActiveBackgroundColor: theme.card,
      }}
    >
      <Drawer.Screen name='Pagina Inicial' component={HomeTrabalhador} />
      <Drawer.Screen name="Servicos" component={Servicos} options={{ title: "Serviços" }} />
      <Drawer.Screen name="RelatoriosPrestador" component={RelatoriosPrestador} options={{ title: "Relatórios" }} />
      <Drawer.Screen name='Conversas' component={ChatList} />
    </Drawer.Navigator>
  );
}
