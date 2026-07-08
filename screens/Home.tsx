
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, Alert, RefreshControl, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, Bell, FileText, Home as HomeIcon, Leaf, MapPin, Search as SearchIcon, Sofa, User, Wrench, X, Zap } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { auth, firestore } from "../firebase";
import { Picker } from "@react-native-picker/picker";
import { useTheme } from "../theme/ThemeContext";
import { respondServiceProposal } from "../services/serviceService";
import { smartFilter } from "../utils/smartSearch";
import { getProviderRating } from "../services/reviewService";

export default function TelaInicialCliente({ onLogout }: any) {

  const navigation = useNavigation() as any;
  const route = useRoute<any>();
  const { isDark, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [abaAtiva] = useState(route.params?.initialTab === "busca" ? "busca" : "inicio");
  const [profissionaisRecomendados, setProfissionaisRecomendados] = useState([]);
  const [servicosPopulares, setServicosPopulares] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [servicosAceitos, setServicosAceitos] = useState<any[]>([]);
  const [carregandoAceitos, setCarregandoAceitos] = useState(true);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [servicoSelecionado, setServicoSelecionado] = useState<any>(null);
  const [problemaTexto, setProblemaTexto] = useState("");
  const [mensagemProposta, setMensagemProposta] = useState("");
  const [respondendoProposta, setRespondendoProposta] = useState(false);
  const [modalAreaVisivel, setModalAreaVisivel] = useState(false);
  const [areaSelecionada, setAreaSelecionada] = useState("");
  const [dataSolicitacao, setDataSolicitacao] = useState("");
  const [localSolicitacao, setLocalSolicitacao] = useState("");
  const [descricaoSolicitacao, setDescricaoSolicitacao] = useState("");
  const [enviandoSolicitacao, setEnviandoSolicitacao] = useState(false);
  const [userName, setUserName] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const unsubscribeAceitosRef = useRef<null | (() => void)>(null);
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(brandOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.spring(brandScale, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
    ]);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(brandScale, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
        Animated.timing(brandScale, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    entrance.start(({ finished }) => finished && pulse.start());
    return () => {
      entrance.stop();
      pulse.stop();
    };
  }, [brandOpacity, brandScale]);

  const refreshHome = async () => {
    try { setRefreshing(true); await Promise.all([buscarDadosFirebase(), fetchUserName()]); carregarServicosAceitos(); }
    finally { setRefreshing(false); }
  };

  const topBarIconColor = isDark ? "#FF8700" : "#0F2937";
  const topBarBtnBg = isDark ? theme.headerBtnBg : "rgba(15, 41, 55, 0.06)";

  useFocusEffect(
    useCallback(() => {
      buscarDadosFirebase();
      carregarServicosAceitos();
      fetchUserName();
      return () => {
        if (unsubscribeAceitosRef.current) {
          unsubscribeAceitosRef.current();
        }
      };
    }, [])
  );

  const getServicoUi = (nome: string) => {
    const n = String(nome || "").toLowerCase();

    if (n.includes("diarista")) {
      return {
        subtitle: "Serviços de limpeza e organização",
        icon: <User size={26} color="#FF8700" />,
        iconBg: "#FFF4E5",
        badgeBg: "#FF8700",
      };
    }

    if (n.includes("eletric")) {
      return {
        subtitle: "Instalações e reparos elétricos",
        icon: <Zap size={26} color="#FF8700" />,
        iconBg: "#FFF4E5",
        badgeBg: "#FF8700",
      };
    }

    if (n.includes("jardin")) {
      return {
        subtitle: "Cuidados com jardins e áreas verdes",
        icon: <Leaf size={26} color="#16A34A" />,
        iconBg: "#E9F8EE",
        badgeBg: "#16A34A",
      };
    }

    if (n.includes("móve") || n.includes("move") || n.includes("montagem")) {
      return {
        subtitle: "Montagem e desmontagem de móveis",
        icon: <Sofa size={26} color="#7C3AED" />,
        iconBg: "#F2EAFE",
        badgeBg: "#7C3AED",
      };
    }

    return {
      subtitle: "Serviço profissional",
      icon: <Wrench size={26} color="#FF8700" />,
      iconBg: "#FFF4E5",
      badgeBg: "#FF8700",
    };
  };

  const prestadorEstaAtivo = (userData: any) =>
    userData?.contaAtiva !== false && userData?.assinaturaAtiva !== false;

  const fetchUserName = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDoc = await firestore.collection("Usuario").doc(user.uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          setUserName(data?.nome || user.email || "Usuário");
        } else {
          setUserName(user.email || "Usuário");
        }
      } catch (error) {
        console.error("Erro ao buscar nome do usuário:", error);
        setUserName(user.email || "Usuário");
      }
    }
  };

  const buscarDadosFirebase = async () => {
    setCarregando(true);
    try {
      const users = await firestore
        .collection("Usuario")
        .where("tipo", "==", "prestador")
        .where("contaAtiva", "==", true)
        .where("assinaturaAtiva", "==", true)
        .get();
      const profissionais = [];
      const servicosUnicos = new Map<string, number>();

      for (const userDoc of users.docs) {
        const userData = userDoc.data();
        
        // faz a contagem dos serviços oferecidos por cada profissão
        if (userData.profissao && userData.perfilVisivel !== false && prestadorEstaAtivo(userData)) {
          const rating = await getProviderRating(userDoc.id, userData);
          const count = (servicosUnicos.get(userData.profissao) || 0) + 1;
          servicosUnicos.set(userData.profissao, count);
          
          // Adiciona todos os prestadores independente se tem serviços ou não
          const profissional = {
            id: userDoc.id,
            nome: userData.nome || "Sem nome",
            ...rating,
            distancia: userData.distancia || "A calcular",
            tipo: userData.profissao || "Geral",
            profissao: userData.profissao || "Geral",
          };
          profissionais.push(profissional);
        }
      }

      const servicosArray = Array.from(servicosUnicos)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map((item, index) => ({
          id: index + 1,
          nome: item[0],
          ...getServicoUi(item[0]),
          quantidade: item[1],
        }));

      console.log("Profissionais carregados:", profissionais.length);
      setProfissionaisRecomendados(profissionais);
      setServicosPopulares(servicosArray);
      setCarregando(false);
    } catch (erro) {
      console.error("Erro ao buscar dados:", erro);
      setCarregando(false);
    }
  };

  const query = searchText.trim();
  const servicosFiltrados = useMemo(() => smartFilter(servicosPopulares, query, (serv: any) => [serv.nome, serv.categoria, serv.descricao]), [servicosPopulares, query]);
  const prestadoresFiltrados = useMemo(() => smartFilter(profissionaisRecomendados, query, (pro: any) => [pro.nome, pro.profissao || pro.tipo, pro.bairro, pro.cidade, pro.especialidades?.join?.(" "), pro.avaliacao]), [profissionaisRecomendados, query]);

  const contarProfissionaisPorServico = (nomeServico: any) => {
    return servicosPopulares.find(s => s.nome === nomeServico)?.quantidade || 0;
  };

  const handleServicoPress = (serv: any) => {
    navigation.navigate("PrestadoresPorServico", { 
      servico: serv.nome,
    });
  };

  const handleProfissionalPress = (profissional: any) => {
    navigation.navigate("DetalheProfissional", { 
      profissional: profissional,
    });
  };

  const carregarServicosAceitos = () => {
    const usuarioId = auth.currentUser?.uid;
    if (!usuarioId) {
      setCarregandoAceitos(false);
      return;
    }

    setCarregandoAceitos(true);

    if (unsubscribeAceitosRef.current) {
      unsubscribeAceitosRef.current();
    }
// Busca os serviços aceitos para o cliente e mantém a atualização em tempo real
    unsubscribeAceitosRef.current = firestore
      .collection("ServicosClientes")
      .doc(usuarioId)
      .collection("ServicoStatus")
      .onSnapshot(
        (snapshot) => {
          const lista = snapshot.docs
            .map((doc) => {
              const data = doc.data() as any;
              return {
                ...data,
                id: doc.id,
              };
            });
          const aceitos = lista.filter((item: any) =>
            item.status === "valor_pendente" ||
            item.status === "a fazer" ||
            item.status === "aceito" ||
            item.status === "aguardando_confirmacao" ||
            item.status === "problema"
          );
          setServicosAceitos(aceitos);
          setCarregandoAceitos(false);
        },
        (erro) => {
          console.error("Erro ao buscar serviços aceitos:", erro);
          setCarregandoAceitos(false);
        }
      );
  };

  const abrirModal = (servico: any) => {
    setServicoSelecionado(servico);
    setProblemaTexto("");
    setModalVisivel(true);
  };

  const fecharModal = () => {
    setModalVisivel(false);
    setServicoSelecionado(null);
    setProblemaTexto("");
    setMensagemProposta("");
  };

  const formatarValor = (valor: any) => {
    const numero = Number(valor);
    if (Number.isNaN(numero)) return "Valor não informado";
    return `R$ ${numero.toFixed(2).replace(".", ",")}`;
  };

  const abrirModalArea = () => {
    setAreaSelecionada("");
    setDataSolicitacao("");
    setLocalSolicitacao("");
    setDescricaoSolicitacao("");
    setModalAreaVisivel(true);
  };

  const fecharModalArea = () => {
    setModalAreaVisivel(false);
  };

  const enviarSolicitacaoPorArea = async () => {
    if (!areaSelecionada || !dataSolicitacao || !localSolicitacao) {
      Alert.alert("Erro", "Selecione a area e preencha data e local.");
      return;
    }

    const clienteId = auth.currentUser?.uid;
    if (!clienteId) {
      Alert.alert("Erro", "Usuario nao autenticado");
      return;
    }

    setEnviandoSolicitacao(true);
    try {
      const clienteSnap = await firestore.collection("Usuario").doc(clienteId).get();
      const clienteNome = clienteSnap.exists ? clienteSnap.data()?.nome : null;

      const prestadoresSnap = await firestore
        .collection("Usuario")
        .where("tipo", "==", "prestador")
        .where("profissao", "==", areaSelecionada)
        .where("contaAtiva", "==", true)
        .where("assinaturaAtiva", "==", true)
        .get();

      if (prestadoresSnap.empty) {
        Alert.alert("Aviso", "Nenhum prestador encontrado para essa area.");
        setEnviandoSolicitacao(false);
        return;
      }

      const agora = new Date();
      const requestId = firestore.collection("SolicitacoesArea").doc().id;
      const promises: Promise<any>[] = [];
      const prestadoresIds: string[] = [];

      prestadoresSnap.docs.forEach((doc) => {
        const prestadorData = doc.data();
        if (!prestadorEstaAtivo(prestadorData)) {
          return;
        }

        const prestadorId = doc.id;
        prestadoresIds.push(prestadorId);
        const docRef = firestore
          .collection("ServicosAgendados")
          .doc(prestadorId)
          .collection("ServicoStatus")
          .doc(requestId);

        const novoServicoPrestador = {
          id: docRef.id,
          requestId: requestId,
          origem: "area",
          estilo: areaSelecionada,
          tipo: areaSelecionada,
          data: dataSolicitacao,
          local: localSolicitacao,
          descricao: descricaoSolicitacao,
          status: "aguardando",
          clienteId: clienteId,
          nomeCliente: clienteNome || auth.currentUser?.email || "Cliente",
          dataSolicitacao: agora,
          criadoEm: agora,
          prestadorId: prestadorId,
        };

        promises.push(docRef.set(novoServicoPrestador));
      });

      if (prestadoresIds.length === 0) {
        Alert.alert("Aviso", "Nenhum prestador ativo encontrado para essa area.");
        setEnviandoSolicitacao(false);
        return;
      }

      const novoServicoCliente = {
        id: requestId,
        requestId: requestId,
        origem: "area",
        estilo: areaSelecionada,
        tipo: areaSelecionada,
        data: dataSolicitacao,
        local: localSolicitacao,
        descricao: descricaoSolicitacao,
        status: "aguardando",
        clienteId: clienteId,
        nomeCliente: clienteNome || auth.currentUser?.email || "Cliente",
        dataSolicitacao: agora,
        criadoEm: agora,
        prestadorId: null as string | null,
        prestadoresIds,
      };

      promises.push(
        firestore
          .collection("ServicosClientes")
          .doc(clienteId)
          .collection("ServicoStatus")
          .doc(requestId)
          .set(novoServicoCliente)
      );

      promises.push(
        firestore.collection("SolicitacoesArea").doc(requestId).set({
          requestId,
          area: areaSelecionada,
          clienteId,
          nomeCliente: clienteNome || auth.currentUser?.email || "Cliente",
          data: dataSolicitacao,
          local: localSolicitacao,
          descricao: descricaoSolicitacao,
          prestadoresIds,
          status: "aguardando",
          criadoEm: agora,
        })
      );

      await Promise.all(promises);
      Alert.alert("Sucesso", "Solicitacao enviada para prestadores da area.");
      fecharModalArea();
    } catch (erro) {
      console.error("Erro ao enviar solicitacao:", erro);
      Alert.alert("Erro", "Nao foi possivel enviar a solicitacao.");
    } finally {
      setEnviandoSolicitacao(false);
    }
  };

  const atualizarStatusServico = async (novoStatus: string) => {
    if (!servicoSelecionado?.prestadorId || !servicoSelecionado?.clienteId) {
      Alert.alert("Erro", "Informações do serviço incompletas");
      return;
    }

    if (novoStatus === "realizado" && servicoSelecionado.status !== "aguardando_confirmacao") {
      Alert.alert("Aguarde", "O prestador precisa informar que terminou o serviço antes da sua confirmação.");
      return;
    }

    if (novoStatus === "problema" && !problemaTexto.trim()) {
      Alert.alert("Descreva o problema", "Informe o que aconteceu para que o administrador possa analisar.");
      return;
    }

    try {
      const agora = new Date();
      const statusUpdate = {
        status: novoStatus,
        dataAtualizacao: agora,
        ...(novoStatus === "problema"
          ? { problemaRelatado: problemaTexto || "Problema reportado" }
          : { problemaRelatado: null }),
        ...(novoStatus === "realizado"
          ? { dataFinalizado: agora, avaliacaoLiberada: true }
          : {}),
      };

      // Atualiza (ou cria, se não existir) o status no documento do trabalhador
      await firestore
        .collection("ServicosAgendados")
        .doc(servicoSelecionado.prestadorId)
        .collection("ServicoStatus")
        .doc(servicoSelecionado.id)
        .set(
          {
            ...servicoSelecionado,
            ...statusUpdate,
          },
          { merge: true }
        );
// Atualiza (ou cria) o status no documento do cliente
      await firestore
        .collection("ServicosClientes")
        .doc(servicoSelecionado.clienteId)
        .collection("ServicoStatus")
        .doc(servicoSelecionado.id)
        .set(
          {
            ...servicoSelecionado,
            ...statusUpdate,
          },
          { merge: true }
        );

      if (novoStatus === "problema") {
        const relatorId = auth.currentUser?.uid;
        if (!relatorId) throw new Error("Usuario nao autenticado");
        await firestore
          .collection("ProblemasServicos")
          .doc(`${servicoSelecionado.id}_${relatorId}`)
          .set({
            servicoId: servicoSelecionado.id,
            requestId: servicoSelecionado.requestId || servicoSelecionado.id,
            servico: servicoSelecionado.estilo || servicoSelecionado.tipo || "Serviço",
            clienteId: servicoSelecionado.clienteId,
            prestadorId: servicoSelecionado.prestadorId,
            relatorId,
            relatorTipo: "contratante",
            descricao: problemaTexto.trim(),
            status: "pendente",
            criadoEm: agora,
          }, { merge: true });
      }

      Alert.alert("Sucesso", `Serviço atualizado para "${novoStatus}"`);
      fecharModal();
      if (novoStatus === "realizado") {
        navigation.navigate("Avaliacao", { servico: servicoSelecionado });
      }
    } catch (erro) {
      console.error("Erro ao atualizar serviço:", erro);
      Alert.alert("Erro", "Não foi possível atualizar o serviço");
    }
  };

  const responderPropostaValor = async (action: "accept" | "reject" | "request_change") => {
    if (!servicoSelecionado?.prestadorId || !servicoSelecionado?.clienteId) {
      Alert.alert("Erro", "Informações da proposta incompletas");
      return;
    }

    if (action === "request_change" && !mensagemProposta.trim()) {
      Alert.alert("Descreva a alteração", "Informe ao prestador o que deve ser ajustado.");
      return;
    }
    try {
      setRespondendoProposta(true);
      await respondServiceProposal({ serviceId: servicoSelecionado.id, providerId: servicoSelecionado.prestadorId, action, message: mensagemProposta });

      if (servicoSelecionado.origem === "area" && servicoSelecionado.requestId) {
        const reqRef = firestore
          .collection("SolicitacoesArea")
          .doc(servicoSelecionado.requestId);

        if (action === "accept") {
          const reqSnap = await reqRef.get();
          const reqData: any = reqSnap.exists ? reqSnap.data() : {};
          const prestadoresIds: string[] = reqData?.prestadoresIds || [];
          const deletePromises = prestadoresIds
            .filter((prestadorId) => prestadorId !== servicoSelecionado.prestadorId)
            .map((prestadorId) =>
              firestore
                .collection("ServicosAgendados")
                .doc(prestadorId)
                .collection("ServicoStatus")
                .doc(servicoSelecionado.requestId)
                .delete()
            );

          await Promise.all(deletePromises);
        }

        await reqRef.set(
          action === "accept"
            ? {
                status: "aceito",
                aceitoPor: servicoSelecionado.prestadorId,
                dataAceito: new Date(),
                valor: servicoSelecionado.valor,
                valorAceito: true,
              }
            : {
                status: "valor_recusado",
                dataRespostaValor: new Date(),
                valorAceito: false,
              },
          { merge: true }
        );
      }

      Alert.alert(
        "Sucesso",
        action === "accept" ? "Proposta aceita. Serviço confirmado." : action === "reject" ? "Proposta recusada." : "Alteração solicitada ao prestador."
      );
      fecharModal();
    } catch (erro) {
      console.error("Erro ao responder proposta de valor:", erro);
      Alert.alert("Erro", "Não foi possível responder a proposta.");
    } finally {
      setRespondendoProposta(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.containerFull, { backgroundColor: theme.background }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshHome} tintColor="#FF8700" colors={["#FF8700"]} />}
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={[
          styles.containerContent,
          { paddingBottom: 88 + Math.max(insets.bottom, 10) },
        ]}
      >
        {abaAtiva === "inicio" ? (
          <>
            <View style={styles.topBar}>
              <View style={{ width: 44, height: 44 }} />
              <Animated.Text
                accessibilityRole="header"
                style={[
                  styles.topBarTitle,
                  { opacity: brandOpacity, transform: [{ scale: brandScale }] },
                ]}
              >
                <Text style={{ color: isDark ? "#F8FAFC" : "#071A33" }}>Pra</Text>
                <Text style={{ color: "#FF8700" }}>Ontem</Text>
              </Animated.Text>
              <TouchableOpacity
                style={[styles.topBarBtn, { backgroundColor: topBarBtnBg }]}
                onPress={() => navigation.navigate("Notificacoes")}
                activeOpacity={0.7}
              >
                <View style={styles.bellWrap}>
                  <Bell size={22} color={topBarIconColor} />
                  <View
                    style={[
                      styles.notificationDot,
                      { borderColor: isDark ? theme.background : "#ffffff" },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.greetingCard,
                {
                  backgroundColor: isDark ? theme.surface : "#FFF4E5",
                  borderColor: isDark ? theme.surfaceBorder : "transparent",
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              <View style={styles.greetingTextCol}>
                <Text style={[styles.greetingTitle, { color: theme.surfaceTextPrimary }]}>
                  Olá, {userName}! 👋
                </Text>
                <Text style={[styles.greetingSub, { color: theme.surfaceTextMuted }]}>
                  Como podemos ajudar hoje?
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.greetingAvatarBtn,
                  {
                    backgroundColor: isDark ? "rgba(0,0,0,0.20)" : theme.surface,
                    borderColor: isDark ? theme.surfaceBorder : theme.surfaceBorder,
                  },
                ]}
                onPress={() => navigation.navigate("Perfil")}
                activeOpacity={0.8}
              >
                <User size={22} color="#FF8700" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.mapDiscoveryCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
              onPress={() => navigation.navigate("MapaPrestadores")}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Ver profissionais disponíveis no mapa"
            >
              <View style={styles.mapDiscoveryIcon}>
                <MapPin size={24} color="#FFFFFF" />
              </View>
              <View style={styles.mapDiscoveryCopy}>
                <Text style={[styles.mapDiscoveryTitle, { color: theme.surfaceTextPrimary }]}>Profissionais disponíveis agora</Text>
                <Text style={[styles.mapDiscoveryText, { color: theme.surfaceTextMuted }]}>Veja no mapa quem decidiu compartilhar a localização</Text>
              </View>
              <ArrowRight size={20} color="#FF8700" />
            </TouchableOpacity>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Serviços Populares</Text>
              <View style={styles.sectionUnderline} />
            </View>

            <TouchableOpacity style={styles.primaryActionWrap} onPress={abrirModalArea} activeOpacity={0.88}>
              <LinearGradient
                colors={["#E86F00", "#FF8700", "#E86F00"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryAction}
              >
                <View style={styles.primaryActionIconBox}>
                  <MapPin size={24} color="#ffffff" />
                </View>
                <View style={styles.primaryActionText}>
                  <Text style={styles.primaryActionTitle}>Solicitar serviço por área</Text>
                  <Text style={styles.primaryActionSub}>
                    Envie o pedido para prestadores da área escolhida
                  </Text>
                </View>
                <View style={styles.primaryActionArrow}>
                  <ArrowRight size={20} color="#FF8700" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {carregando ? (
              <View style={styles.carregandoContainer}>
                <ActivityIndicator size="large" color="#FF8700" />
                <Text style={styles.carregandoTexto}>Carregando serviços...</Text>
              </View>
            ) : servicosFiltrados.length > 0 ? (
              <View style={styles.grid}>
                {servicosFiltrados.map((serv) => {
                  const quantidadeProf = contarProfissionaisPorServico(serv.nome);
                  return (
                    <TouchableOpacity
                      key={serv.id}
                      style={[
                        styles.serviceCard,
                        {
                          backgroundColor: isDark ? theme.surface : theme.surface,
                          borderColor: isDark ? theme.surfaceBorder : "transparent",
                          borderWidth: isDark ? 1 : 0,
                        },
                      ]}
                      onPress={() => handleServicoPress(serv)}
                      activeOpacity={0.85}
                    >
                      <View
                        style={[
                          styles.serviceIconBox,
                          {
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : serv.iconBg || "#FFF4E5",
                          },
                        ]}
                      >
                        {serv.icon}
                      </View>
                      <Text style={[styles.serviceTitle, { color: theme.surfaceTextPrimary }]}>
                        {serv.nome}
                      </Text>
                      <Text
                        style={[styles.serviceSubtitle, { color: theme.surfaceTextMuted }]}
                        numberOfLines={2}
                      >
                        {serv.subtitle || "Serviço profissional"}
                      </Text>
                      <View style={[styles.badgeContainer, { backgroundColor: serv.badgeBg || "#FF8700" }]}>
                        <Text style={styles.badgeTexto}>{quantidadeProf} profissional{quantidadeProf !== 1 ? "s" : ""}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.nenhumResultado, { color: theme.textMuted }]}>
                Nenhum serviço encontrado
              </Text>
            )}

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Serviços e propostas</Text>
              <View style={styles.sectionUnderline} />
            </View>

            {carregandoAceitos ? (
              <View style={styles.carregandoContainer}>
                <ActivityIndicator size="small" color="#FF8700" />
                <Text style={[styles.carregandoTexto, { color: theme.textMuted }]}>Carregando serviços aceitos...</Text>
              </View>
            ) : servicosAceitos.length > 0 ? (
              <View style={styles.servicosAceitosList}>
                {servicosAceitos.map((serv) => (
                  <TouchableOpacity
                    key={`${serv.id}-${serv.prestadorId}`}
                    style={[styles.servicoAceitoCard, { backgroundColor: theme.card, borderColor: theme.border, borderLeftColor: "#FF8700" }]}
                    onPress={() => abrirModal(serv)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.servicoAceitoTitulo, { color: theme.textPrimary }]}>
                      {serv.estilo || serv.tipo || "Serviço"}
                    </Text>
                    <Text style={[styles.servicoAceitoInfo, { color: theme.textMuted }]}>
                      {serv.data || "Data não informada"} • {serv.local || "Local não informado"}
                    </Text>
                    {serv.status === "valor_pendente" && (
                      <Text style={styles.servicoAceitoValor}>
                        Proposta: {formatarValor(serv.valorProposto ?? serv.valor)}
                      </Text>
                    )}
                    <Text style={styles.servicoAceitoAcoes}>
                      {serv.status === "valor_pendente"
                        ? "Toque para aceitar ou recusar"
                        : "Toque para gerenciar"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyStateCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.emptyStateIcon, { backgroundColor: theme.headerBtnBg }]}>
                  <FileText size={20} color={isDark ? "#FFB13B" : "#94A3B8"} />
                </View>
                <View style={styles.emptyStateTextCol}>
                  <Text style={[styles.emptyStateTitle, { color: theme.textPrimary }]}>Nenhum serviço ou proposta no momento</Text>
                  <Text style={[styles.emptyStateSub, { color: theme.textMuted }]}>Quando houver, você verá aqui.</Text>
                </View>
              </View>
            )}

            {!carregando && (
              <TouchableOpacity
                style={styles.sectionButtonContainer}
                onPress={() => navigation.navigate("NovosPrestadores")}
                activeOpacity={0.7}
              >
                <View style={styles.sectionButtonContent}>
                  <Text style={styles.sectionButtonTitle}>Novos Prestadores</Text>
                  <Text style={styles.sectionButtonSubtitle}>
                    Confira trabalhadores recém cadastrados
                  </Text>
                </View>
                <Text style={styles.sectionButtonArrow}>→</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 20 }} />
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Buscar</Text>
              <View style={styles.sectionUnderline} />
            </View>
            <View style={styles.searchBox}>
              <SearchIcon size={20} color="#666" />
              <TextInput
                placeholder="Buscar serviços ou prestadores..."
                placeholderTextColor="#777"
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText("")}>
                  <X size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {query.length > 0 ? (
              servicosFiltrados.length > 0 || prestadoresFiltrados.length > 0 ? (
                <View style={styles.prestadoresListContainer}>
                  {servicosFiltrados.length > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Serviços</Text>
                      <View style={styles.grid}>
                        {servicosFiltrados.map((serv) => {
                          const quantidadeProf = contarProfissionaisPorServico(serv.nome);
                          return (
                            <TouchableOpacity
                              key={serv.id}
                              style={styles.card}
                              onPress={() => handleServicoPress(serv)}
                              activeOpacity={0.8}
                            >
                              <View style={styles.iconCenter}>{serv.icon}</View>
                              <Text style={styles.cardText}>{serv.nome}</Text>
                              <View style={styles.badgeContainer}>
                                <Text style={styles.badgeTexto}>
                                  {quantidadeProf} profissional{quantidadeProf !== 1 ? "s" : ""}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}

                  {prestadoresFiltrados.length > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Prestadores</Text>
                      {prestadoresFiltrados.map((prestador: any) => (
                        <TouchableOpacity
                          key={prestador.id}
                          style={styles.prestadorCard}
                          onPress={() => handleProfissionalPress(prestador)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.prestadorAvatar}>
                            <Text style={styles.prestadorAvatarText}>
                              {String(prestador.nome || "")
                                .split(" ")
                                .filter(Boolean)
                                .map((n: string) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2) || "P"}
                            </Text>
                          </View>
                          <View style={styles.prestadorInfo}>
                            <Text style={styles.prestadorNome}>{prestador.nome}</Text>
                            <Text style={styles.prestadorProfissao}>{prestador.profissao}</Text>
                            <View style={styles.prestadorRating}>
                              <Text style={styles.prestadorEstrela}>⭐ {Number(prestador.avaliacao || 0).toFixed(1)} ({Number(prestador.numeroAvaliacoes || 0)})</Text>
                              <Text style={styles.prestadorDistancia}>📍 {prestador.distancia}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                </View>
              ) : (
                <Text style={[styles.nenhumResultado, { color: theme.textMuted }]}>
                  Nenhum resultado encontrado
                </Text>
              )
            ) : (
              <Text style={[styles.nenhumResultado, { color: theme.textMuted }]}>
                Digite para buscar serviços e prestadores
              </Text>
            )}

            <View style={{ height: 20 }} />
          </>
        )}

      <Modal visible={modalVisivel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.surfaceTextPrimary }]}>Gerenciar Serviço</Text>

            <Text style={styles.modalServicoTitulo}>
              {servicoSelecionado?.estilo || servicoSelecionado?.tipo || "Serviço"}
            </Text>

            <Text style={[styles.modalInfo, { color: theme.surfaceTextMuted }]}>
              {servicoSelecionado?.data || "Data não informada"} • {servicoSelecionado?.local || "Local não informado"}
            </Text>

            {servicoSelecionado?.status === "valor_pendente" ? (
              <>
                <View style={[styles.propostaValorBox, isDark && { backgroundColor: "rgba(22,163,74,0.14)", borderColor: "rgba(134,239,172,0.35)" }]}>
                  <Text style={[styles.propostaValorLabel, isDark && { color: "#86EFAC" }]}>Valor informado</Text>
                  <Text style={[styles.propostaValorTexto, isDark && { color: "#86EFAC" }]}>
                    {formatarValor(servicoSelecionado?.valorProposto ?? servicoSelecionado?.valor)}
                  </Text>
                </View>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={styles.modalFinishButton}
                    onPress={() => responderPropostaValor("accept")}
                    disabled={respondendoProposta}
                  >
                    <Text style={styles.modalFinishText}>{respondendoProposta ? "Enviando..." : "Aceitar proposta"}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={styles.modalProblemButton}
                    onPress={() => responderPropostaValor("reject")}
                    disabled={respondendoProposta}
                  >
                    <Text style={styles.modalProblemText}>Recusar proposta</Text>
                  </TouchableOpacity>
                </View>
                <TextInput style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]} value={mensagemProposta} onChangeText={setMensagemProposta} placeholder="Peça uma alteração ou explique sua resposta..." placeholderTextColor={theme.textMuted} multiline />
                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity style={styles.modalProblemButton} onPress={() => responderPropostaValor("request_change")} disabled={respondendoProposta}>
                    <Text style={styles.modalProblemText}>Solicitar alteração</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.modalInputContainer}>
                  <Text style={[styles.modalLabel, { color: theme.surfaceTextMuted }]}>Reportar problema (opcional)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="Descreva o problema..."
                    placeholderTextColor={theme.textMuted}
                    value={problemaTexto}
                    onChangeText={setProblemaTexto}
                    multiline
                  />
                </View>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={styles.modalProblemButton}
                    onPress={() => atualizarStatusServico("problema")}
                  >
                    <Text style={styles.modalProblemText}>Reportar Problema</Text>
                  </TouchableOpacity>
                </View>

                {servicoSelecionado?.status === "aguardando_confirmacao" ? (
                  <View style={styles.modalButtonsRow}>
                    <TouchableOpacity
                      style={styles.modalFinishButton}
                      onPress={() => atualizarStatusServico("realizado")}
                    >
                      <Text style={styles.modalFinishText}>Confirmar serviço finalizado</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.modalInfo}>
                    A confirmação será liberada quando o prestador informar a finalização.
                  </Text>
                )}
              </>
            )}

            <TouchableOpacity style={styles.modalCloseButton} onPress={fecharModal}>
              <Text style={styles.modalCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      <Modal visible={modalAreaVisivel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
            <Text style={styles.modalTitle}>Solicitar por area</Text>

            <Text style={styles.modalLabel}>Area do servico *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={areaSelecionada}
                onValueChange={(value) => setAreaSelecionada(value)}
              >
                <Picker.Item label="Selecione uma area" value="" />
                {servicosPopulares.map((serv: any) => (
                  <Picker.Item key={serv.id} label={serv.nome} value={serv.nome} />
                ))}
              </Picker>
            </View>

            <Text style={styles.modalLabel}>Data do servico *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#999"
              value={dataSolicitacao}
              onChangeText={setDataSolicitacao}
            />

            <Text style={styles.modalLabel}>Local do servico *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Rua, numero, bairro..."
              placeholderTextColor="#999"
              value={localSolicitacao}
              onChangeText={setLocalSolicitacao}
            />

            <Text style={styles.modalLabel}>Descricao (opcional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputLong]}
              placeholder="Descreva detalhes do servico..."
              placeholderTextColor="#999"
              value={descricaoSolicitacao}
              onChangeText={setDescricaoSolicitacao}
              multiline
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalProblemButton}
                onPress={fecharModalArea}
                disabled={enviandoSolicitacao}
              >
                <Text style={styles.modalProblemText}>Cancelar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.modalFinishButton,
                  enviandoSolicitacao && styles.botaoDesabilitado,
                ]}
                onPress={enviarSolicitacaoPorArea}
                disabled={enviandoSolicitacao}
              >
                <Text style={styles.modalFinishText}>
                  {enviandoSolicitacao ? "Enviando..." : "Enviar solicitacao"}
                </Text>
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
  containerFull: {
    flex: 1,
  },

  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },

  containerContent: {
    flexGrow: 1,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginBottom: 6,
    marginTop: 5,
  },

  topBarTitle: {
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: "#0F2937",
  },

  topBarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 41, 55, 0.06)",
  },

  bellWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  notificationDot: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF8700",
    borderWidth: 2,
    borderColor: "#ffffff",
  },

  greetingCard: {
    backgroundColor: "#FFF4E5",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#0F2937",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  greetingTextCol: {
    flex: 1,
    paddingRight: 12,
  },

  greetingTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F2937",
    marginBottom: 6,
  },

  greetingSub: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },

  greetingAvatarBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#DDEEFF",
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F7FB",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    marginTop: 4,
    marginBottom: 18,
  },

  searchInput: {
    marginLeft: 12,
    flex: 1,
    fontSize: 15,
    color: "#0F2937",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F2937",
    marginBottom: 12,
  },

  sectionHeader: {
    marginTop: 6,
    marginBottom: 10,
  },

  sectionUnderline: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#FF8700",
    marginTop: -4,
  },

  primaryActionWrap: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#0F2937",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },

  primaryAction: {
    padding: 18,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
  },

  primaryActionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  primaryActionText: {
    flex: 1,
  },

  primaryActionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },

  primaryActionSub: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },

  primaryActionArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#0F2937",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },

  iconCenter: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#E7F3FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  cardText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F2937",
    textAlign: "center",
  },

  serviceCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#0F2937",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },

  serviceIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  serviceTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F2937",
    marginBottom: 6,
  },

  serviceSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    lineHeight: 16,
    minHeight: 32,
  },

  recomendadoCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#FF8700",
  },

  avatarRecomendado: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF8700",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },

  nomeProf: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F2937",
  },

  profissaoBadge: {
    marginTop: 6,
    backgroundColor: "#DDEEFF",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: "flex-start",
  },

  profissaoTexto: {
    color: "#FF8700",
    fontSize: 12,
    fontWeight: "700",
  },

  infoLinha: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  infoTxt: {
    fontSize: 13,
    color: "#64748B",
    marginLeft: 8,
  },

  botaoChamar: {
    backgroundColor: "#FF8700",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignSelf: "center",
    elevation: 2,
  },

  botaoTxt: {
    color: "#fff",
    fontWeight: "700",
  },

  nenhumResultado: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginVertical: 24,
  },

  carregandoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 36,
  },

  carregandoTexto: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 12,
  },

  badgeContainer: {
    marginTop: 10,
    backgroundColor: "#FF8700",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignSelf: "center",
  },

  badgeTexto: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  emptyStateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },

  emptyStateIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F3F7FB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  emptyStateTextCol: {
    flex: 1,
  },

  emptyStateTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F2937",
    marginBottom: 4,
  },

  emptyStateSub: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },

  sectionButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF4E5",
    borderRadius: 20,
    padding: 18,
    marginVertical: 18,
    borderLeftWidth: 4,
    borderLeftColor: "#FF8700",
    shadowColor: "#0F2937",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },

  sectionButtonContent: {
    flex: 1,
  },

  sectionButtonTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F2937",
    marginBottom: 4,
  },

  sectionButtonSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },

  sectionButtonArrow: {
    fontSize: 24,
    color: "#FF8700",
    fontWeight: "700",
    marginLeft: 12,
  },

  servicosAceitosList: {
    marginBottom: 12,
  },

  servicoAceitoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#FF8700",
  },

  servicoAceitoTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F2937",
    marginBottom: 6,
  },

  servicoAceitoInfo: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 8,
  },

  servicoAceitoValor: {
    fontSize: 14,
    color: "#166534",
    fontWeight: "800",
    marginBottom: 8,
  },

  servicoAceitoAcoes: {
    fontSize: 12,
    color: "#FF8700",
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalContainer: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 22,
    shadowColor: "#0F2937",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F2937",
    marginBottom: 10,
  },

  modalServicoTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF8700",
    marginBottom: 6,
  },

  modalInfo: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 14,
  },

  propostaValorBox: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#86EFAC",
    padding: 14,
    marginBottom: 8,
  },

  propostaValorLabel: {
    fontSize: 12,
    color: "#166534",
    fontWeight: "700",
    marginBottom: 4,
  },

  propostaValorTexto: {
    fontSize: 22,
    color: "#166534",
    fontWeight: "800",
  },

  modalInputContainer: {
    marginBottom: 14,
  },

  modalLabel: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 8,
  },

  modalInput: {
    backgroundColor: "#F5F8FC",
    borderRadius: 16,
    padding: 14,
    minHeight: 70,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#0F2937",
    borderWidth: 1,
    borderColor: "#FFF4E5",
  },

  modalInputLong: {
    minHeight: 90,
  },

  pickerContainer: {
    backgroundColor: "#F5F8FC",
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FFF4E5",
  },

  modalButtonsRow: {
    marginTop: 10,
  },

  modalProblemButton: {
    backgroundColor: "#FBBF24",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  modalProblemText: {
    color: "#0F2937",
    fontWeight: "700",
    fontSize: 14,
  },

  modalFinishButton: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  modalFinishText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },

  modalCloseButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#F3F7FB",
    alignItems: "center",
  },

  modalCloseText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },

  botaoDesabilitado: {
    opacity: 0.6,
  },

  prestadoresListContainer: {
    marginBottom: 24,
  },

  prestadorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#FF8700",
  },

  prestadorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF8700",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  prestadorAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  prestadorInfo: {
    flex: 1,
  },

  prestadorNome: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F2937",
    marginBottom: 4,
  },

  prestadorProfissao: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 6,
  },

  prestadorRating: {
    flexDirection: "row",
    alignItems: "center",
  },

  prestadorEstrela: {
    fontSize: 12,
    color: "#F59E0B",
    fontWeight: "700",
  },

  prestadorDistancia: {
    fontSize: 12,
    color: "#64748B",
  },

  bottomTabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  bottomTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },

  bottomTabActive: {
    borderTopWidth: 3,
    borderTopColor: "#FF8700",
    backgroundColor: "rgba(255, 135, 0, 0.10)",
  },

  bottomTabIcon: {
    fontSize: 22,
    marginBottom: 4,
  },

  bottomTabIconActive: {
    fontSize: 24,
  },

  bottomTabLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },

  bottomTabLabelActive: {
    color: "#FF8700",
    fontWeight: "700",
    fontSize: 12,
  },
  mapDiscoveryCard: {
    minHeight: 84,
    marginTop: 18,
    marginBottom: 4,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mapDiscoveryIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  mapDiscoveryCopy: {
    flex: 1,
  },
  mapDiscoveryTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  mapDiscoveryText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
});
