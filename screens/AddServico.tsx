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
import { Camera } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState, useEffect } from "react";
import { auth, firestore, storage } from "../firebase";
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

export default function AddServico() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { PrestId, servicoId, servico } = route.params || {};

  const [estilo, setEstilo] = useState('');
  const [valor, setValor] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagem, setImagem] = useState<string | null>(null);
  const [imagemOriginal, setImagemOriginal] = useState<string | null>(null);

  const isEdit = Boolean(servicoId);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para adicionar imagens.');
      }
    })();
  }, []);

  useEffect(() => {
    if (!servico) return;

    const estiloInicial = servico.estilo || servico.servico || '';
    const valorInicial =
      servico.valor !== undefined && servico.valor !== null
        ? String(servico.valor)
        : '';
    const imagemInicial =
      servico.imagem ||
      servico.imagemUrl ||
      servico.urlImagem ||
      servico.foto ||
      servico.photoUrl ||
      servico.photo ||
      null;

    setEstilo(estiloInicial);
    setValor(valorInicial);
    setImagem(imagemInicial);
    setImagemOriginal(imagemInicial);
  }, [servico]);

  const selecionarImagem = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaType.Images],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImagem(result.assets[0].uri);
    }
  };

  const uploadImagem = async (uri: string, prestId: string) => {
    const timestamp = Date.now();
    const caminho = `servicos/${prestId}/${timestamp}.jpg`;
    const ref = storage.ref().child(caminho);

    try {
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDir) {
        throw new Error('Diretório de cache indisponível.');
      }

      let sourceUri = uri;
      const isHttp = uri.startsWith('http');
      const isContentLike =
        uri.startsWith('content:') ||
        uri.startsWith('ph:') ||
        uri.startsWith('assets-library:');

      if (isHttp) {
        const tempPath = `${baseDir}upload_${timestamp}.jpg`;
        const download = await FileSystem.downloadAsync(uri, tempPath);
        sourceUri = download.uri;
      } else if (isContentLike) {
        const tempPath = `${baseDir}upload_${timestamp}.jpg`;
        await FileSystem.copyAsync({ from: uri, to: tempPath });
        sourceUri = tempPath;
      }

      const base64 = await FileSystem.readAsStringAsync(sourceUri, {
        encoding: 'base64',
      });

      await ref.putString(base64, 'base64', { contentType: 'image/jpeg' });
      const downloadUrl = await ref.getDownloadURL();
      return downloadUrl;
    } catch (error) {
      const err: any = error;
      console.error('Erro ao fazer upload da imagem:', err);
      if (err?.serverResponse) {
        console.error('Resposta do servidor (Storage):', err.serverResponse);
      }
      throw error;
    }
  };

  const salvarServico = async () => {
    if (!estilo || !valor || !PrestId) {
      Alert.alert('Erro', 'Preencha todos os campos obrigat?rios.');
      return;
    }

    setLoading(true);
    try {
      let imagemUrl: string | null = imagemOriginal;

      if (imagem && imagem !== imagemOriginal) {
        if (imagem.startsWith('http')) {
          imagemUrl = imagem;
        } else {
          imagemUrl = await uploadImagem(imagem, PrestId);
        }
      }

      const payload = {
        estilo,
        valor: parseFloat(valor),
        imagem: imagemUrl,
        imagemUrl,
      };

      if (isEdit) {
        await firestore
          .collection('ServicosAdds')
          .doc(PrestId)
          .collection('ServicosOferecidos')
          .doc(servicoId)
          .set(
            {
              ...payload,
              dataAtualizacao: new Date(),
            },
            { merge: true }
          );

        Alert.alert('Sucesso', 'Servi?o atualizado com sucesso!');
      } else {
        await firestore
          .collection('ServicosAdds')
          .doc(PrestId)
          .collection('ServicosOferecidos')
          .add({
            ...payload,
            status: "Oferecido",
            dataCriacao: new Date(),
          });

        Alert.alert('Sucessos', 'Servi?o adicionado com sucesso!');
      }
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao salvar servi?o:', error);
      Alert.alert('Erro', 'N?o foi poss?vel salvar o servi?o.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={{marginTop:40, marginBottom:4, fontSize: 28, fontWeight: "600", color: "#000"}}>
        {isEdit ? 'Editar Serviço' : 'Adicionar Serviço'}
      </Text>

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
        <Text style={styles.saveButtonText}>
          {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar Serviço'}
        </Text>
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
