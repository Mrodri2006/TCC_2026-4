import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { auth, firestore } from '../firebase';
import { adminDeleteUsuario, adminListUsuarios, adminUpdateUsuario } from '../services/adminService';
import { computeNextDueDate } from '../utils/billingDates';

export default function Adm() {
  const navigation = useNavigation<any>();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(true);
  const [busca, setBusca] = useState('');
  const [modalVisivel, setModalVisivel] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<any>(null);
  const [acessoLiberado, setAcessoLiberado] = useState(false);
  const [solicitacoesPagamento, setSolicitacoesPagamento] = useState<any[]>([]);
  const [carregandoSolicitacoes, setCarregandoSolicitacoes] = useState(true);
  const [processandoPagamentoId, setProcessandoPagamentoId] = useState<string | null>(null);
  const [processandoUsuarioId, setProcessandoUsuarioId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    fone: '',
    tipo: 'contratante',
    admin: false,
    profissao: '',
  });

  const mensagemErroAdmin = (erro: any) => {
    const codigo = String(erro?.code || erro?.message || '').toLowerCase();
    if (codigo.includes('permission-denied')) {
      return 'Sua conta precisa ter admin=true e tipo="admin" no Firestore.';
    }
    return 'Nao foi possivel acessar os dados do painel ADM.';
  };

  const sairDoPainel = () => {
    if (typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const buscarUsuarios = async () => {
    setCarregandoUsuarios(true);
    try {
      const lista = await adminListUsuarios();
      lista.sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || ''));
      setUsuarios(lista);
      setAcessoLiberado(true);
    } catch (erro) {
      console.error('Erro ao buscar usuarios:', erro);
      setAcessoLiberado(false);
      Alert.alert('Painel ADM', mensagemErroAdmin(erro));
      sairDoPainel();
    } finally {
      setCarregandoUsuarios(false);
    }
  };

  const buscarSolicitacoesPagamento = async () => {
    setCarregandoSolicitacoes(true);
    try {
      const snap = await firestore
        .collection('SolicitacoesMensalidade')
        .where('status', '==', 'pendente')
        .get();
      const lista = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => {
          const aTime = a.criadoEm?.toDate?.()?.getTime?.() || a.criadoEm?.getTime?.() || 0;
          const bTime = b.criadoEm?.toDate?.()?.getTime?.() || b.criadoEm?.getTime?.() || 0;
          return bTime - aTime;
        });
      setSolicitacoesPagamento(lista);
    } catch (erro) {
      console.error('Erro ao buscar solicitacoes de pagamento:', erro);
      Alert.alert('Pagamentos', 'Nao foi possivel carregar as solicitacoes de mensalidade.');
    } finally {
      setCarregandoSolicitacoes(false);
    }
  };

  useEffect(() => {
    const validarAcesso = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) {
          Alert.alert('Acesso negado', 'Faça login para acessar o painel.');
          setCarregandoUsuarios(false);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }

        await buscarUsuarios();
        await buscarSolicitacoesPagamento();
      } catch (erro) {
        console.error('Erro ao validar acesso admin:', erro);
        Alert.alert('Erro', 'Nao foi possivel validar suas permissoes.');
        sairDoPainel();
      }
    };

    validarAcesso();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo || !acessoLiberado) return usuarios;
    return usuarios.filter((u) =>
      [u.nome, u.email, u.fone, u.tipo, u.profissao]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(termo))
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
      buscarUsuarios();
    } catch (erro) {
      console.error('Erro ao atualizar usuario:', erro);
      Alert.alert('Erro', mensagemErroAdmin(erro));
    }
  };

  const apagarConta = (usuario: any) => {
    Alert.alert(
      'Apagar conta',
      `Tem certeza que deseja apagar a conta de ${usuario?.nome || 'usuario'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminDeleteUsuario(usuario.id);
              buscarUsuarios();
            } catch (erro) {
              console.error('Erro ao apagar usuario:', erro);
              Alert.alert('Erro', mensagemErroAdmin(erro));
            }
          },
        },
      ]
    );
  };

  const dataFromField = (valor: any) => {
    if (!valor) return null;
    if (typeof valor?.toDate === 'function') return valor.toDate();
    if (valor instanceof Date) return valor;
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? null : data;
  };

  const confirmarPagamento = async (solicitacao: any) => {
    if (!solicitacao?.uid) return;
    setProcessandoPagamentoId(solicitacao.id);
    try {
      const userRef = firestore.collection('Usuario').doc(solicitacao.uid);
      const userSnap = await userRef.get();
      const user = userSnap.data() || {};
      const dataCadastro = dataFromField(user.dataCadastro || user.criadoEm) || new Date();
      const proximoVencimento = computeNextDueDate(dataCadastro, new Date());
      const agora = new Date();

      await userRef.set(
        {
          assinaturaAtiva: true,
          contaAtiva: true,
          statusPagamento: 'pago',
          ultimoPagamento: agora,
          dataVencimento: proximoVencimento,
          valorMensalidade: Number(solicitacao.valor || user.valorMensalidade || 29.9),
          atualizadoEm: agora,
        },
        { merge: true }
      );

      await firestore.collection('SolicitacoesMensalidade').doc(solicitacao.id).set(
        {
          status: 'confirmado',
          confirmadoEm: agora,
          confirmadoPor: auth.currentUser?.uid || null,
          atualizadoEm: agora,
        },
        { merge: true }
      );

      await userRef.collection('Notificacoes').add({
        type: 'billing_paid_manual',
        title: 'Pagamento confirmado',
        body: 'Seu pagamento foi confirmado pelo ADM e sua conta foi liberada.',
        lida: false,
        criadoEm: agora,
      });

      Alert.alert('Pagamento confirmado', 'Conta liberada com sucesso.');
      buscarUsuarios();
      buscarSolicitacoesPagamento();
    } catch (erro) {
      console.error('Erro ao confirmar pagamento:', erro);
      Alert.alert('Erro', 'Nao foi possivel confirmar o pagamento.');
    } finally {
      setProcessandoPagamentoId(null);
    }
  };

  const recusarPagamento = async (solicitacao: any) => {
    if (!solicitacao?.uid) return;
    setProcessandoPagamentoId(solicitacao.id);
    try {
      const agora = new Date();
      const userRef = firestore.collection('Usuario').doc(solicitacao.uid);

      await firestore.collection('SolicitacoesMensalidade').doc(solicitacao.id).set(
        {
          status: 'recusado',
          recusadoEm: agora,
          recusadoPor: auth.currentUser?.uid || null,
          atualizadoEm: agora,
        },
        { merge: true }
      );

      await userRef.collection('Notificacoes').add({
        type: 'billing_rejected_manual',
        title: 'Pagamento nao confirmado',
        body: 'O ADM nao localizou o pagamento. Confira os dados do Pix e tente novamente.',
        lida: false,
        criadoEm: agora,
      });

      Alert.alert('Pagamento recusado', 'A solicitacao foi marcada como nao confirmada.');
      buscarSolicitacoesPagamento();
    } catch (erro) {
      console.error('Erro ao recusar pagamento:', erro);
      Alert.alert('Erro', 'Nao foi possivel recusar o pagamento.');
    } finally {
      setProcessandoPagamentoId(null);
    }
  };

  const bloquearPrestador = (usuario: any) => {
    Alert.alert(
      'Bloquear prestador',
      `Bloquear a conta de ${usuario?.nome || 'prestador'} por mensalidade em atraso?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            if (!usuario?.id) return;
            setProcessandoUsuarioId(usuario.id);
            try {
              const agora = new Date();
              const userRef = firestore.collection('Usuario').doc(usuario.id);

              await userRef.set(
                {
                  assinaturaAtiva: false,
                  contaAtiva: false,
                  statusPagamento: 'inadimplente',
                  bloqueadoEm: agora,
                  motivoBloqueio: 'mensalidade_em_atraso',
                  atualizadoEm: agora,
                },
                { merge: true }
              );

              await userRef.collection('Notificacoes').add({
                type: 'billing_blocked_manual',
                title: 'Conta bloqueada',
                body: 'Sua conta foi bloqueada por mensalidade em atraso.',
                lida: false,
                criadoEm: agora,
              });

              Alert.alert('Conta bloqueada', 'O prestador foi bloqueado.');
              buscarUsuarios();
            } catch (erro) {
              console.error('Erro ao bloquear prestador:', erro);
              Alert.alert('Erro', 'Nao foi possivel bloquear a conta.');
            } finally {
              setProcessandoUsuarioId(null);
            }
          },
        },
      ]
    );
  };

  const marcarPrestadorComoPago = async (usuario: any) => {
    if (!usuario?.id) return;
    setProcessandoUsuarioId(usuario.id);
    try {
      const agora = new Date();
      const userRef = firestore.collection('Usuario').doc(usuario.id);
      const dataCadastro = dataFromField(usuario.dataCadastro || usuario.criadoEm) || new Date();
      const proximoVencimento = computeNextDueDate(dataCadastro, agora);

      await userRef.set(
        {
          assinaturaAtiva: true,
          contaAtiva: true,
          statusPagamento: 'pago',
          ultimoPagamento: agora,
          dataVencimento: proximoVencimento,
          valorMensalidade: Number(usuario.valorMensalidade || 29.9),
          atualizadoEm: agora,
        },
        { merge: true }
      );

      await userRef.collection('Notificacoes').add({
        type: 'billing_paid_manual',
        title: 'Pagamento confirmado',
        body: 'Seu pagamento foi confirmado pelo ADM e sua conta foi liberada.',
        lida: false,
        criadoEm: agora,
      });

      Alert.alert('Pagamento registrado', 'Conta liberada e vencimento atualizado.');
      buscarUsuarios();
    } catch (erro) {
      console.error('Erro ao marcar pagamento:', erro);
      Alert.alert('Erro', 'Nao foi possivel marcar como pago.');
    } finally {
      setProcessandoUsuarioId(null);
    }
  };

  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const prestadoresEmAtraso = usuarios
    .filter((usuario) => {
      const vencimento = dataFromField(usuario.dataVencimento);
      return usuario.tipo === 'prestador' && !!vencimento && vencimento.getTime() < inicioHoje.getTime();
    })
    .map((usuario) => {
      const vencimento = dataFromField(usuario.dataVencimento)!;
      const diasAtraso = Math.max(1, Math.floor((inicioHoje.getTime() - vencimento.getTime()) / 86400000));
      return { ...usuario, vencimento, diasAtraso };
    })
    .sort((a, b) => b.diasAtraso - a.diasAtraso);

  const totalUsuarios = usuarios.length;
  const totalPrestadores = usuarios.filter((u) => u.tipo === 'prestador').length;
  const totalAdmins = usuarios.filter((u) => u.admin === true || u.tipo === 'admin').length;
  const totalPendentes = solicitacoesPagamento.length;
  const totalAtrasados = prestadoresEmAtraso.length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Painel ADM</Text>
        <Text style={styles.subtitle}>Informacoes e gerenciamento de usuarios.</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Usuarios</Text>
          <Text style={styles.statValue}>{totalUsuarios}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Prestadores</Text>
          <Text style={styles.statValue}>{totalPrestadores}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Admins</Text>
          <Text style={styles.statValue}>{totalAdmins}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pix</Text>
          <Text style={styles.statValue}>{totalPendentes}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Atraso</Text>
          <Text style={styles.statValue}>{totalAtrasados}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pagamentos pendentes</Text>
        {carregandoSolicitacoes ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#005362" />
            <Text style={styles.loadingText}>Carregando pagamentos...</Text>
          </View>
        ) : solicitacoesPagamento.length > 0 ? (
          solicitacoesPagamento.map((solicitacao) => (
            <View key={solicitacao.id} style={styles.paymentCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{solicitacao.nome || 'Prestador'}</Text>
                <Text style={styles.userMeta}>{solicitacao.email || 'Sem email'}</Text>
                <Text style={styles.userMeta}>Valor: R$ {Number(solicitacao.valor || 0).toFixed(2)}</Text>
                <Text style={styles.userMeta}>TXID: {solicitacao.pixTxid || '-'}</Text>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity
                  style={[styles.smallButton, processandoPagamentoId === solicitacao.id && styles.disabledButton]}
                  onPress={() => confirmarPagamento(solicitacao)}
                  disabled={processandoPagamentoId === solicitacao.id}
                >
                  <Text style={styles.smallButtonText}>Confirmar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dangerButton, processandoPagamentoId === solicitacao.id && styles.disabledButton]}
                  onPress={() => recusarPagamento(solicitacao)}
                  disabled={processandoPagamentoId === solicitacao.id}
                >
                  <Text style={styles.dangerButtonText}>Recusar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Nenhum pagamento pendente.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prestadores em atraso</Text>
        {carregandoUsuarios ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#005362" />
            <Text style={styles.loadingText}>Verificando vencimentos...</Text>
          </View>
        ) : prestadoresEmAtraso.length > 0 ? (
          prestadoresEmAtraso.map((usuario) => (
            <View key={usuario.id} style={styles.overdueCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{usuario.nome || 'Prestador'}</Text>
                <Text style={styles.userMeta}>{usuario.email || 'Sem email'}</Text>
                <Text style={styles.userMeta}>Vencimento: {usuario.vencimento.toLocaleDateString('pt-BR')}</Text>
                <Text style={styles.userMeta}>Dias em atraso: {usuario.diasAtraso}</Text>
                <Text style={styles.userMeta}>
                  Status: {usuario.statusPagamento || '-'} {usuario.contaAtiva === false ? '(bloqueado)' : ''}
                </Text>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity
                  style={[styles.smallButton, processandoUsuarioId === usuario.id && styles.disabledButton]}
                  onPress={() => marcarPrestadorComoPago(usuario)}
                  disabled={processandoUsuarioId === usuario.id}
                >
                  <Text style={styles.smallButtonText}>Marcar pago</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dangerButton, processandoUsuarioId === usuario.id && styles.disabledButton]}
                  onPress={() => bloquearPrestador(usuario)}
                  disabled={processandoUsuarioId === usuario.id}
                >
                  <Text style={styles.dangerButtonText}>Bloquear</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Nenhum prestador em atraso.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contas</Text>
        <TextInput
          placeholder="Buscar por nome, email, telefone..."
          placeholderTextColor="#7a8b91"
          value={busca}
          onChangeText={setBusca}
          style={styles.searchInput}
        />

        {carregandoUsuarios ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#005362" />
            <Text style={styles.loadingText}>Carregando usuarios...</Text>
          </View>
        ) : usuariosFiltrados.length > 0 ? (
          <ScrollView style={styles.usersScroll} contentContainerStyle={styles.usersScrollContent}>
            {usuariosFiltrados.map((u) => (
              <View key={u.id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{u.nome || 'Sem nome'}</Text>
                  <Text style={styles.userMeta}>{u.email || 'Sem email'}</Text>
                  <Text style={styles.userMeta}>
                    {u.tipo || 'contratante'} {u.admin ? '(admin)' : ''}
                  </Text>
                </View>
                <View style={styles.userActions}>
                  <TouchableOpacity style={styles.smallButton} onPress={() => abrirEdicao(u)}>
                    <Text style={styles.smallButtonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dangerButton} onPress={() => apagarConta(u)}>
                    <Text style={styles.dangerButtonText}>Apagar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>Nenhum usuario encontrado.</Text>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.configButton}
          onPress={() => navigation.navigate('Configuracoes')}
        >
          <Text style={styles.configButtonText}>Configuracoes</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisivel} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar Conta</Text>

            <TextInput
              placeholder="Nome"
              value={form.nome}
              onChangeText={(v) => setForm({ ...form, nome: v })}
              style={styles.modalInput}
            />
            <TextInput
              placeholder="Email"
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
              style={styles.modalInput}
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Telefone"
              value={form.fone}
              onChangeText={(v) => setForm({ ...form, fone: v })}
              style={styles.modalInput}
            />
            <TextInput
              placeholder="Profissao (opcional)"
              value={form.profissao}
              onChangeText={(v) => setForm({ ...form, profissao: v })}
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Tipo de conta</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={form.tipo}
                onValueChange={(valor) => setForm({ ...form, tipo: valor })}
              >
                <Picker.Item label="Contratante" value="contratante" />
                <Picker.Item label="Prestador" value="prestador" />
                <Picker.Item label="Admin" value="admin" />
              </Picker>
            </View>

            <Text style={styles.modalLabel}>Administrador?</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={form.admin ? 'sim' : 'nao'}
                onValueChange={(valor) => setForm({ ...form, admin: valor === 'sim' })}
              >
                <Picker.Item label="Nao" value="nao" />
                <Picker.Item label="Sim" value="sim" />
              </Picker>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.outlineButton} onPress={fecharModal}>
                <Text style={styles.outlineButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={salvarAlteracoes}>
                <Text style={styles.secondaryButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHint}>
              Observacao: no plano gratuito, isso altera apenas os dados no Firestore.
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f2f5f6',
    paddingHorizontal: 18,
    paddingTop: 36,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0b1f24',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#5a6a70',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e7e9',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#4a5a5f',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#004b59',
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0b1f24',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e7e9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    color: '#0b1f24',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e7e9',
  },
  loadingText: {
    color: '#4a5a5f',
  },
  usersScroll: {
    maxHeight: 380,
  },
  usersScrollContent: {
    paddingBottom: 6,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e7e9',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  paymentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#b7e3d2',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  overdueCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  userInfo: {
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0b1f24',
  },
  userMeta: {
    fontSize: 12,
    color: '#5a6a70',
    marginTop: 2,
  },
  userActions: {
    flexDirection: 'row',
    gap: 10,
  },
  smallButton: {
    backgroundColor: '#005362',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 9,
  },
  smallButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  dangerButton: {
    backgroundColor: '#b00020',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 9,
  },
  dangerButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  emptyText: {
    color: '#4a5a5f',
  },
  footer: {
    marginTop: 16,
  },
  configButton: {
    backgroundColor: '#005362',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  configButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0b1f24',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e7e9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
    color: '#0b1f24',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4a5a5f',
    marginBottom: 6,
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: '#e2e7e9',
    borderRadius: 12,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 6,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#005362',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  outlineButtonText: {
    color: '#005362',
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#005362',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  modalHint: {
    fontSize: 11,
    color: '#6a7a80',
    marginTop: 10,
  },
});
