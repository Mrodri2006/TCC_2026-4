import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { Camera, Trash2 } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageUri } from '../utils/storageUpload';

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
        Alert.alert(
          'Permissão necessária',
          'Precisamos de acesso à galeria para você selecionar uma imagem.'
        );
      }
    })();
  }, []);

  useEffect(() => {
    if (!servico) return;

    const estiloInicial = servico.estilo || servico.servico || '';
    const valorInicial =
      servico.valor !== undefined && servico.valor !== null ? String(servico.valor) : '';
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
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setImagem(asset.uri);
    }
  };

  const limparImagem = () => {
    setImagem(null);
  };

  const uploadImagem = async (uri: string, prestId: string) => {
    const timestamp = Date.now();
    const caminho = `servicos/${prestId}/${timestamp}.jpg`;

    try {
      const { url } = await uploadImageUri(uri, caminho);
      return url;
    } catch (error) {
      const err: any = error;
      console.error('Erro ao fazer upload da imagem:', {
        uri,
        message: err?.message,
        code: err?.code,
        name: err?.name,
        stack: err?.stack,
      });
      throw error;
    }
  };

  const validarCampos = () => {
    if (!estilo.trim() || !valor.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
      return false;
    }

    const valorNumerico = Number(valor.replace(',', '.'));
    if (Number.isNaN(valorNumerico) || valorNumerico <= 0) {
      Alert.alert('Erro', 'Informe um valor válido maior que zero.');
      return false;
    }

    return true;
  };

  const salvarServico = async () => {
    if (!validarCampos()) {
      return;
    }

    const prestadorId = PrestId || auth.currentUser?.uid;
    if (!prestadorId) {
      Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
      return;
    }

    setLoading(true);

    try {
      let imagemUrl: string | null = imagemOriginal;

      if (imagem && imagem !== imagemOriginal) {
        imagemUrl = imagem.startsWith('http')
          ? imagem
          : await uploadImagem(imagem, prestadorId);
      }

      const payload = {
        estilo: estilo.trim(),
        valor: Number(valor.replace(',', '.')),
        imagem: imagemUrl,
        imagemUrl,
      };

      const servicoCollection = firestore
        .collection('ServicosAdds')
        .doc(prestadorId)
        .collection('ServicosOferecidos');

      if (isEdit && servicoId) {
        await servicoCollection.doc(servicoId).set(
          {
            ...payload,
            dataAtualizacao: new Date(),
          },
          { merge: true }
        );
        Alert.alert('Sucesso', 'Serviço atualizado com sucesso!');
      } else {
        await servicoCollection.add({
          ...payload,
          status: 'Oferecido',
          dataCriacao: new Date(),
        });
        Alert.alert('Sucesso', 'Serviço adicionado com sucesso!');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      Alert.alert('Erro', 'Não foi possível salvar o serviço. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{isEdit ? 'Editar Serviço' : 'Adicionar Serviço'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Estilo do serviço (ex: Eletricista)"
        value={estilo}
        onChangeText={setEstilo}
        placeholderTextColor="#999"
        autoCapitalize="words"
      />

      <TextInput
        style={styles.input}
        placeholder="Valor (R$)"
        value={valor}
        onChangeText={setValor}
        keyboardType="numeric"
        placeholderTextColor="#999"
      />

      <View style={styles.imageRow}>
        <TouchableOpacity style={styles.imageButton} onPress={selecionarImagem}>
          <Camera size={20} color="#fff" />
          <Text style={styles.imageButtonText}>
            {imagem ? 'Alterar imagem' : 'Escolher imagem'}
          </Text>
        </TouchableOpacity>

        {imagem ? (
          <TouchableOpacity style={styles.removeImageButton} onPress={limparImagem}>
            <Trash2 size={20} color="#fff" />
            <Text style={styles.imageButtonText}>Remover</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {imagem ? (
        <View style={styles.imagePreview}>
          <Image source={{ uri: imagem }} style={styles.image} resizeMode="cover" />
        </View>
      ) : (
        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderText}>Nenhuma imagem selecionada</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={salvarServico}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>
          {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar serviço'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 40,
    marginBottom: 24,
    color: '#111',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fbfbfb',
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    marginRight: 8,
  },
  removeImageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 10,
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '600',
  },
  placeholderBox: {
    height: 150,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#f8fafc',
  },
  placeholderText: {
    color: '#6b7280',
    fontSize: 15,
  },
  imagePreview: {
    alignItems: 'center',
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  saveButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#6ee7b7',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
});
