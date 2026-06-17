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
import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  Edit2,
  LayoutDashboard,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import { auth, firestore } from '../firebase';
import { adminDeleteUsuario, adminListUsuarios, adminUpdateUsuario } from '../services/adminService';
import { computeNextDueDate } from '../utils/billingDates';
import { useTheme } from '../theme/ThemeContext';

export default function Adm() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useTheme();
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
  const [usuarioExpandidoId, setUsuarioExpandidoId] = useState<string | null>(null);
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
          Alert.alert('Acesso negado', 'Faca login para acessar o painel.');
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
  }, [usuarios, busca, acessoLiberado]);

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
    Alert.alert('Apagar conta', `Tem certeza que deseja apagar a conta de ${usuario?.nome || 'usuario'}?`, [
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
    ]);
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
      const agora = new Date();
      const proximoVencimento = computeNextDueDate(agora, agora);

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
    Alert.alert('Bloquear prestador', `Bloquear a conta de ${usuario?.nome || 'prestador'} por mensalidade em atraso?`, [
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
    ]);
  };

  const marcarPrestadorComoPago = async (usuario: any) => {
    if (!usuario?.id) return;
    setProcessandoUsuarioId(usuario.id);
    try {
      const agora = new Date();
      const userRef = firestore.collection('Usuario').doc(usuario.id);
      const proximoVencimento = computeNextDueDate(agora, agora);

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
  const cardBg = isDark ? theme.surface : '#FFFFFF';
  const cardBorder = isDark ? theme.surfaceBorder : '#EDF1F6';
  const textColor = theme.textPrimary;
  const mutedColor = theme.textMuted;
  const usersPreview = usuariosFiltrados.slice(0, 4);

  const getInitial = (usuario: any) =>
    String(usuario?.nome || usuario?.email || 'U').trim().charAt(0).toUpperCase() || 'U';

  const getRoleInfo = (usuario: any) => {
    if (usuario.admin === true || usuario.tipo === 'admin') return { label: 'Administrador', color: '#9333EA', bg: '#F3E8FF' };
    if (usuario.tipo === 'prestador') return { label: 'Prestador', color: '#16A34A', bg: '#DCFCE7' };
    return { label: 'Contratante', color: '#2563EB', bg: '#EAF2FF' };
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={[styles.topButton, { backgroundColor: cardBg, borderColor: cardBorder }]} onPress={sairDoPainel}>
            <ArrowLeft size={28} color={textColor} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.screenTitle, { color: textColor }]}>Painel Administrativo</Text>
            <Text style={[styles.screenSubtitle, { color: mutedColor }]}>Gerenciamento da plataforma</Text>
          </View>
          <TouchableOpacity
            style={[styles.topButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={() => navigation.navigate('Configuracoes')}
          >
            <Settings size={28} color={textColor} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: textColor }]}>Resumo geral</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.statIcon, { backgroundColor: '#E8F4FF' }]}>
              <Users size={27} color="#2563EB" />
            </View>
            <Text style={[styles.statLabel, { color: mutedColor }]}>Usuários</Text>
            <Text style={[styles.statValue, { color: '#2563EB' }]}>{totalUsuarios}</Text>
            <Text style={[styles.statSub, { color: mutedColor }]}>Total de usuários</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.statIcon, { backgroundColor: '#E9F8EE' }]}>
              <UserCog size={27} color="#16A34A" />
            </View>
            <Text style={[styles.statLabel, { color: mutedColor }]}>Servidor</Text>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{totalPrestadores}</Text>
            <Text style={[styles.statSub, { color: mutedColor }]}>Total de servidores</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.statIcon, { backgroundColor: '#F2EAFE' }]}>
              <ShieldCheck size={27} color="#9333EA" />
            </View>
            <Text style={[styles.statLabel, { color: mutedColor }]}>Admins</Text>
            <Text style={[styles.statValue, { color: '#9333EA' }]}>{totalAdmins}</Text>
            <Text style={[styles.statSub, { color: mutedColor }]}>Total de admins</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.statIcon, { backgroundColor: '#FFF5E6' }]}>
              <CreditCard size={27} color="#F59E0B" />
            </View>
            <Text style={[styles.statLabel, { color: mutedColor }]}>Pagamentos</Text>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{totalPendentes}</Text>
            <Text style={[styles.statSub, { color: mutedColor }]}>Pendentes</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: textColor }]}>Alertas</Text>
        <View style={[styles.alertsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.alertRow}>
            <View style={[styles.alertIcon, { backgroundColor: '#FFF7ED' }]}>
              <Clock size={25} color="#F59E0B" />
            </View>
            <View style={styles.alertCopy}>
              <Text style={[styles.alertTitle, { color: textColor }]}>Prestadores em atraso</Text>
              <Text style={[styles.alertSub, { color: mutedColor }]}>Contas com vencimento anterior a hoje</Text>
            </View>
            <Text style={[styles.alertValue, { color: '#F59E0B' }]}>{totalAtrasados}</Text>
            <ChevronRight size={22} color={mutedColor} />
          </View>
          <View style={[styles.alertDivider, { backgroundColor: isDark ? theme.surfaceBorder : '#E5EAF0' }]} />
          <View style={styles.alertRow}>
            <View style={[styles.alertIcon, { backgroundColor: '#FEE2E2' }]}>
              <CreditCard size={25} color="#DC2626" />
            </View>
            <View style={styles.alertCopy}>
              <Text style={[styles.alertTitle, { color: textColor }]}>Pagamentos pendentes</Text>
              <Text style={[styles.alertSub, { color: mutedColor }]}>Pagamentos aguardando confirmacao</Text>
            </View>
            <Text style={[styles.alertValue, { color: '#DC2626' }]}>{totalPendentes}</Text>
            <ChevronRight size={22} color={mutedColor} />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: textColor }]}>Ações rápidas</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: cardBg, borderColor: cardBorder }]} onPress={() => navigation.navigate('Register')}>
            <View style={[styles.quickIcon, { backgroundColor: '#2563EB' }]}>
              <UserPlus size={30} color="#FFFFFF" />
            </View>
            <Text style={[styles.quickTitle, { color: textColor }]}>Criar conta</Text>
            <Text style={[styles.quickSub, { color: mutedColor }]}>Adicionar novo usuario</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={() => navigation.navigate('UsuariosAdm')}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#16A34A' }]}>
              <Users size={30} color="#FFFFFF" />
            </View>
            <Text style={[styles.quickTitle, { color: textColor }]}>Usuários</Text>
            <Text style={[styles.quickSub, { color: mutedColor }]}>Ver e editar usuários</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.quickIcon, { backgroundColor: '#F59E0B' }]}>
              <CreditCard size={30} color="#FFFFFF" />
            </View>
            <Text style={[styles.quickTitle, { color: textColor }]}>Aprovar R$</Text>
            <Text style={[styles.quickSub, { color: mutedColor }]}>Revisar pagamentos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickCard, styles.hidden, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.quickIcon, { backgroundColor: '#9333EA' }]}>
              <BarChart3 size={30} color="#FFFFFF" />
            </View>
            <Text style={[styles.quickTitle, { color: textColor }]}>Relatórios</Text>
            <Text style={[styles.quickSub, { color: mutedColor }]}>Visualizar relatórios</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Search size={23} color={mutedColor} />
            <TextInput
              placeholder="Buscar por nome, email ou telefone..."
              placeholderTextColor={mutedColor}
              value={busca}
              onChangeText={setBusca}
              style={[styles.searchInput, { color: textColor }]}
            />
          </View>
          <TouchableOpacity style={[styles.filterButton, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <SlidersHorizontal size={25} color={mutedColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.accountsTitleRow}>
          <Text style={[styles.accountsTitle, { color: textColor }]}>Lista de contas</Text>
          <View style={[styles.countPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#EEF2F7' }]}>
            <Text style={[styles.countPillText, { color: mutedColor }]}>{usuariosFiltrados.length}</Text>
          </View>
        </View>

        {carregandoUsuarios ? (
          <View style={[styles.loadingBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={[styles.loadingText, { color: mutedColor }]}>Carregando usuarios...</Text>
          </View>
        ) : usersPreview.length > 0 ? (
          <View style={[styles.accountsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {usersPreview.map((u, index) => {
              const role = getRoleInfo(u);
              const expanded = usuarioExpandidoId === u.id;
              return (
                <View
                  key={u.id}
                  style={[
                    styles.accountItem,
                    index > 0 && {
                      borderTopColor: isDark ? theme.surfaceBorder : '#E5EAF0',
                      borderTopWidth: 1,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.accountRow}
                    activeOpacity={0.78}
                    onPress={() => setUsuarioExpandidoId((current) => (current === u.id ? null : u.id))}
                  >
                    <View style={[styles.accountAvatar, { backgroundColor: role.bg }]}>
                      <Text style={[styles.accountAvatarText, { color: role.color }]}>{getInitial(u)}</Text>
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={[styles.accountName, { color: textColor }]} numberOfLines={1}>
                        {u.nome || 'Sem nome'}
                      </Text>
                      <Text style={[styles.accountEmail, { color: mutedColor }]} numberOfLines={1}>
                        {u.email || 'Sem email'}
                      </Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: role.bg }]}>
                      <Text style={[styles.roleBadgeText, { color: role.color }]}>{role.label}</Text>
                    </View>
                    <ChevronRight
                      size={22}
                      color={mutedColor}
                      style={expanded ? styles.chevronOpen : undefined}
                    />
                  </TouchableOpacity>

                  {expanded && (
                    <View
                      style={[
                        styles.accountActionsPanel,
                        { borderTopColor: isDark ? theme.surfaceBorder : '#E5EAF0' },
                      ]}
                    >
                      <View style={styles.expandedNameBlock}>
                        <Text style={[styles.expandedNameLabel, { color: mutedColor }]}>Conta selecionada</Text>
                        <Text style={[styles.expandedName, { color: textColor }]} numberOfLines={1}>
                          {u.nome || 'Sem nome'}
                        </Text>
                      </View>
                      <View style={styles.accountActions}>
                        <TouchableOpacity style={styles.editOutlineButton} onPress={() => abrirEdicao(u)}>
                          <Edit2 size={16} color="#2563EB" />
                          <Text style={styles.editOutlineText}>Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteOutlineButton} onPress={() => apagarConta(u)}>
                          <Trash2 size={16} color="#DC2626" />
                          <Text style={styles.deleteOutlineText}>Excluir</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: mutedColor }]}>Nenhum usuario encontrado.</Text>
        )}

        {solicitacoesPagamento.length > 0 && (
          <View style={styles.detailsSection}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Pagamentos para aprovar</Text>
            {solicitacoesPagamento.map((solicitacao) => (
              <View key={solicitacao.id} style={[styles.paymentCard, { backgroundColor: cardBg }]}>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: textColor }]}>{solicitacao.nome || 'Prestador'}</Text>
                  <Text style={[styles.userMeta, { color: mutedColor }]}>{solicitacao.email || 'Sem email'}</Text>
                  <Text style={[styles.userMeta, { color: mutedColor }]}>Valor: R$ {Number(solicitacao.valor || 0).toFixed(2)}</Text>
                  <Text style={[styles.userMeta, { color: mutedColor }]}>TXID: {solicitacao.pixTxid || '-'}</Text>
                </View>
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={[styles.smallButton, processandoPagamentoId === solicitacao.id && styles.disabledButton]}
                    onPress={() => confirmarPagamento(solicitacao)}
                    disabled={processandoPagamentoId === solicitacao.id}
                  >
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.smallButtonText}>Confirmar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dangerButton, processandoPagamentoId === solicitacao.id && styles.disabledButton]}
                    onPress={() => recusarPagamento(solicitacao)}
                    disabled={processandoPagamentoId === solicitacao.id}
                  >
                    <X size={16} color="#B91C1C" />
                    <Text style={styles.dangerButtonText}>Recusar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {prestadoresEmAtraso.length > 0 && (
          <View style={styles.detailsSection}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Prestadores em atraso</Text>
            {prestadoresEmAtraso.map((usuario) => (
              <View key={usuario.id} style={[styles.overdueCard, { backgroundColor: isDark ? theme.surface : '#FFFBEB' }]}>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: textColor }]}>{usuario.nome || 'Prestador'}</Text>
                  <Text style={[styles.userMeta, { color: mutedColor }]}>{usuario.email || 'Sem email'}</Text>
                  <Text style={[styles.userMeta, { color: mutedColor }]}>Vencimento: {usuario.vencimento.toLocaleDateString('pt-BR')}</Text>
                  <Text style={[styles.userMeta, { color: mutedColor }]}>Dias em atraso: {usuario.diasAtraso}</Text>
                </View>
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={[styles.smallButton, processandoUsuarioId === usuario.id && styles.disabledButton]}
                    onPress={() => marcarPrestadorComoPago(usuario)}
                    disabled={processandoUsuarioId === usuario.id}
                  >
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.smallButtonText}>Marcar pago</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dangerButton, processandoUsuarioId === usuario.id && styles.disabledButton]}
                    onPress={() => bloquearPrestador(usuario)}
                    disabled={processandoUsuarioId === usuario.id}
                  >
                    <X size={16} color="#B91C1C" />
                    <Text style={styles.dangerButtonText}>Bloquear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.bottomTabs, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <TouchableOpacity style={[styles.bottomTab, styles.hidden]}>
            <View style={styles.bottomActiveBar} />
            <LayoutDashboard size={24} color="#2563EB" />
            <Text style={[styles.bottomTabText, { color: '#2563EB' }]}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomTab} onPress={() => navigation.navigate('UsuariosAdm')}>
            <Users size={24} color={mutedColor} />
            <Text style={[styles.bottomTabText, { color: mutedColor }]}>Usuarios</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomTab}>
            <CreditCard size={24} color={mutedColor} />
            <Text style={[styles.bottomTabText, { color: mutedColor }]}>Pagamentos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomTab}>
            <BarChart3 size={24} color={mutedColor} />
            <Text style={[styles.bottomTabText, { color: mutedColor }]}>Relatorios</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomTab} onPress={() => navigation.navigate('Configuracoes')}>
            <Settings size={24} color={mutedColor} />
            <Text style={[styles.bottomTabText, { color: mutedColor }]}>Config.</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={modalVisivel} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Editar Conta</Text>

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
                <Picker selectedValue={form.admin ? 'sim' : 'nao'} onValueChange={(valor) => setForm({ ...form, admin: valor === 'sim' })}>
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
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 26,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    gap: 14,
  },
  topButton: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#0F2937',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  headerCopy: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '23.5%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    minHeight: 170,
    shadowColor: '#0F2937',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 10,
  },
  statSub: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  alertsCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: 26,
    shadowColor: '#0F2937',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  alertRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  alertCopy: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  alertSub: {
    fontSize: 13,
    fontWeight: '700',
  },
  alertValue: {
    fontSize: 28,
    fontWeight: '900',
    marginHorizontal: 14,
  },
  alertDivider: {
    height: 1,
    marginLeft: 66,
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickCard: {
    width: '31.5%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    minHeight: 180,
    shadowColor: '#0F2937',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  hidden: {
    display: 'none',
  },
  quickIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  quickSub: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  searchBox: {
    flex: 1,
    height: 62,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  filterButton: {
    width: 62,
    height: 62,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  accountsTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  countPill: {
    minWidth: 30,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countPillText: {
    fontSize: 13,
    fontWeight: '900',
  },
  accountsCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 18,
    shadowColor: '#0F2937',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  accountItem: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  accountRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  accountAvatarText: {
    fontSize: 22,
    fontWeight: '900',
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 3,
  },
  accountEmail: {
    fontSize: 13,
    fontWeight: '700',
  },
  roleBadge: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 12,
    marginRight: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  accountActionsPanel: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  expandedNameBlock: {
    flex: 1,
    minWidth: 0,
  },
  expandedNameLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 3,
  },
  expandedName: {
    fontSize: 14,
    fontWeight: '900',
  },
  accountActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editOutlineButton: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFD3F8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editOutlineText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
  },
  deleteOutlineButton: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F7B4B4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteOutlineText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '900',
  },
  detailsSection: {
    marginTop: 12,
    marginBottom: 18,
  },
  paymentCard: {
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#16A34A',
    marginBottom: 12,
  },
  overdueCard: {
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginBottom: 12,
  },
  userInfo: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '900',
  },
  userMeta: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
  },
  userActions: {
    flexDirection: 'row',
    gap: 10,
  },
  smallButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  dangerButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dangerButtonText: {
    color: '#B91C1C',
    fontWeight: '900',
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  loadingText: {
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 14,
  },
  bottomTabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 20,
    minHeight: 88,
    marginTop: 4,
    overflow: 'hidden',
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bottomActiveBar: {
    position: 'absolute',
    top: 0,
    width: '72%',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2563EB',
  },
  bottomTabText: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  pickerBox: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    flex: 1,
  },
  outlineButtonText: {
    color: '#2563EB',
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    flex: 1,
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '900',
  },
});
