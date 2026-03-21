import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Image,
} from "react-native";
import { MapPin, Clock, Plus, User, CheckCircle, X, Camera } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState, useEffect } from "react";
import { auth, firestore } from "../firebase";
import * as ImagePicker from 'expo-image-picker';

export default function AddServico() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { PrestId } = route.params || {};

  const [estilo, setEstilo] = useState('');
  const [valor, setValor] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagem, setImagem] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para adicionar imagens.');
      }
    })();
  }, []);

  const selecionarImagem = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImagem(result.assets[0].uri);
    }
  };

  const salvarServico = async () => {
    if (!estilo || !valor || !PrestId) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      await firestore
        .collection('ServicosAdds')
        .doc(PrestId)
        .collection('ServicosOferecidos')
        .add({
          estilo,
          valor: parseFloat(valor),
          imagem,
          status: "Oferecido",
          dataCriacao: new Date(),
        });

      Alert.alert('Sucessos', 'Serviço adicionado com sucesso!');
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      Alert.alert('Erro', 'Não foi possível salvar o serviço.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={{marginTop:40, marginBottom:4, fontSize: 28, fontWeight: "600", color: "#000"}}>Adicionar Serviço</Text>

      <TextInput
        style={styles.input}
        placeholder="Estilo do serviço (ex: Eletricista)"
        value={estilo}
        onChangeText={setEstilo}
      />

      <TextInput
        style={styles.input}
        placeholder="Valor (R$)"
        value={valor}
        onChangeText={setValor}
        keyboardType="numeric"
      />

      <TouchableOpacity style={styles.imageButton} onPress={selecionarImagem}>
        <Camera size={24} color="#fff" />
        <Text style={styles.imageButtonText}>Adicionar Imagem</Text>
      </TouchableOpacity>

      {imagem && (
        <View style={styles.imagePreview}>
          <Image source={{ uri: imagem }} style={styles.image} />
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={salvarServico} disabled={loading}>
        <Text style={styles.saveButtonText}>{loading ? 'Salvando...' : 'Salvar Serviço'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e90ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  imagePreview: {
    alignItems: 'center',
    marginBottom: 16,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
