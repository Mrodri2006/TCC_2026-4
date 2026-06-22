import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft, BriefcaseBusiness, Camera, CircleDollarSign, ImagePlus, Save, Trash2 } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageUri } from '../utils/storageUpload';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

export default function AddServico() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { PrestId, servicoId, servico } = route.params || {};
  const { isDark, theme } = useTheme();

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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: theme.headerBtnBg }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <ArrowLeft size={21} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>CATÁLOGO</Text>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            {isEdit ? 'Editar serviço' : 'Novo serviço'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.introCard,
            { backgroundColor: isDark ? theme.surface : '#EAF2FF', borderColor: theme.surfaceBorder },
          ]}
        >
          <View style={[styles.introIcon, isDark && { backgroundColor: theme.headerBtnBg }]}>
            <BriefcaseBusiness size={23} color="#2563EB" />
          </View>
          <View style={styles.introCopy}>
            <Text style={[styles.introTitle, { color: theme.textPrimary }]}>Mostre o valor do seu trabalho</Text>
            <Text style={[styles.introText, { color: theme.textMuted }]}>
              Use um nome claro, um preço objetivo e uma boa imagem para gerar mais confiança.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Informações do serviço</Text>
          <Text style={[styles.requiredText, { color: theme.textMuted }]}>* obrigatórios</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Nome ou categoria *</Text>
          <View style={[styles.inputShell, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <BriefcaseBusiness size={19} color={theme.textMuted} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Ex.: Eletricista residencial"
              value={estilo}
              onChangeText={setEstilo}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Valor inicial *</Text>
          <View style={[styles.inputShell, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <CircleDollarSign size={19} color={theme.textMuted} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="0,00"
              value={valor}
              onChangeText={setValor}
              keyboardType="decimal-pad"
              placeholderTextColor={theme.textMuted}
            />
          </View>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>Informe o preço base para orientar o cliente.</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Imagem de apresentação</Text>
          <Text style={[styles.optionalText, { color: theme.textMuted }]}>Opcional</Text>
        </View>

        {imagem ? (
          <View style={[styles.imagePreview, { borderColor: theme.border }]}>
            <Image source={{ uri: imagem }} style={styles.image} resizeMode="cover" />
            <View style={styles.imageOverlay}>
              <TouchableOpacity style={styles.imageAction} onPress={selecionarImagem} activeOpacity={0.8}>
                <Camera size={17} color="#FFFFFF" />
                <Text style={styles.imageActionText}>Alterar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.imageAction, styles.removeAction]} onPress={limparImagem} activeOpacity={0.8}>
                <Trash2 size={17} color="#FFFFFF" />
                <Text style={styles.imageActionText}>Remover</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.uploadCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={selecionarImagem}
            activeOpacity={0.75}
          >
            <View style={[styles.uploadIcon, { backgroundColor: theme.headerBtnBg }]}>
              <ImagePlus size={27} color="#2563EB" />
            </View>
            <Text style={[styles.uploadTitle, { color: theme.textPrimary }]}>Adicionar uma imagem</Text>
            <Text style={[styles.uploadText, { color: theme.textMuted }]}>JPG ou PNG de até 5 MB</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={salvarServico}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Save size={19} color="#FFFFFF" />}
          <Text style={styles.saveButtonText}>
            {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Publicar serviço'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  header: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerEyebrow: {
    color: '#2563EB',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: { fontSize: 19, lineHeight: 24, fontWeight: '800' },
  headerSpacer: { width: 42 },
  content: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 48 },
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 26,
  },
  introIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introCopy: { flex: 1 },
  introTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', marginBottom: 4 },
  introText: { fontSize: 13, lineHeight: 19 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  requiredText: { fontSize: 11, fontWeight: '600' },
  optionalText: { fontSize: 11, fontWeight: '700' },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  inputShell: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
  },
  input: { flex: 1, minHeight: 52, fontSize: 16, fontWeight: '600' },
  helperText: { fontSize: 12, lineHeight: 17, marginTop: 7 },
  uploadCard: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 20,
    marginBottom: 24,
  },
  uploadIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  uploadText: { fontSize: 12 },
  imagePreview: {
    height: 220,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  image: { width: '100%', height: '100%' },
  imageOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    gap: 8,
  },
  imageAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: 'rgba(15, 41, 55, 0.88)',
  },
  removeAction: { backgroundColor: 'rgba(185, 28, 28, 0.9)' },
  imageActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  saveButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: '#2563EB',
    borderRadius: 17,
    shadowColor: '#2563EB',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  saveButtonDisabled: { opacity: 0.65 },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
