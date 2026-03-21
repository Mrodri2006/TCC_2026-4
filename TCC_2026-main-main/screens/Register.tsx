
import { useState } from 'react';
import {
  Text,
  View,
  KeyboardAvoidingView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Image
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { auth, firestore } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { Usuario } from '../model/Usuario';
import { Picker } from "@react-native-picker/picker";

export default function Register() {

  const [formUsuario, setFormUsuario] = useState<Partial<Usuario>>({});
  const [profissao, setProfissao] = useState('');
  const [loading, setLoading] = useState(false);

  const tiposProfissao = [
    { id: 1, nome: 'Eletricista' },
    { id: 2, nome: 'Diarista' },
    { id: 3, nome: 'Encanador' },
    { id: 4, nome: 'Montagem de Móveis' },
    { id: 5, nome: 'Jardinagem' },
  ];

  const navigation = useNavigation<any>();

  const registrar = async () => {

    if (!formUsuario.email || !formUsuario.senha || !profissao) {
      alert("Preencha todos os campos!");
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
  }

});
