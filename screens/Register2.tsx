import { useState } from 'react';
import {
  Text,
  View,
  KeyboardAvoidingView,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Image
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { auth, firestore } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from 'react-native-modal-datetime-picker';
import { Usuario } from '../model/Usuario';

export default function Register2() {
  const [formUsuario, setFormUsuario] = useState<Partial<Usuario>>({});
  const [dataPickerVisivel, setDataPickerVisivel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ nome: '', email: '', senha: '', fone: '', dataNascimento: '' });

  const navigation = useNavigation<any>();
// Função para calcular a idade com base na data de nascimento
  const calcularIdade = (data: Date) => {
    const hoje = new Date();
    let idade = hoje.getFullYear() - data.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNasc = data.getMonth();
    if (mesAtual < mesNasc || (mesAtual === mesNasc && hoje.getDate() < data.getDate())) idade--;
    return idade;
  };

  const validarFormulario = () => {
    let novoErros = { nome: '', email: '', senha: '', fone: '', dataNascimento: '' };
    let valido = true;

    if (!formUsuario.nome?.trim()) {
      novoErros.nome = 'Nome é obrigatório'; valido = false;
    } else if (formUsuario.nome.trim().length < 3) {
      novoErros.nome = 'Nome deve ter no mínimo 3 caracteres'; valido = false;
    }
    if (!formUsuario.email?.trim()) {
      novoErros.email = 'E-mail é obrigatório'; valido = false;
    }
    if (!formUsuario.senha?.trim()) {
      novoErros.senha = 'Senha é obrigatória'; valido = false;
    }
    if (!formUsuario.fone?.trim()) {
      novoErros.fone = 'Telefone é obrigatório'; valido = false;
    }
    if (!formUsuario.dataNascimento) {
      novoErros.dataNascimento = 'Data de nascimento é obrigatória'; valido = false;
    } else if (calcularIdade(formUsuario.dataNascimento) < 18) {
      novoErros.dataNascimento = 'Você deve ter no mínimo 18 anos'; valido = false;
    }

    setErrors(novoErros);
    return valido;
  };

  const registrar = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      const userCredentials = await auth.createUserWithEmailAndPassword(formUsuario.email!, formUsuario.senha!);

      await firestore.collection('Usuario').doc(auth.currentUser!.uid).set({
        id: auth.currentUser!.uid,
        nome: formUsuario.nome,
        email: formUsuario.email,
        fone: formUsuario.fone,
        dataNascimento: formUsuario.dataNascimento?.toISOString() || null,
        tipo: 'contratante',
        criadoEm: new Date(),
      });

      navigation.replace('Menu');
    } catch (erro: any) {
      alert(erro.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmarData = (data: Date) => {
    setFormUsuario({ ...formUsuario, dataNascimento: data });
    if (errors.dataNascimento) setErrors({ ...errors, dataNascimento: '' });
    setDataPickerVisivel(false);
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.scroll}>

            <View style={styles.headerSection}>
              <Text style={styles.titulo}>CADASTRO DE USUÁRIOS</Text>
                  <Image
                    source={require('../assets/logo8.jpg')}
                    style={{ 
                      width: 400, 
                      height: 100, 
                      marginVertical: 10, 
                      marginTop: 40, 
                    }}
                  />
            </View>

            <View style={styles.tabContainer}>
              <TouchableOpacity style={styles.activeTab}>
                <Text style={styles.activeTabText}>Contratante</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.inactiveTab}
                onPress={() => navigation.replace('Register')}
              >
                <Text style={styles.inactiveTabText}>Prestador</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <TextInput
                label="Nome"
                value={formUsuario.nome || ''}
                onChangeText={(valor) => setFormUsuario({ ...formUsuario, nome: valor })}
                style={styles.input}
                mode="outlined"
              />

              <TextInput
                label="E-mail"
                value={formUsuario.email || ''}
                onChangeText={(valor) => setFormUsuario({ ...formUsuario, email: valor })}
                style={styles.input}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                label="Senha"
                value={formUsuario.senha || ''}
                onChangeText={(valor) => setFormUsuario({ ...formUsuario, senha: valor })}
                secureTextEntry
                style={styles.input}
                mode="outlined"
              />

              <TextInput
                label="Telefone"
                value={formUsuario.fone || ''}
                onChangeText={(valor) => setFormUsuario({ ...formUsuario, fone: valor })}
                style={styles.input}
                mode="outlined"
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={[styles.input, styles.dateButton]}
                onPress={() => setDataPickerVisivel(true)}
              >
                <Text style={styles.dateButtonText}>
                  {formUsuario.dataNascimento
                    ? formUsuario.dataNascimento.toLocaleDateString('pt-BR')
                    : 'Selecionar data de nascimento'}
                </Text>
              </TouchableOpacity>

              <DateTimePicker
                isVisible={dataPickerVisivel}
                mode="date"
                onConfirm={confirmarData}
                onCancel={() => setDataPickerVisivel(false)}
                maximumDate={new Date()}
              />

              <TouchableOpacity
                style={styles.registerButton}
                onPress={registrar}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>Registrar</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.replace('Login')}
              >
                <Text style={styles.backButtonText}>Voltar ao Login</Text>
              </TouchableOpacity>

            </View>

          </ScrollView>
        </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 ,
    backgroundColor: '#000',
  },
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.55)' 
  },
  scroll: { 
    paddingHorizontal: 25, 
    paddingVertical: 40 
  },
  headerSection:{ 
    alignItems: 'center', 
    marginBottom: 25 
  },
  titulo: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#fff', 
    textAlign: 'center',
    marginTop: 10, 
  },
  subtitulo: { 
    fontSize: 14, 
    color: '#ddd', 
    marginTop: 5 
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
    alignItems: 'center'
  },
  inactiveTab: { 
    flex: 1, 
    padding: 12, 
    alignItems: 'center' 
  },
  activeTabText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  inactiveTabText: { 
    color: '#005362', 
    fontWeight: 'bold' 
  },
  card: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 20, 
    elevation: 6 
  },
  input: { 
    marginBottom: 12, 
    backgroundColor: '#fff' 
  },
  dateButton: { 
    justifyContent: 'center', 
    paddingVertical: 12 
  },
  dateButtonText: { 
    color: '#555' 
  },
  registerButton: { 
    backgroundColor: '#005362', 
    padding: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 10 
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  backButton: { 
    marginTop: 15, 
    alignItems: 'center' 
  },
  backButtonText: { 
    color: '#005362', 
    fontWeight: '600' 
  },
  errorText: { 
    color: '#ff4d4d', 
    marginBottom: 6 
  },
});
