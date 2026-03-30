
import { StyleSheet, Text, View } from 'react-native';

import Login    from './screens/Login';
import Register from './screens/Register';
import Register2 from './screens/Register2';
import Menu     from './screens/Menu';
import MenuTrabalhador from './screens/MenuTrabalhador';
import LoginTrabalhador     from './screens/LoginTrabalhador';
import HomeTrabalhador     from './screens/HomeTrabalhador';
import ServicosAgendados from './screens/ServicosAgendados';
import Perfil    from './screens/Perfil';
import PerfilTrabalhador from './screens/PerfilTrabalhador';
import EditarPerfil from './screens/EditarPerfil';
import Profissionais    from './screens/Profissionais';
import DetalheProfissional from './screens/DetalheProfissional';
import NovosPrestadores from './screens/NovosPrestadores';
import PrestadoresPorServico from './screens/PrestadoresPorServico';
import SolicitarServico from './screens/SolicitarServico';
import AddServico from './screens/AddServico';
import ServStatus from './screens/ServStatus';
import Avaliacao from './screens/Avaliacao';
import Configuracoes from './screens/Configuracoes';
import ConfiguracoesPrestador from './screens/ConfiguracoesPrestador';
import ChatList from './screens/ChatList';
import Chat from './screens/Chat';
import Adm from './screens/Adm';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ServicosEmAndamento from './screens/ServicosEmAndamento';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name='Login'    component={Login} options={{ headerShown: false }} /> 
        <Stack.Screen name='Register' component={Register} options={{ headerShown: false }} />
        <Stack.Screen name='Register2' component={Register2} options={{ headerShown: false }}/>
        <Stack.Screen name='Menu'     component={Menu} options={{ headerShown: false }}/>
        <Stack.Screen name="LoginTrabalhador" component={LoginTrabalhador} options={{ headerShown: false }}/>
        <Stack.Screen name="HomeTrabalhador" component={HomeTrabalhador} />
        <Stack.Screen name="Home" component={Menu} options={{ headerShown: false }} />
        <Stack.Screen name="MenuTrabalhador" component={MenuTrabalhador} options={{ headerShown: false }} />
        <Stack.Screen name="ServicosAgendados" component={ServicosAgendados} options={{ headerShown: false }}/>
        <Stack.Screen name='PerfilTrabalhador' component={PerfilTrabalhador} options={{ headerShown: false }}/>
        <Stack.Screen name='Perfil'    component={Perfil} options={{ headerShown: false }}/>
        <Stack.Screen name='EditarPerfil' component={EditarPerfil} options={{ headerShown: false }}/>
        <Stack.Screen name='Profissionais'    component={Profissionais} options={{ headerShown: false }}/>
        <Stack.Screen name='DetalheProfissional' component={DetalheProfissional} options={{ headerShown: false }}/>
        <Stack.Screen name='NovosPrestadores' component={NovosPrestadores} options={{ headerShown: false }}/>
        <Stack.Screen name='PrestadoresPorServico' component={PrestadoresPorServico} options={{ headerShown: false }}/>
        <Stack.Screen name='SolicitarServico' component={SolicitarServico} options={{ headerShown: false }}/>
        <Stack.Screen name='AddServico' component={AddServico} options={{ headerShown: false }}/>
        <Stack.Screen name='ServStatus' component={ServStatus} options={{ headerShown: false }}/>
        <Stack.Screen name='Avaliacao' component={Avaliacao} options={{ headerShown: false }}/>
        <Stack.Screen name='Configuracoes' component={Configuracoes} options={{ headerShown: false }}/>
        <Stack.Screen name='ConfiguracoesPrestador' component={ConfiguracoesPrestador} options={{ headerShown: false }}/>
        <Stack.Screen name='ServicosEmAndamento'    component={ServicosEmAndamento} options={{ headerShown: false }} /> 
        <Stack.Screen name='Chat' component={Chat} options={{ headerShown: false }} />
        <Stack.Screen name='ChatList' component={ChatList} options={{ headerShown: false }} />
        <Stack.Screen name='Adm' component={Adm} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
