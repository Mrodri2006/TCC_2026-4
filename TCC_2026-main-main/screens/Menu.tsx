import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";

import Home from "./Home";
import ServStatus from "./ServStatus";


const Drawer = createDrawerNavigator();

export default function Menu() {

    return (
        <Drawer.Navigator initialRouteName="Página Inicial">
            <Drawer.Screen name='Página Inicial' component={Home} />
            <Drawer.Screen name='Status de Serviços' component={ServStatus} />
        </Drawer.Navigator>

    )
}