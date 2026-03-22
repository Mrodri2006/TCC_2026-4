import { useState } from 'react';
import {
  Text,
  View,
  KeyboardAvoidingView,
  TouchableOpacity,
  //ImageBackground,
  ActivityIndicator,
  StyleSheet,
  Image
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';

export default function LoginTrabalhador() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', senha: '' });

  const navigation = useNavigation<any>();

  const validarEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validarFormulario = () => {
    let novoErros = { email: '', senha: '' };
    let valido = true;

    if (!email.trim()) {
      novoErros.email = 'E-mail é obrigatório';
      valido = false;
    } else if (!validarEmail(email)) {
      novoErros.email = 'E-mail inválido';
      valido = false;
    }

    if (!senha.trim()) {
      novoErros.senha = 'Senha é obrigatória';
      valido = false;
    } else if (senha.length < 6) {
      novoErros.senha = 'Senha deve ter no mínimo 6 caracteres';
      valido = false;
    }

    setErrors(novoErros);
    return valido;
  };

  const logar = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      const userCredentials = await auth.signInWithEmailAndPassword(email, senha);
      console.log('Logado como: ' + userCredentials.user?.email);
      navigation.replace('MenuTrabalhador');
    } catch (erro: any) {
      alert(erro.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior='padding' style={styles.container}>
        <View style={styles.overlay}>
          <View style={styles.content}>

          <View style={styles.headerSection}>
            <Text style={{ fontSize: 20, 
                           color: '#fff', 
                           marginTop: 10, 
                           justifyContent:'flex-start', 
                           alignItems:'flex-start', 
                           marginBottom: 90, 
                           fontWeight: 'bold',}}
                          >
                            TELA DE LOGIN
                        </Text>
                      </View>

            <View style={styles.headerSection}>

                <Image
                source={require('../assets/logo8.jpg')}
                style={{ width: 400, height: 100, marginBottom: 20, }}
                />
            </View>

            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={styles.inactiveTab}
                onPress={() => navigation.replace('Login')}
              >
                <Text style={styles.inactiveTabText}>Contratante</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.activeTab}>
                <Text style={styles.activeTabText}>Prestador</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <TextInput
                label='E-mail'
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                mode='outlined'
                keyboardType='email-address'
                autoCapitalize='none'
              />
              {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

              <TextInput
                label='Senha'
                value={senha}
                onChangeText={setSenha}
                secureTextEntry
                style={styles.input}
                mode='outlined'
              />
              {errors.senha ? <Text style={styles.error}>{errors.senha}</Text> : null}

              <TouchableOpacity
                style={styles.loginButton}
                onPress={logar}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color='#fff' />
                  : <Text style={styles.buttonText}>Entrar</Text>
                }
              </TouchableOpacity>

              <View style={styles.registerRow}>
                <Text>Não tem login? </Text>
                <TouchableOpacity onPress={() => navigation.replace('Register2')}>
                  <Text style={styles.link}>Registre-se</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity>
                <Text style={styles.forgot}>Esqueceu a senha?</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  content: {
    flex: 1,
    paddingHorizontal: 40, // espaçamento lateral unificado
    paddingTop: 50,        // topo da tela
  },

  headerSection: {
    alignItems: 'center',
    marginBottom: 30,       // espaço entre seção de topo e conteúdo
  },

  tituloTopo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 25,      // espaço entre TELA DE LOGIN e logo
  },

  logo: {
    width: 230,
    height: 100,
    marginBottom: 20,       // espaço entre logo e subtítulo
  },

  subtitulo: {
    fontSize: 14,
    color: '#ddd',
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 30,
    marginBottom: 25,
    overflow: 'hidden',
    margin: 20,
  },

  activeTab: {
    flex: 1,
    backgroundColor: '#005362',
    padding: 12,
    alignItems: 'center',
  },

  inactiveTab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },

  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  inactiveTabText: {
    color: '#005362',
    fontWeight: 'bold',
  },

  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    elevation: 6,
  },

  input: {
    marginBottom: 10,
    backgroundColor: '#fff',
  },

  error: {
    color: 'red',
    fontSize: 12,
    marginBottom: 5,
  },

  loginButton: {
    backgroundColor: '#005362',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },

  link: {
    color: '#005362',
    fontWeight: 'bold',
  },

  forgot: {
    textAlign: 'center',
    marginTop: 10,
    color: '#005362',
  },
});

      //<ImageBackground
       // source={require('../assets/imagem.jpg')}
        //resizeMode='cover'
        //style={styles.container}
     // >
     //</ImageBackground>