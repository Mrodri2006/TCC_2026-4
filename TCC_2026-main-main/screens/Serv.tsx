/*import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, KeyboardAvoidingView, Button, TouchableOpacity, ImageBackground } from 'react-native';
import { TextInput } from 'react-native-paper';
import { auth, firestore } from '../firebase';
import { useNavigation, useRoute } from '@react-navigation/native';
import styles from '../estilo';
import Aval from '../model/Aval';

import { Picker } from '@react-native-picker/picker';

import { Serv } from '../model/Serv';


export default function CadastroServ() {
  const [formServ, setFormServ] = useState<Partial<Serv>>({})

  const route = useRoute()
  const navigation = useNavigation()

  useEffect(() => {
    if (route.params) {
      setFormServ(route.params.servs)
    }
  }, [route.params])

  const salvar = () => {

    const refServ = firestore.collection("Usuario")
      .doc(auth.currentUser?.uid)
      .collection("Serv")


    const novoServ = new Serv(formServ);
    if (formServ.id) {
      const idServ = refServ.doc(formServ.id);
      idServ.update(novoServ.toFirestore())
        .then(() => {
          alert('Cadastro atualizado')
        })
    }
    else {
      const idServ = refServ.doc();
      novoServ.id = idServ.id
      idServ.set(novoServ.toFirestore())
      alert("Serviço adicionado com sucesso")
      setFormServ({})
    }
  }

  return (
    <KeyboardAvoidingView behavior='padding' style={styles.container}>
      <ImageBackground source={require('../assets/back.png')} resizeMode='stretch' style={styles.container}>
        <Text style={styles.titulo2}>Cadastro de serviços</Text>

        <View style={styles.inputView}>
          <TextInput
            label='estilo'
            onChangeText={valor => setFormServ({
              ...formServ,
              estilo: valor
            })}
            value={formServ.estilo}
            style={styles.input}
            activeUnderlineColor='#005362'
          />

          <TextInput
            label='Local de Serviço'
            onChangeText={valor => setFormServ({
              ...formServ,
              local: valor
            })}
            value={formServ.local}
            style={styles.input}
            activeUnderlineColor='#005362'
          />


          <Picker mode='dialog'
            prompt="Selecione um tipo"
            style={styles.inputPicker}
            onValueChange={valor => setFormServ({
              ...formServ,
              tipo: valor
            })}>
            <Picker.Item label="Pintura" value="Serviço" style={styles.textPicker} />
            <Picker.Item label="Jardinagem" value="Serviço" style={styles.textPicker} />
            <Picker.Item label="Construção" value="Serviço" style={styles.textPicker} />
            <Picker.Item label="Serviço" value="Serviço" style={styles.textPicker} />
          </Picker>


          <TextInput
            label='Data de Serviço'
            onChangeText={valor => setFormServ({
              ...formServ,
              data: valor
            })}
            value={formServ.data}
            style={styles.input}
            activeUnderlineColor='#005362'
          />
        </View>

        <View style={styles.buttonView}>
          <TouchableOpacity style={styles.button} onPress={salvar}>
            <Text style={styles.buttonText}>Salvar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.buttonSec]} onPress={() => navigation.replace('Menu')}>
            <Text style={[styles.buttonText, styles.buttonSecText]}>Voltar</Text>
          </TouchableOpacity>
        </View>

      </ImageBackground>
    </KeyboardAvoidingView>
  );
}
  */