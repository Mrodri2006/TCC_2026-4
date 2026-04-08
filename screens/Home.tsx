
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, Alert } from "react-native";
import { Search, User, Wrench, X } from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useState, useCallback, useRef } from "react";
import { auth, firestore } from "../firebase";
import { Picker } from "@react-native-picker/picker";
import { useTheme } from "../theme/ThemeContext";

export default function TelaInicialCliente({ onLogout }: any) {

  const navigation = useNavigation() as any;
  const { theme } = useTheme();
  const [searchText, setSearchText] = useState("");
  const [searchPrestadores, setSearchPrestadores] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("inicio");
  const [profissionaisRecomendados, setProfissionaisRecomendados] = useState([]);
  const [servicosPopulares, setServicosPopulares] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [servicosAceitos, setServicosAceitos] = useState<any[]>([]);
  const [carregandoAceitos, setCarregandoAceitos] = useState(true);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [servicoSelecionado, setServicoSelecionado] = useState<any>(null);
  const [problemaTexto, setProblemaTexto] = useState("");
  const [modalAreaVisivel, setModalAreaVisivel] = useState(false);
  const [areaSelecionada, setAreaSelecionada] = useState("");
  const [dataSolicitacao, setDataSolicitacao] = useState("");
  const [localSolicitacao, setLocalSolicitacao] = useState("");
  const [descricaoSolicitacao, setDescricaoSolicitacao] = useState("");
  const [enviandoSolicitacao, setEnviandoSolicitacao] = useState(false);
  const [userName, setUserName] = useState("");
  const unsubscribeAceitosRef = useRef<null | (() => void)>(null);

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
      const users = await firestore.collection("Usuario").get();
      const profissionais = [];
      const servicosUnicos = new Map<string, number>();

      for (const userDoc of users.docs) {
        const userData = userDoc.data();
        
        // faz a contagem dos serviços oferecidos por cada profissão
        if (userData.tipo === "prestador" && userData.profissao) {
          const count = (servicosUnicos.get(userData.profissao) || 0) + 1;
          servicosUnicos.set(userData.profissao, count);
          
          // Adiciona todos os prestadores independente se tem serviços ou não
          const profissional = {
            id: userDoc.id,
            nome: userData.nome || "Sem nome",
            avaliacao: userData.avaliacao || 4.5,
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
          icon: item[0] === "Diarista" ? <User size={28} /> : <Wrench size={28} />,
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

  const servicosFiltrados = servicosPopulares.filter((serv) =>
    serv.nome.toLowerCase().includes(searchText.toLowerCase())
  );

  const profissionaisFiltrados = profissionaisRecomendados.filter((pro) =>
    pro.nome.toLowerCase().includes(searchText.toLowerCase())
  );

  const prestadoresBuscados = profissionaisRecomendados.filter((pro) =>
    pro.nome.toLowerCase().includes(searchPrestadores.toLowerCase())
  );

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
          const aceitos = lista.filter((item: any) => item.status === "a fazer" || item.status === "aceito");
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
        prestadorId: null,
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

      // Atualiza (ou cria, se nÃ£o existir) o status no documento do trabalhador
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

  return (
    <View style={[styles.containerFull, { backgroundColor: theme.background }]}>
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        {abaAtiva === "inicio" ? (
          <>
            <View style={styles.header}>
              <Text style={styles.titulo}>Olá, {userName}!</Text>
              <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate("Perfil")}>
                <User size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Search size={20} color="#666" />
              <TextInput
                placeholder="Buscar serviços..."
                placeholderTextColor="#777"
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText("")}
                >
                  <X size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.sectionTitle}>Serviços Populares</Text>

            <TouchableOpacity style={styles.solicitarAreaButton} onPress={abrirModalArea}>
              <Text style={styles.solicitarAreaTitle}>Solicitar servico por area</Text>
              <Text style={styles.solicitarAreaSub}>Envie o pedido para prestadores da area escolhida</Text>
            </TouchableOpacity>

            {carregando ? (
              <View style={styles.carregandoContainer}>
                <ActivityIndicator size="large" color="#005362" />
                <Text style={styles.carregandoTexto}>Carregando serviços...</Text>
              </View>
            ) : servicosFiltrados.length > 0 ? (
              <View style={styles.grid}>
                {servicosFiltrados.map((serv) => {
                  const quantidadeProf = contarProfissionaisPorServico(serv.nome);
                  return (
                    <TouchableOpacity key={serv.id} style={styles.card} onPress={() => handleServicoPress(serv)}>
                      <View style={styles.iconCenter}>{serv.icon}</View>
                      <Text style={styles.cardText}>{serv.nome}</Text>
                      <View style={styles.badgeContainer}>
                        <Text style={styles.badgeTexto}>{quantidadeProf} profissional{quantidadeProf !== 1 ? "s" : ""}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.nenhumResultado}>Nenhum serviço encontrado</Text>
            )}

            <View>
              <Text style={styles.sectionTitle}>Serviços em andamento</Text>
            </View>

            {carregandoAceitos ? (
              <View style={styles.carregandoContainer}>
                <ActivityIndicator size="small" color="#005362" />
                <Text style={styles.carregandoTexto}>Carregando serviços aceitos...</Text>
              </View>
            ) : servicosAceitos.length > 0 ? (
              <View style={styles.servicosAceitosList}>
                {servicosAceitos.map((serv) => (
                  <TouchableOpacity
                    key={`${serv.id}-${serv.prestadorId}`}
                    style={styles.servicoAceitoCard}
                    onPress={() => abrirModal(serv)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.servicoAceitoTitulo}>
                      {serv.estilo || serv.tipo || "Serviço"}
                    </Text>
                    <Text style={styles.servicoAceitoInfo}>
                      {serv.data || "Data não informada"} • {serv.local || "Local não informado"}
                    </Text>
                    <Text style={styles.servicoAceitoAcoes}>Toque para gerenciar</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.nenhumResultado}>Nenhum serviço aceito no momento</Text>
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
            <Text style={styles.sectionTitle}>Buscar Prestadores</Text>
            <View style={styles.searchBoxPrestadores}>
              <Search size={20} color="#666" />
              <TextInput
                placeholder="Buscar por nome..."
                placeholderTextColor="#777"
                style={styles.searchInput}
                value={searchPrestadores}
                onChangeText={setSearchPrestadores}
              />
              {searchPrestadores.length > 0 && (
                <TouchableOpacity onPress={() => setSearchPrestadores("")}>
                  <X size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {searchPrestadores.length > 0 ? (
              prestadoresBuscados.length > 0 ? (
                <View style={styles.prestadoresListContainer}>
                  {prestadoresBuscados.map((prestador) => (
                    <TouchableOpacity
                      key={prestador.id}
                      style={styles.prestadorCard}
                      onPress={() => handleProfissionalPress(prestador)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.prestadorAvatar}>
                        <Text style={styles.prestadorAvatarText}>
                          {prestador.nome
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </Text>
                      </View>
                      <View style={styles.prestadorInfo}>
                        <Text style={styles.prestadorNome}>{prestador.nome}</Text>
                        <Text style={styles.prestadorProfissao}>{prestador.profissao}</Text>
                        <View style={styles.prestadorRating}>
                          <Text style={styles.prestadorEstrela}>⭐ {prestador.avaliacao}</Text>
                          <Text style={styles.prestadorDistancia}>📍 {prestador.distancia}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.nenhumResultado}>Nenhum prestador encontrado com esse nome</Text>
              )
            ) : (
              <Text style={styles.nenhumResultado}>Digite um nome para buscar prestadores</Text>
            )}

            <View style={{ height: 20 }} />
          </>
        )}

      <Modal visible={modalVisivel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Gerenciar Serviço</Text>

            <Text style={styles.modalServicoTitulo}>
              {servicoSelecionado?.estilo || servicoSelecionado?.tipo || "Serviço"}
            </Text>

            <Text style={styles.modalInfo}>
              {servicoSelecionado?.data || "Data não informada"} • {servicoSelecionado?.local || "Local não informado"}
            </Text>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Reportar problema (opcional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Descreva o problema..."
                placeholderTextColor="#999"
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

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalFinishButton}
                onPress={() => atualizarStatusServico("realizado")}
              >
                <Text style={styles.modalFinishText}>Finalizar Serviço</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.modalCloseButton} onPress={fecharModal}>
              <Text style={styles.modalCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      <Modal visible={modalAreaVisivel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
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

      <View style={styles.bottomTabsContainer}>
        <TouchableOpacity
          style={[styles.bottomTab, abaAtiva === "inicio" && styles.bottomTabActive]}
          onPress={() => setAbaAtiva("inicio")}
        >
          <Text style={[styles.bottomTabIcon, abaAtiva === "inicio" && styles.bottomTabIconActive]}>🏠</Text>
          <Text style={[styles.bottomTabLabel, abaAtiva === "inicio" && styles.bottomTabLabelActive]}>Início</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomTab, abaAtiva === "busca" && styles.bottomTabActive]}
          onPress={() => setAbaAtiva("busca")}
        >
          <Text style={[styles.bottomTabIcon, abaAtiva === "busca" && styles.bottomTabIconActive]}>🔍</Text>
          <Text style={[styles.bottomTabLabel, abaAtiva === "busca" && styles.bottomTabLabelActive]}>Buscar</Text>
        </TouchableOpacity>
      </View>
    </View>
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

  header: {
    backgroundColor: "#E8F4FF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#0F2937",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },

  titulo: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F2937",
    flex: 1,
  },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 41, 55, 0.08)",
    marginLeft: 1,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F7FB",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    marginVertical: 18,
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

  solicitarAreaButton: {
    backgroundColor: "#2563EB",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },

  solicitarAreaTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },

  solicitarAreaSub: {
    color: "#DDEEFF",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
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
    borderLeftColor: "#2563EB",
  },

  avatarRecomendado: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB",
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
    color: "#2563EB",
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
    backgroundColor: "#2563EB",
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
    backgroundColor: "#2563EB",
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

  sectionButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E8F4FF",
    borderRadius: 20,
    padding: 18,
    marginVertical: 18,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
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
    color: "#2563EB",
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
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
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

  servicoAceitoAcoes: {
    fontSize: 12,
    color: "#2563EB",
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
    color: "#2563EB",
    marginBottom: 6,
  },

  modalInfo: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 14,
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
    borderColor: "#E8F4FF",
  },

  modalInputLong: {
    minHeight: 90,
  },

  pickerContainer: {
    backgroundColor: "#F5F8FC",
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8F4FF",
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

  searchBoxPrestadores: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F7FB",
    padding: 14,
    borderRadius: 18,
    marginBottom: 16,
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
    borderLeftColor: "#2563EB",
  },

  prestadorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB",
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
    paddingBottom: 20,
  },

  bottomTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#fff",
  },

  bottomTabActive: {
    borderTopWidth: 3,
    borderTopColor: "#2563EB",
    backgroundColor: "#F3F7FB",
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
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 12,
  },
});

