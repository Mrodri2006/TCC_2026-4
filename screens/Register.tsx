
import { useEffect, useState } from 'react';
import {
  Text,
  View,
  KeyboardAvoidingView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  Linking
} from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { TextInput } from 'react-native-paper';
import { auth, firestore } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { Usuario } from '../model/Usuario';
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from 'react-native-modal-datetime-picker';

export default function Register() {

  const [formUsuario, setFormUsuario] = useState<Partial<Usuario>>({});
  const [profissao, setProfissao] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataPickerVisivel, setDataPickerVisivel] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [termosVisivel, setTermosVisivel] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfCarregando, setPdfCarregando] = useState(false);
  const [pdfErro, setPdfErro] = useState(false);

  useEffect(() => {
    const carregarPdf = async () => {
      try {
        setPdfCarregando(true);
        const asset = Asset.fromModule(require('../assets/termos_prestador_app.pdf'));
        await asset.downloadAsync();
        const sourceUri = asset.localUri || asset.uri;
        const cacheUri = `${FileSystem.cacheDirectory}termos_prestador_app.pdf`;
        const info = await FileSystem.getInfoAsync(cacheUri);
        if (!info.exists) {
          await FileSystem.copyAsync({ from: sourceUri, to: cacheUri });
        }
        setPdfUri(cacheUri);
        setPdfErro(false);
      } catch {
        setPdfUri(null);
        setPdfErro(true);
      } finally {
        setPdfCarregando(false);
      }
    };
    carregarPdf();
  }, []);

  const abrirPdfExterno = async () => {
    try {
      setPdfCarregando(true);
      let uri = pdfUri;
      if (!uri) {
        const asset = Asset.fromModule(require('../assets/termos_prestador_app.pdf'));
        await asset.downloadAsync();
        const sourceUri = asset.localUri || asset.uri;
        const cacheUri = `${FileSystem.cacheDirectory}termos_prestador_app.pdf`;
        const info = await FileSystem.getInfoAsync(cacheUri);
        if (!info.exists) {
          await FileSystem.copyAsync({ from: sourceUri, to: cacheUri });
        }
        uri = cacheUri;
        setPdfUri(uri);
      }
      if (uri) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf',
          });
        } else {
          await Linking.openURL(uri);
        }
        setPdfErro(false);
      } else {
        setPdfErro(true);
      }
    } catch {
      setPdfErro(true);
    } finally {
      setPdfCarregando(false);
    }
  };

  const tiposProfissao = [
    { id: 1, nome: 'Eletricista' },
    { id: 2, nome: 'Diarista' },
    { id: 3, nome: 'Encanador' },
    { id: 4, nome: 'Montagem de Móveis' },
    { id: 5, nome: 'Jardinagem' },
  ];

  const navigation = useNavigation<any>();

  const calcularIdade = (data: Date) => {
    const hoje = new Date();
    let idade = hoje.getFullYear() - data.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNasc = data.getMonth();
    if (mesAtual < mesNasc || (mesAtual === mesNasc && hoje.getDate() < data.getDate())) idade--;
    return idade;
  };

  const registrar = async () => {

    if (!formUsuario.email || !formUsuario.senha || !profissao || !formUsuario.dataNascimento) {
      alert("Preencha todos os campos!");
      return;
    }
    if (!aceitouTermos) {
      alert("Aceite os termos e as especificacoes do app para continuar.");
      return;
    }
    if (calcularIdade(formUsuario.dataNascimento) < 18) {
      alert("Você deve ter no mínino 18 anos de idade para se cadstrar!");
      return;
    }

    setLoading(true);

    try {

      await auth.createUserWithEmailAndPassword(
        formUsuario.email,
        formUsuario.senha
      );

      await firestore
        .collection('Usuario')
        .doc(auth.currentUser!.uid)
        .set({
          id: auth.currentUser!.uid,
          nome: formUsuario.nome,
          email: formUsuario.email,
          fone: formUsuario.fone,
          dataNascimento: formUsuario.dataNascimento?.toISOString() || null,
          tipo: 'prestador',
          profissao: profissao,
          criadoEm: new Date(),
        });

      navigation.replace('HomeTrabalhador');

    } catch (erro: any) {
      alert(erro.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmarData = (data: Date) => {
    setFormUsuario({ ...formUsuario, dataNascimento: data });
    setDataPickerVisivel(false);
  };

  return (
    <KeyboardAvoidingView behavior='padding' style={styles.container}>
      <View style={styles.overlay}>

        <ScrollView contentContainerStyle={styles.scroll}>

          <View style={styles.headerSection}>
            <Text style={styles.titulo}>CADASTRO DE PRESTADOR</Text>

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

            <TouchableOpacity
              style={styles.inactiveTab}
              onPress={() => navigation.replace('Register2')}
            >
              <Text style={styles.inactiveTabText}>Contratante</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.activeTab}>
              <Text style={styles.activeTabText}>Prestador</Text>
            </TouchableOpacity>

          </View>

          <View style={styles.card}>

            <TextInput
              label='Nome'
              value={formUsuario.nome || ''}
              onChangeText={(valor) =>
                setFormUsuario({ ...formUsuario, nome: valor })
              }
              style={styles.input}
              mode='outlined'
            />

            <TextInput
              label='E-mail'
              value={formUsuario.email || ''}
              onChangeText={(valor) =>
                setFormUsuario({ ...formUsuario, email: valor })
              }
              style={styles.input}
              mode='outlined'
              keyboardType='email-address'
              autoCapitalize='none'
            />

            <TextInput
              label='Senha'
              value={formUsuario.senha || ''}
              onChangeText={(valor) =>
                setFormUsuario({ ...formUsuario, senha: valor })
              }
              secureTextEntry
              style={styles.input}
              mode='outlined'
            />

            <TextInput
              label='Telefone'
              value={formUsuario.fone || ''}
              onChangeText={(valor) =>
                setFormUsuario({ ...formUsuario, fone: valor })
              }
              style={styles.input}
              mode='outlined'
              keyboardType='phone-pad'
            />

            <TouchableOpacity
              style={[styles.input, styles.dateButton]}
              onPress={() => setDataPickerVisivel(true)}
            >
              <Text style={styles.dateButtonText}>
                {formUsuario.dataNascimento
                  ? formUsuario.dataNascimento.toLocaleDateString("pt-BR")
                  : "Selecionar data de nascimento"}
              </Text>
            </TouchableOpacity>

            <DateTimePicker
              isVisible={dataPickerVisivel}
              mode="date"
              onConfirm={confirmarData}
              onCancel={() => setDataPickerVisivel(false)}
              maximumDate={new Date()}
            />

            <Text style={styles.profissaoLabel}>
              Selecione sua profissão:
            </Text>

            <View style={styles.profissaoContainer}>

              <Picker
                selectedValue={profissao}
                onValueChange={(itemValue) => setProfissao(itemValue)}
                style={styles.select}
              >

                <Picker.Item
                  label="Selecione uma profissão"
                  value=""
                />

                {tiposProfissao.map((prof) => (
                  <Picker.Item
                    key={prof.id}
                    label={prof.nome}
                    value={prof.nome}
                  />
                ))}

              </Picker>

            </View>

            <View style={styles.termosRow}>
              <TouchableOpacity
                style={[styles.checkbox, aceitouTermos && styles.checkboxChecked]}
                onPress={() => setAceitouTermos(!aceitouTermos)}
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

            <TouchableOpacity
              style={styles.registerButton}
              onPress={registrar}
              disabled={loading}
            >

              {loading
                ? <ActivityIndicator color='#fff' />
                : <Text style={styles.buttonText}>Registrar</Text>
              }

            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.replace('Login')}
            >
              <Text style={styles.backButtonText}>
                Voltar ao Login
              </Text>
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
                <Text style={styles.modalTitle}>Termos de uso (Prestador)</Text>
                <View style={styles.modalContent}>
                  <Text style={styles.modalText}>
                    Para ver o PDF completo, abra no visualizador externo.
                  </Text>
                  {!!pdfErro && (
                    <Text style={styles.modalText}>
                      Nao foi possivel abrir o PDF. Verifique o arquivo em assets.
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.openPdfButton}
                    onPress={abrirPdfExterno}
                    disabled={pdfCarregando}
                  >
                    {pdfCarregando
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.openPdfButtonText}>Abrir PDF</Text>
                    }
                  </TouchableOpacity>
                </View>

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
    flex: 1,
    backgroundColor: '#000',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  scroll: {
    paddingHorizontal: 25,
    paddingVertical: 40,
  },

  headerSection: {
    alignItems: 'center',
    marginBottom: 25,
  },

  titulo: {
   fontSize: 22, 
    fontWeight: 'bold', 
    color: '#fff', 
    textAlign: 'center',
    marginTop: 10,
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
    marginBottom: 12,
    backgroundColor: '#fff',
  },

  dateButton: {
    justifyContent: 'center',
    paddingVertical: 12,
  },

  dateButtonText: {
    color: '#555',
  },

  profissaoLabel: {
    marginTop: 10,
    marginBottom: 8,
    fontWeight: '600',
    color: '#333',
  },

  profissaoContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 15,
  },

  select: {
    width: "100%",
  },

  registerButton: {
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

  backButton: {
    marginTop: 15,
    alignItems: 'center',
  },

  backButtonText: {
    color: '#005362',
    fontWeight: '600',
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
    height: '85%',
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

  openPdfButton: {
    marginTop: 8,
    backgroundColor: '#005362',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  openPdfButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

});
