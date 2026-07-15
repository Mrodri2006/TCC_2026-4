import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { ArrowLeft, Edit2, ExternalLink, FileText, Search, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react-native';
import { adminDeleteUsuario, adminListUsuarios, adminSetProviderVerification, adminUpdateUsuario } from '../services/adminService';
import { useTheme } from '../theme/ThemeContext';
import { ProviderTrustBadge } from '../components/ProviderTrustBadge';
import { firestore } from '../firebase';

export default function UsuariosAdm() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useTheme();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<any>(null);
  const [documentosVerificacao, setDocumentosVerificacao] = useState<any[]>([]);
  const [carregandoDocumentos, setCarregandoDocumentos] = useState(false);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    fone: '',
    tipo: 'contratante',
    admin: false,
    profissao: '',
    verificacaoStatus: 'none',
  });

  const cardBg = isDark ? theme.surface : '#FFFFFF';
  const cardBorder = isDark ? theme.surfaceBorder : '#EDF1F6';
  const textColor = theme.textPrimary;
  const mutedColor = theme.textMuted;

  const carregarUsuarios = useCallback(async () => {
    setCarregando(true);
    try {
      const lista = await adminListUsuarios();
      lista.sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || ''));
      setUsuarios(lista);
    } catch (erro) {
      console.error('Erro ao carregar usuários:', erro);
      Alert.alert('Usuários', 'Não foi possível carregar os usuários.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarUsuarios();
    }, [carregarUsuarios])
  );

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter((u) =>
      [u.nome, u.email, u.fone, u.tipo, u.profissao]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo))
    );
  }, [usuarios, busca]);

  const carregarDocumentosVerificacao = async (uid: string) => {
    setCarregandoDocumentos(true);
    try {
      const snapshot = await firestore.collection('Usuario').doc(uid).collection('DocumentosVerificacao')
        .orderBy('criadoEm', 'desc')
        .limit(12)
        .get();
      setDocumentosVerificacao(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (erro) {
      console.error('Erro ao carregar documentos de verificação:', erro);
      setDocumentosVerificacao([]);
    } finally {
      setCarregandoDocumentos(false);
    }
  };

  const abrirEdicao = (usuario: any) => {
    setUsuarioSelecionado(usuario);
    setDocumentosVerificacao([]);
    setForm({
      nome: usuario.nome || '',
      email: usuario.email || '',
      fone: usuario.fone || '',
      tipo: usuario.tipo || 'contratante',
      admin: usuario.admin === true || usuario.tipo === 'admin',
      profissao: usuario.profissao || '',
      verificacaoStatus: getAdminVerificationStatus(usuario),
    });
    setModalVisivel(true);
    if (usuario?.tipo === 'prestador' && !(usuario.admin === true || usuario.tipo === 'admin')) {
      carregarDocumentosVerificacao(usuario.id);
    }
  };

  const fecharModal = () => {
    setModalVisivel(false);
    setUsuarioSelecionado(null);
    setDocumentosVerificacao([]);
  };

  const salvarAlteracoes = async () => {
    if (!usuarioSelecionado?.id) return;
    setSalvando(true);
    try {
      const adminFinal = form.admin || form.tipo === 'admin';
      const tipoFinal = adminFinal ? 'admin' : form.tipo;
      await adminUpdateUsuario(usuarioSelecionado.id, {
        nome: form.nome,
        email: form.email,
        fone: form.fone,
        tipo: tipoFinal,
        admin: adminFinal,
        profissao: form.profissao || null,
      });
      if (tipoFinal === 'prestador') {
        await adminSetProviderVerification(usuarioSelecionado.id, form.verificacaoStatus as any);
      }
      fecharModal();
      carregarUsuarios();
    } catch (erro) {
      console.error('Erro ao atualizar usuário:', erro);
      Alert.alert('Erro', 'Não foi possível atualizar o usuário.');
    } finally {
      setSalvando(false);
    }
  };

  const apagarConta = (usuario: any) => {
    Alert.alert('Excluir usuário', `Excluir a conta de ${usuario?.nome || 'usuário'}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminDeleteUsuario(usuario.id);
            carregarUsuarios();
          } catch (erro) {
            console.error('Erro ao excluir usuário:', erro);
            Alert.alert('Erro', 'Não foi possível excluir o usuário.');
          }
        },
      },
    ]);
  };

  const getInitial = (usuario: any) =>
    String(usuario?.nome || usuario?.email || 'U').trim().charAt(0).toUpperCase() || 'U';

  const getRoleInfo = (usuario: any) => {
    if (usuario.admin === true || usuario.tipo === 'admin') return { label: 'Administrador', color: '#9333EA', bg: '#F3E8FF' };
    if (usuario.tipo === 'prestador') return { label: 'Prestador', color: '#16A34A', bg: '#DCFCE7' };
    return { label: 'Contratante', color: '#FF8700', bg: '#EAF2FF' };
  };

  const getAdminVerificationStatus = (usuario: any) => {
    const status = String(usuario?.verificacaoStatus || '').toLowerCase();
    if (usuario?.prestadorVerificado === true || usuario?.documentosVerificados === true || status === 'aprovado') return 'approved';
    if (status === 'pendente') return 'pending';
    if (status === 'reprovado') return 'rejected';
    return 'none';
  };

  const getDocumentLabel = (tipo: string) => {
    if (tipo === 'identidade') return 'Documento com foto';
    if (tipo === 'cpf_cnpj') return 'CPF ou CNPJ';
    if (tipo === 'endereco') return 'Comprovante de endereço';
    if (tipo === 'certificado') return 'Certificado profissional';
    return 'Documento';
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.topButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={26} color={textColor} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.screenTitle, { color: textColor }]}>Usuários</Text>
            <Text style={[styles.screenSubtitle, { color: mutedColor }]}>Ver e editar contas cadastradas</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Users size={24} color="#FF8700" />
            <Text style={[styles.summaryValue, { color: '#FF8700' }]}>{usuarios.length}</Text>
            <Text style={[styles.summaryLabel, { color: mutedColor }]}>Total</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <UserCog size={24} color="#16A34A" />
            <Text style={[styles.summaryValue, { color: '#16A34A' }]}>
              {usuarios.filter((u) => u.tipo === 'prestador').length}
            </Text>
            <Text style={[styles.summaryLabel, { color: mutedColor }]}>Prestadores</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <ShieldCheck size={24} color="#9333EA" />
            <Text style={[styles.summaryValue, { color: '#9333EA' }]}>
              {usuarios.filter((u) => u.admin === true || u.tipo === 'admin').length}
            </Text>
            <Text style={[styles.summaryLabel, { color: mutedColor }]}>Admins</Text>
          </View>
        </View>

        <View style={[styles.searchBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Search size={22} color={mutedColor} />
          <TextInput
            placeholder="Buscar por nome, email ou telefone..."
            placeholderTextColor={mutedColor}
            value={busca}
            onChangeText={setBusca}
            style={[styles.searchInput, { color: textColor }]}
          />
        </View>

        <View style={styles.listHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Lista de contas</Text>
          <Text style={[styles.countText, { color: mutedColor }]}>{usuariosFiltrados.length}</Text>
        </View>

        {carregando ? (
          <View style={[styles.loadingBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <ActivityIndicator size="small" color="#FF8700" />
            <Text style={[styles.loadingText, { color: mutedColor }]}>Carregando usuários...</Text>
          </View>
        ) : usuariosFiltrados.length > 0 ? (
          <View style={[styles.accountsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {usuariosFiltrados.map((usuario, index) => {
              const role = getRoleInfo(usuario);
              return (
                <View
                  key={usuario.id}
                  style={[
                    styles.accountRow,
                    index > 0 && { borderTopColor: isDark ? theme.surfaceBorder : '#E5EAF0', borderTopWidth: 1 },
                  ]}
                >
                  <View style={[styles.avatar, { backgroundColor: role.bg }]}>
                    <Text style={[styles.avatarText, { color: role.color }]}>{getInitial(usuario)}</Text>
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={[styles.accountName, { color: textColor }]} numberOfLines={1}>
                      {usuario.nome || 'Sem nome'}
                    </Text>
                    <Text style={[styles.accountEmail, { color: mutedColor }]} numberOfLines={1}>
                      {usuario.email || 'Sem email'}
                    </Text>
                    {!!usuario.fone && (
                      <Text style={[styles.accountPhone, { color: mutedColor }]} numberOfLines={1}>
                        {usuario.fone}
                      </Text>
                    )}
                    {usuario.tipo === 'prestador' ? (
                      <ProviderTrustBadge provider={usuario} compact style={styles.accountTrustBadge} />
                    ) : null}
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: role.bg }]}>
                    <Text style={[styles.roleBadgeText, { color: role.color }]}>{role.label}</Text>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.editButton} onPress={() => abrirEdicao(usuario)}>
                      <Edit2 size={16} color="#FF8700" />
                      <Text style={styles.editText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => apagarConta(usuario)}>
                      <Trash2 size={16} color="#DC2626" />
                      <Text style={styles.deleteText}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: mutedColor }]}>Nenhum usuário encontrado.</Text>
        )}

        <Modal visible={modalVisivel} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[styles.modalTitle, { color: textColor }]}>Editar conta</Text>
                <TextInput
                  placeholder="Nome"
                  placeholderTextColor={mutedColor}
                  value={form.nome}
                  onChangeText={(v) => setForm({ ...form, nome: v })}
                  style={[styles.modalInput, { color: textColor, borderColor: theme.border }]}
                />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor={mutedColor}
                  value={form.email}
                  onChangeText={(v) => setForm({ ...form, email: v })}
                  style={[styles.modalInput, { color: textColor, borderColor: theme.border }]}
                  autoCapitalize="none"
                />
                <TextInput
                  placeholder="Telefone"
                  placeholderTextColor={mutedColor}
                  value={form.fone}
                  onChangeText={(v) => setForm({ ...form, fone: v })}
                  style={[styles.modalInput, { color: textColor, borderColor: theme.border }]}
                />
                <TextInput
                  placeholder="Profissão (opcional)"
                  placeholderTextColor={mutedColor}
                  value={form.profissao}
                  onChangeText={(v) => setForm({ ...form, profissao: v })}
                  style={[styles.modalInput, { color: textColor, borderColor: theme.border }]}
                />

                <Text style={[styles.modalLabel, { color: mutedColor }]}>Tipo de conta</Text>
                <View style={[styles.pickerBox, { borderColor: theme.border }]}>
                  <Picker selectedValue={form.tipo} onValueChange={(valor) => setForm({ ...form, tipo: valor })}>
                    <Picker.Item label="Contratante" value="contratante" />
                    <Picker.Item label="Prestador" value="prestador" />
                    <Picker.Item label="Admin" value="admin" />
                  </Picker>
                </View>

                <Text style={[styles.modalLabel, { color: mutedColor }]}>Administrador?</Text>
                <View style={[styles.pickerBox, { borderColor: theme.border }]}>
                  <Picker
                    selectedValue={form.admin ? 'sim' : 'nao'}
                    onValueChange={(valor) => setForm({ ...form, admin: valor === 'sim' })}
                  >
                    <Picker.Item label="Não" value="nao" />
                    <Picker.Item label="Sim" value="sim" />
                  </Picker>
                </View>

                {form.tipo === 'prestador' && !form.admin ? (
                  <>
                    <Text style={[styles.modalLabel, { color: mutedColor }]}>Verificação do prestador</Text>
                    <View style={[styles.pickerBox, { borderColor: theme.border }]}>
                      <Picker
                        selectedValue={form.verificacaoStatus}
                        onValueChange={(valor) => setForm({ ...form, verificacaoStatus: valor })}
                      >
                        <Picker.Item label="Sem verificação" value="none" />
                        <Picker.Item label="Pendente" value="pending" />
                        <Picker.Item label="Aprovado" value="approved" />
                        <Picker.Item label="Reprovado" value="rejected" />
                      </Picker>
                    </View>

                    <Text style={[styles.modalLabel, { color: mutedColor }]}>Documentos enviados</Text>
                    <View style={[styles.documentsBox, { borderColor: theme.border }]}>
                      {carregandoDocumentos ? (
                        <View style={styles.documentLoading}>
                          <ActivityIndicator size="small" color="#FF8700" />
                          <Text style={[styles.documentEmpty, { color: mutedColor }]}>Carregando documentos...</Text>
                        </View>
                      ) : documentosVerificacao.length > 0 ? (
                        documentosVerificacao.map((doc) => (
                          <View key={doc.id} style={[styles.documentRow, { borderBottomColor: theme.border }]}>
                            <FileText size={18} color="#FF8700" />
                            <View style={styles.documentInfo}>
                              <Text style={[styles.documentTitle, { color: textColor }]} numberOfLines={1}>
                                {getDocumentLabel(doc.tipo)}
                              </Text>
                              <Text style={[styles.documentMeta, { color: mutedColor }]} numberOfLines={1}>
                                {doc.nomeArquivo || doc.status || 'Arquivo enviado'}
                              </Text>
                            </View>
                            {!!doc.url && (
                              <TouchableOpacity style={styles.openDocButton} onPress={() => Linking.openURL(doc.url)}>
                                <ExternalLink size={16} color="#FF8700" />
                              </TouchableOpacity>
                            )}
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.documentEmpty, { color: mutedColor }]}>Nenhum documento enviado.</Text>
                      )}
                    </View>
                  </>
                ) : null}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.outlineButton} onPress={fecharModal} disabled={salvando}>
                    <Text style={styles.outlineText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveButton, salvando && styles.disabled]} onPress={salvarAlteracoes} disabled={salvando}>
                    <Text style={styles.saveText}>{salvando ? 'Salvando...' : 'Salvar'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 34,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  topButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  screenTitle: { fontSize: 25, fontWeight: '900' },
  screenSubtitle: { marginTop: 4, fontSize: 14, fontWeight: '700' },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  summaryValue: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: '900',
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800',
  },
  searchBox: {
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '700',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  countText: { fontSize: 14, fontWeight: '900' },
  loadingBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: { fontWeight: '800' },
  accountsCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    minHeight: 86,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 22, fontWeight: '900' },
  accountInfo: { flex: 1, minWidth: 0 },
  accountName: { fontSize: 16, fontWeight: '900', marginBottom: 3 },
  accountEmail: { fontSize: 13, fontWeight: '700' },
  accountPhone: { marginTop: 2, fontSize: 12, fontWeight: '700' },
  accountTrustBadge: { marginTop: 7 },
  roleBadge: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: 10,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 8 },
  editButton: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFD3F8',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editText: { color: '#FF8700', fontSize: 12, fontWeight: '900' },
  deleteButton: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F7B4B4',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteText: { color: '#DC2626', fontSize: 12, fontWeight: '900' },
  emptyText: { paddingVertical: 20, textAlign: 'center', fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 41, 55, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    maxHeight: '88%',
  },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  modalLabel: { fontSize: 12, fontWeight: '800', marginBottom: 6 },
  pickerBox: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  documentsBox: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  documentLoading: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  documentRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  documentInfo: {
    flex: 1,
    minWidth: 0,
  },
  documentTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  documentMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
  },
  openDocButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
  },
  documentEmpty: {
    padding: 14,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  outlineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#FF8700',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineText: { color: '#FF8700', fontWeight: '900' },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF8700',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: { color: '#FFFFFF', fontWeight: '900' },
  disabled: { opacity: 0.6 },
});
