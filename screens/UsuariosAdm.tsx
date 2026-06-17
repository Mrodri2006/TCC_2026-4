import {
  ActivityIndicator,
  Alert,
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
import { ArrowLeft, Edit2, Search, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react-native';
import { adminDeleteUsuario, adminListUsuarios, adminUpdateUsuario } from '../services/adminService';
import { useTheme } from '../theme/ThemeContext';

export default function UsuariosAdm() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useTheme();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<any>(null);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    fone: '',
    tipo: 'contratante',
    admin: false,
    profissao: '',
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
      console.error('Erro ao carregar usuarios:', erro);
      Alert.alert('Usuarios', 'Nao foi possivel carregar os usuarios.');
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

  const abrirEdicao = (usuario: any) => {
    setUsuarioSelecionado(usuario);
    setForm({
      nome: usuario.nome || '',
      email: usuario.email || '',
      fone: usuario.fone || '',
      tipo: usuario.tipo || 'contratante',
      admin: usuario.admin === true || usuario.tipo === 'admin',
      profissao: usuario.profissao || '',
    });
    setModalVisivel(true);
  };

  const fecharModal = () => {
    setModalVisivel(false);
    setUsuarioSelecionado(null);
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
      fecharModal();
      carregarUsuarios();
    } catch (erro) {
      console.error('Erro ao atualizar usuario:', erro);
      Alert.alert('Erro', 'Nao foi possivel atualizar o usuario.');
    } finally {
      setSalvando(false);
    }
  };

  const apagarConta = (usuario: any) => {
    Alert.alert('Excluir usuario', `Excluir a conta de ${usuario?.nome || 'usuario'}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminDeleteUsuario(usuario.id);
            carregarUsuarios();
          } catch (erro) {
            console.error('Erro ao excluir usuario:', erro);
            Alert.alert('Erro', 'Nao foi possivel excluir o usuario.');
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
    return { label: 'Contratante', color: '#2563EB', bg: '#EAF2FF' };
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
            <Text style={[styles.screenTitle, { color: textColor }]}>Usuarios</Text>
            <Text style={[styles.screenSubtitle, { color: mutedColor }]}>Ver e editar contas cadastradas</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Users size={24} color="#2563EB" />
            <Text style={[styles.summaryValue, { color: '#2563EB' }]}>{usuarios.length}</Text>
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
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={[styles.loadingText, { color: mutedColor }]}>Carregando usuarios...</Text>
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
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: role.bg }]}>
                    <Text style={[styles.roleBadgeText, { color: role.color }]}>{role.label}</Text>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.editButton} onPress={() => abrirEdicao(usuario)}>
                      <Edit2 size={16} color="#2563EB" />
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
          <Text style={[styles.emptyText, { color: mutedColor }]}>Nenhum usuario encontrado.</Text>
        )}

        <Modal visible={modalVisivel} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
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
                placeholder="Profissao (opcional)"
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
                  <Picker.Item label="Nao" value="nao" />
                  <Picker.Item label="Sim" value="sim" />
                </Picker>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.outlineButton} onPress={fecharModal} disabled={salvando}>
                  <Text style={styles.outlineText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, salvando && styles.disabled]} onPress={salvarAlteracoes} disabled={salvando}>
                  <Text style={styles.saveText}>{salvando ? 'Salvando...' : 'Salvar'}</Text>
                </TouchableOpacity>
              </View>
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
  editText: { color: '#2563EB', fontSize: 12, fontWeight: '900' },
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
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  outlineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineText: { color: '#2563EB', fontWeight: '900' },
  saveButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: { color: '#FFFFFF', fontWeight: '900' },
  disabled: { opacity: 0.6 },
});
