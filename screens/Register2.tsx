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
  Image,
  Modal
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { auth, firestore } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from 'react-native-modal-datetime-picker';
import { Usuario } from '../model/Usuario';
import { Picker } from '@react-native-picker/picker';

export default function Register2() {
  const [formUsuario, setFormUsuario] = useState<Partial<Usuario>>({});
  const [dataPickerVisivel, setDataPickerVisivel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [termosVisivel, setTermosVisivel] = useState(false);
  const [errors, setErrors] = useState({ nome: '', email: '', senha: '', fone: '', dataNascimento: '', termos: '' });
  const [admin, setAdmin] = useState<'nao' | 'sim'>('nao');

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
    let novoErros = { nome: '', email: '', senha: '', fone: '', dataNascimento: '', termos: '' };
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
    if (!aceitouTermos) {
      novoErros.termos = 'Aceite os termos e as especificacoes do app'; valido = false;
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
        tipo: admin === 'sim' ? 'admin' : 'contratante',
        admin: admin === 'sim',
        criadoEm: new Date(),
      });

      navigation.replace(admin === 'sim' ? 'Adm' : 'Home');
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

              <Text style={styles.adminLabel}>Conta de administrador?</Text>

              <View style={styles.adminContainer}>
                <Picker
                  selectedValue={admin}
                  onValueChange={(valor) => setAdmin(valor)}
                  style={styles.select}
                >
                  <Picker.Item label="Nao" value="nao" />
                  <Picker.Item label="Sim" value="sim" />
                </Picker>
              </View>

              <View style={styles.termosRow}>
                <TouchableOpacity
                  style={[styles.checkbox, aceitouTermos && styles.checkboxChecked]}
                  onPress={() => {
                    setAceitouTermos(!aceitouTermos);
                    if (errors.termos) setErrors({ ...errors, termos: '' });
                  }}
                >
                  {aceitouTermos ? <Text style={styles.checkboxMark}>✓</Text> : null}
                </TouchableOpacity>

                <Text style={styles.termosText}>
                  Eu li e aceito os{" "}
                  <Text style={styles.termosLink} onPress={() => setTermosVisivel(true)}>
                    Termos de uso
                  </Text>{" "}
                  e as{" "}
                  <Text style={styles.termosLink} onPress={() => setTermosVisivel(true)}>
                    especificacoes do app
                  </Text>
                  .
                </Text>
              </View>
              {!!errors.termos && <Text style={styles.errorText}>{errors.termos}</Text>}

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

            <Modal
              visible={termosVisivel}
              animationType="slide"
              transparent
              onRequestClose={() => setTermosVisivel(false)}
            >
              <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Termos de uso</Text>
                  <ScrollView style={styles.modalContent}>
                    <Text style={styles.modalText}>
                      1. Ao criar a conta, voce declara que as informacoes fornecidas sao verdadeiras.
                      {"\n\n"}
                      2. O app conecta contratantes e prestadores. Nao garantimos a execucao do servico.
                      {"\n\n"}
                      3. Conteudos ofensivos, fraudulentos ou ilegais podem resultar em bloqueio da conta.
                    </Text>

                    <Text style={styles.modalTitle}>Especificacoes do app</Text>
                    <Text style={styles.modalText}>
                      1. O app utiliza seus dados de cadastro para criar seu perfil e facilitar contatos.
                      {"\n\n"}
                      2. As mensagens e solicitacoes podem ser registradas para fins de seguranca.
                      {"\n\n"}
                      3. Atualizacoes do app podem alterar funcionalidades sem aviso previo.
                    </Text>
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setTermosVisivel(false)}
                  >
                    <Text style={styles.modalButtonText}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

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
  adminLabel: {
    marginTop: 10,
    marginBottom: 8,
    fontWeight: '600',
    color: '#333',
  },
  adminContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 12,
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

  termosRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    marginBottom: 6,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#005362',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },

  checkboxChecked: {
    backgroundColor: '#005362',
  },

  checkboxMark: {
    color: '#fff',
    fontWeight: 'bold',
  },

  termosText: {
    flex: 1,
    color: '#333',
  },

  termosLink: {
    color: '#005362',
    fontWeight: '600',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },

  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    maxHeight: '85%',
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111',
  },

  modalContent: {
    marginBottom: 12,
  },

  modalText: {
    color: '#333',
    marginBottom: 12,
  },

  modalButton: {
    backgroundColor: '#005362',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
