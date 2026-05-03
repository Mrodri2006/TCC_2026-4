
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

import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ServicosEmAndamento from './screens/ServicosEmAndamento';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { withThemeScreen } from './theme/withThemeScreen';

const Stack = createNativeStackNavigator();

const ThemedLogin = withThemeScreen(Login);
const ThemedRegister = withThemeScreen(Register);
const ThemedRegister2 = withThemeScreen(Register2);
const ThemedMenu = withThemeScreen(Menu);
const ThemedMenuTrabalhador = withThemeScreen(MenuTrabalhador);
const ThemedLoginTrabalhador = withThemeScreen(LoginTrabalhador);
const ThemedHomeTrabalhador = withThemeScreen(HomeTrabalhador);
const ThemedServicosAgendados = withThemeScreen(ServicosAgendados);
const ThemedPerfil = withThemeScreen(Perfil);
const ThemedPerfilTrabalhador = withThemeScreen(PerfilTrabalhador);
const ThemedEditarPerfil = withThemeScreen(EditarPerfil);
const ThemedProfissionais = withThemeScreen(Profissionais);
const ThemedDetalheProfissional = withThemeScreen(DetalheProfissional);
const ThemedNovosPrestadores = withThemeScreen(NovosPrestadores);
const ThemedPrestadoresPorServico = withThemeScreen(PrestadoresPorServico);
const ThemedSolicitarServico = withThemeScreen(SolicitarServico);
const ThemedAddServico = withThemeScreen(AddServico);
const ThemedServStatus = withThemeScreen(ServStatus);
const ThemedAvaliacao = withThemeScreen(Avaliacao);
const ThemedConfiguracoes = withThemeScreen(Configuracoes);
const ThemedConfiguracoesPrestador = withThemeScreen(ConfiguracoesPrestador);
const ThemedChatList = withThemeScreen(ChatList);
const ThemedChat = withThemeScreen(Chat);
const ThemedAdm = withThemeScreen(Adm);
const ThemedServicosEmAndamento = withThemeScreen(ServicosEmAndamento);

function AppInner() {
  const { theme } = useTheme();
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.background,
      card: theme.card,
      border: theme.border,
      text: theme.textPrimary,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator>
        <Stack.Screen name='Login'    component={ThemedLogin} options={{ headerShown: false }} /> 
        <Stack.Screen name='Register' component={ThemedRegister} options={{ headerShown: false }} />
        <Stack.Screen name='Register2' component={ThemedRegister2} options={{ headerShown: false }}/>
        <Stack.Screen name='Menu'     component={ThemedMenu} options={{ headerShown: false }}/>
        <Stack.Screen name="LoginTrabalhador" component={ThemedLoginTrabalhador} options={{ headerShown: false }}/>
        <Stack.Screen name="HomeTrabalhador" component={ThemedHomeTrabalhador} options={{ headerShown: false }}/>
        <Stack.Screen name="Home" component={ThemedMenu} options={{ headerShown: false }} />
        <Stack.Screen name="MenuTrabalhador" component={ThemedMenuTrabalhador} options={{ headerShown: false }} />
        <Stack.Screen name="ServicosAgendados" component={ThemedServicosAgendados} options={{ headerShown: false }}/>
        <Stack.Screen name='PerfilTrabalhador' component={ThemedPerfilTrabalhador} options={{ headerShown: false }}/>
        <Stack.Screen name='Perfil'    component={ThemedPerfil} options={{ headerShown: false }}/>
        <Stack.Screen name='EditarPerfil' component={ThemedEditarPerfil} options={{ headerShown: false }}/>
        <Stack.Screen name='Profissionais'    component={ThemedProfissionais} options={{ headerShown: false }}/>
        <Stack.Screen name='DetalheProfissional' component={ThemedDetalheProfissional} options={{ headerShown: false }}/>
        <Stack.Screen name='NovosPrestadores' component={ThemedNovosPrestadores} options={{ headerShown: false }}/>
        <Stack.Screen name='PrestadoresPorServico' component={ThemedPrestadoresPorServico} options={{ headerShown: false }}/>
        <Stack.Screen name='SolicitarServico' component={ThemedSolicitarServico} options={{ headerShown: false }}/>
        <Stack.Screen name='AddServico' component={ThemedAddServico} options={{ headerShown: false }}/>
        <Stack.Screen name='ServStatus' component={ThemedServStatus} options={{ headerShown: false }}/>
        <Stack.Screen name='Avaliacao' component={ThemedAvaliacao} options={{ headerShown: false }}/>
        <Stack.Screen name='Configuracoes' component={ThemedConfiguracoes} options={{ headerShown: false }}/>
        <Stack.Screen name='ConfiguracoesPrestador' component={ThemedConfiguracoesPrestador} options={{ headerShown: false }}/>
        <Stack.Screen name='ServicosEmAndamento'    component={ThemedServicosEmAndamento} options={{ headerShown: false }} /> 
        <Stack.Screen name='Chat' component={ThemedChat} options={{ headerShown: false }} />
        <Stack.Screen name='ChatList' component={ThemedChatList} options={{ headerShown: false }} />
        <Stack.Screen name='Adm' component={ThemedAdm} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
    
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
