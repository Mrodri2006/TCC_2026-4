import * as React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";

import Home from "./Home";
import ServStatus from "./ServStatus";
import ChatList from "./ChatList";

const Drawer = createDrawerNavigator();

export default function Menu() {
  return (
    <Drawer.Navigator id="MenuDrawer" initialRouteName="Página Inicial">
      <Drawer.Screen
        name="Página Inicial"
        component={Home}
        options={{ headerShown: false }}
      />
      <Drawer.Screen name="Status de Serviços" component={ServStatus} />
      <Drawer.Screen name="Conversas" component={ChatList} />
    </Drawer.Navigator>
  );
}
