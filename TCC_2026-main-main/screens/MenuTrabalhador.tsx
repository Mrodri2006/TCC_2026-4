import * as React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";

import HomeTrabalhador from "./HomeTrabalhador";
import Serv from "./Serv";
import ServListar from "./ServStatus";

const Drawer = createDrawerNavigator();

export default function MenuTrabalhador() {
  return (
    <Drawer.Navigator initialRouteName="Home Trabalhador">
      <Drawer.Screen
        name="Home Trabalhador"
        component={HomeTrabalhador}
      />
      <Drawer.Screen
        name="Cadastro de Serviços"
        component={Serv}
      />
      <Drawer.Screen
        name="Lista de Serviços"
        component={ServListar}
      />
    </Drawer.Navigator>
  );
}
