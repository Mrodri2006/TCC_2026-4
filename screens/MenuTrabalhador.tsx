import * as React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";

import HomeTrabalhador from "./HomeTrabalhador";
import ChatList from "./ChatList";

const Drawer = createDrawerNavigator();

export default function MenuTrabalhador() {
  return (
            <Drawer.Navigator
                id="MenuTrabalhadorDrawer"
                initialRouteName="Pagina Inicial"
                screenOptions={{ headerShown: false }}
            >
                <Drawer.Screen name='Pagina Inicial' component={HomeTrabalhador} />
                <Drawer.Screen name='Conversas' component={ChatList} />
            </Drawer.Navigator>
  )
}
