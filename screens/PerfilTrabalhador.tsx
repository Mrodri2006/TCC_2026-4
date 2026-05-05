import { View, Text, TouchableOpacity, ScrollView, Alert, Image, StyleSheet, ActivityIndicator } from "react-native";
import { ArrowLeft, Edit2, Star, MapPin, Phone, Mail, Briefcase, Camera, ArrowRight, Trash2 } from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { auth, firestore, storage } from "../firebase";
import styles from "../estilo";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../theme/ThemeContext";

export default function PerfilTrabalhador() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const [usuario, setUsuario] = useState({
    nome: "",
    email: "",
    telefone: "",
    profissao: "",
    fotoPerfil: "",
    avaliacao: 4.8,
    numeroAvaliacoes: 45,
    localizacao: "São Paulo, SP",
    descricao: "Profissional com experiência em serviços",
  });

  const [historico, setHistorico] = useState<any[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [mensalidadeStatus, setMensalidadeStatus] = useState("em_aberto");
  const [mensalidadeVencimento, setMensalidadeVencimento] = useState<any>(null);
  const [verificandoPagamento, setVerificandoPagamento] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const carregarDados = async () => {
        try {
          const usuarioAutenticado = auth.currentUser;

          if (usuarioAutenticado) {
            console.log('UID do usuário:', usuarioAutenticado.uid); 
            const docSnap = await firestore
              .collection("Usuario")
              .doc(usuarioAutenticado.uid)
              .get();

            if (docSnap.exists) {
              const dados = docSnap.data();

              setUsuario(prevState => ({
                ...prevState,
                nome: dados.nome || usuarioAutenticado.displayName || "Usuário",
                email: usuarioAutenticado.email || "",
                telefone: dados.fone || "",
                profissao: dados.profissao || "",
                localizacao: dados.localizacao || prevState.localizacao,
                fotoPerfil: dados.fotoPerfil || dados.foto || "",
              }));
              setMensalidadeStatus(dados.mensalidadeStatus || "em_aberto");
              setMensalidadeVencimento(dados.mensalidadeVencimento || null);
            }

            const snapshot = await firestore
              .collection("ServicosAdds")
              .doc(usuarioAutenticado.uid)
              .collection("ServicosOferecidos")
              .get();

            const lista = snapshot.docs.map(doc => {
              const data = doc.data();
              const imagemServico =
                data.imagem ||
                data.imagemUrl ||
                data.urlImagem ||
                data.foto ||
                data.photoUrl ||
                data.photo;
              console.log('Documento:', doc.id, data); 
              return {
                id: doc.id,
                servico: data.estilo,
                estilo: data.estilo,
                data: data.dataCriacao ? new Date(data.dataCriacao.seconds * 1000).toLocaleDateString('pt-BR') : 'Data não informada',
                status: data.status || 'Finalizado',
                valor: data.valor,
                imagem: imagemServico,
              };
            });
            console.log('Lista de serviços:', lista); 
            setHistorico(lista);

            const avalSnapshot = await firestore
              .collection("ServicosAgendados")
              .doc(usuarioAutenticado.uid)
              .collection("ServicoStatus")
              .where("avaliado", "==", true)
              .get();

              console.log('interagiu com firebase'); 

            const avalLista = avalSnapshot.docs.map((doc) => {
              try {
                const data = doc.data();
                const dataAvaliacao =
                  data.avaliacaoData?.toDate?.() ||
                  (data.avaliacaoData?.seconds
                    ? new Date(data.avaliacaoData.seconds * 1000)
                    : null);
                return {
                  id: doc.id,
                  nota: data.avaliacaoNota ?? 0,
                  data: dataAvaliacao ? dataAvaliacao.toLocaleDateString("pt-BR") : "Data não informada",
                  servico: data.estilo || data.tipo || "Servico",
                };
              } catch (error) {
                console.error('Erro ao processar avaliação:', error);
              }
            });
            if(avalLista)
              { console.log('Avaliação puxada'); }
            const total = avalLista.reduce((acc, item) => acc + Number(item.nota || 0), 0);
            const qtd = avalLista.length;
            const media = qtd > 0 ? Number((total / qtd).toFixed(1)) : 0;

            setAvaliacoes(avalLista);
            console.log('setou aval'); 
            setUsuario((prev) => ({
              ...prev,
              avaliacao: media || prev.avaliacao,
              numeroAvaliacoes: qtd,
            }));
            console.log('setou usuario'); 
          }
        } catch (erro) {
          console.log("Erro ao carregar dados:", erro);
        }
      };

      carregarDados();
    }, [])
  );

  const getDateFromField = (valor: any) => {
    if (!valor) return null;
    if (typeof valor?.toDate === "function") return valor.toDate();
    if (valor?.seconds) return new Date(valor.seconds * 1000);
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? null : data;
  };

  const vencimentoData = getDateFromField(mensalidadeVencimento);
  const mensalidadeVencida = !!vencimentoData && vencimentoData.getTime() < Date.now();
  const bloqueadoPorMensalidade = mensalidadeVencida && mensalidadeStatus !== "paga";

  const verificarConfirmacaoPagamento = async () => {
    try {
      const usuarioAutenticado = auth.currentUser;
      if (!usuarioAutenticado) {
        Alert.alert("Erro", "Usuário não autenticado.");
        return;
      }

      setVerificandoPagamento(true);
      const docSnap = await firestore.collection("Usuario").doc(usuarioAutenticado.uid).get();
      if (!docSnap.exists) {
        Alert.alert("Pagamento", "Não foi possível localizar os dados da mensalidade.");
        return;
      }

      const dados = docSnap.data() || {};
      const statusAtual = dados.mensalidadeStatus || "em_aberto";
      setMensalidadeStatus(statusAtual);
      setMensalidadeVencimento(dados.mensalidadeVencimento || null);

      if (statusAtual === "paga") {
        Alert.alert("Pagamento confirmado", "Acesso liberado com sucesso.");
      } else {
        Alert.alert("Aguardando confirmação", "O pagamento ainda não foi confirmado.");
      }
    } catch (erro) {
      console.log("Erro ao verificar pagamento:", erro);
      Alert.alert("Erro", "Não foi possível verificar o pagamento agora.");
    } finally {
      setVerificandoPagamento(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: "LoginTrabalhador" }],
      });
    } catch (erro) {
      console.log("Erro ao fazer logout:", erro);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Deletar Conta",
      "Tem certeza que deseja deletar sua conta? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Deletar",
          style: "destructive",
          onPress: async () => {
            try {
              const usuarioAutenticado = auth.currentUser;
              if (!usuarioAutenticado) return;

              await firestore.collection("Usuario").doc(usuarioAutenticado.uid).delete();
              const servicosSnapshot = await firestore
                .collection("ServicosAdds")
                .doc(usuarioAutenticado.uid)
                .collection("ServicosOferecidos")
                .get();
              const deletePromises = servicosSnapshot.docs.map(doc => doc.ref.delete());
              await Promise.all(deletePromises);
              
              await usuarioAutenticado.delete();

              Alert.alert("Conta deletada", "Sua conta foi deletada com sucesso.");
              navigation.reset({
                index: 0,
                routes: [{ name: "LoginTrabalhador" }],
              });
            } catch (erro) {
              console.log("Erro ao deletar conta:", erro);
              Alert.alert("Erro", "Não foi possível deletar a conta.");
            }
          },
        },
      ]
    );
  };

  const selecionarFotoPerfil = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão necessária", "Precisamos de acesso à galeria para adicionar uma foto.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert("Erro", "Usuário não autenticado.");
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      const caminho = `${userId}/avatar.jpg`;
      console.log("Iniciando upload para:", caminho);
      console.log("UID do usuário:", userId);

      try {
        // Converter arquivo para blob
        console.log("Buscando arquivo do URI:", uri);
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`Falha ao buscar imagem: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log("Blob criado, tamanho:", blob.size);

        // Usar Firebase Storage para upload
        console.log("Referenciando armazenamento...");
        const ref = storage.ref(caminho);
        
        console.log("Iniciando upload...");
        const metadata = { contentType: "image/jpeg" };
        const uploadTaskSnapshot = await ref.put(blob, metadata);
        
        console.log("Upload concluído! Bytes transferidos:", uploadTaskSnapshot.bytesTransferred);

        // Obter URL de download
        console.log("Obtendo URL de download...");
        const url = await ref.getDownloadURL();
        console.log("URL de download:", url);

        // Salvar URL no Firestore
        console.log("Salvando URL no Firestore...");
        await firestore.collection("Usuario").doc(userId).set(
          {
            fotoPerfil: url,
          },
          { merge: true }
        );

        setUsuario((prev) => ({ ...prev, fotoPerfil: url }));
        Alert.alert("Sucesso", "Foto de perfil atualizada com sucesso!");
      } catch (uploadError) {
        const err: any = uploadError;
        console.error("Erro detalhado no upload:", {
          message: err?.message,
          code: err?.code,
          name: err?.name,
          toString: err?.toString?.(),
        });
        
        // Verificar se é erro de permissão
        if (err?.code === "storage/unauthorized" || err?.code === "storage/unauthenticated") {
          throw new Error("Você não tem permissão para atualizar a foto. Verifique suas credenciais.");
        }
        throw err;
      }
    } catch (error) {
      const err: any = error;
      console.error("Erro ao atualizar foto de perfil:", err);
      console.error("Detalhes completos:", JSON.stringify(err, null, 2));
      Alert.alert("Erro", "Não foi possível atualizar a foto de perfil. Tente novamente.");
    }
  };

  const handleDeleteServico = (item: any) => {
    Alert.alert(
      "Excluir servico",
      `Deseja excluir "${item?.servico || "este servico"}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const userId = auth.currentUser?.uid;
              if (!userId || !item?.id) {
                Alert.alert("Erro", "Nao foi possivel identificar o servico.");
                return;
              }

              await firestore
                .collection("ServicosAdds")
                .doc(userId)
                .collection("ServicosOferecidos")
                .doc(item.id)
                .delete();

              if (
                item?.imagem &&
                typeof item.imagem === "string" &&
                item.imagem.includes("firebasestorage.googleapis.com")
              ) {
                try {
                  await storage.refFromURL(item.imagem).delete();
                } catch (erroImagem) {
                  console.log("Aviso ao remover imagem antiga:", erroImagem);
                }
              }

              setHistorico((prev) => prev.filter((serv) => serv.id !== item.id));
              Alert.alert("Sucesso", "Servico excluido com sucesso.");
            } catch (erro) {
              console.log("Erro ao excluir servico:", erro);
              Alert.alert("Erro", "Nao foi possivel excluir o servico.");
            }
          },
        },
      ]
    );
  };

  if (bloqueadoPorMensalidade) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={localStyles.blockedContent}
      >
        <View style={localStyles.blockedCard}>
          <Text style={localStyles.blockedTitle}>Acesso temporariamente bloqueado</Text>
          <Text style={localStyles.blockedText}>
            Seu período de uso expirou. O app será liberado apenas após a confirmação do pagamento da mensalidade.
          </Text>
          <Text style={localStyles.blockedDate}>
            Vencimento: {vencimentoData ? vencimentoData.toLocaleDateString("pt-BR") : "não informado"}
          </Text>

          <TouchableOpacity
            style={localStyles.primaryBlockedButton}
            onPress={() => navigation.navigate("ConfiguracoesPrestador")}
          >
            <Text style={localStyles.primaryBlockedButtonText}>Pagar com Pix</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={localStyles.secondaryBlockedButton}
            onPress={verificarConfirmacaoPagamento}
            disabled={verificandoPagamento}
          >
            {verificandoPagamento ? (
              <ActivityIndicator color="#0F2937" />
            ) : (
              <Text style={localStyles.secondaryBlockedButtonText}>Já paguei, verificar liberação</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={localStyles.scrollContent}>
      <View style={localStyles.headerCard}>
        <View style={localStyles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={localStyles.iconButton}>
            <ArrowLeft size={20} color="#0F2937" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("EditarPerfil")} style={localStyles.editButton}>
            <Edit2 size={18} color="#0F2937" />
          </TouchableOpacity>
        </View>

        <View style={localStyles.profileHeader}>
          <View style={localStyles.avatarWrapper}>
            {usuario.fotoPerfil ? (
              <Image source={{ uri: usuario.fotoPerfil }} style={localStyles.avatarImage} />
            ) : (
              <View style={localStyles.avatarCircle}>
                <Text style={localStyles.avatarText}>
                  {usuario.nome
                    .split(" ")
                    .filter(Boolean)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "DI"}
                </Text>
              </View>
            )}
          </View>

          <View style={localStyles.profileInfo}>
            <Text style={localStyles.profileName}>{usuario.nome || "Diarista 2"}</Text>
            <View style={localStyles.metaRow}>
              <MapPin size={14} color="#64748B" />
              <Text style={localStyles.metaText}>{usuario.localizacao}</Text>
            </View>
            <View style={localStyles.ratingRow}>
              <Star size={16} color="#F5B403" fill="#F5B403" />
              <Text style={localStyles.ratingScore}>{usuario.avaliacao.toFixed(1)}</Text>
              <Text style={localStyles.ratingText}>({usuario.numeroAvaliacoes} avaliações)</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={localStyles.sectionBlock}>
        <Text style={localStyles.sectionTitle}>Contato</Text>
        <View style={localStyles.infoCard}>
          <View style={localStyles.infoRow}>
            <View style={localStyles.infoIcon}><Phone size={18} color="#0F2937" /></View>
            <View style={localStyles.infoTextGroup}>
              <Text style={localStyles.infoLabel}>Telefone</Text>
              <Text style={localStyles.infoValue}>{usuario.telefone || "Não informado"}</Text>
            </View>
          </View>
        </View>
        <View style={localStyles.infoCard}>
          <View style={localStyles.infoRow}>
            <View style={localStyles.infoIcon}><Mail size={18} color="#0F2937" /></View>
            <View style={localStyles.infoTextGroup}>
              <Text style={localStyles.infoLabel}>Email</Text>
              <Text style={localStyles.infoValue}>{usuario.email || "Não informado"}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={localStyles.sectionBlock}>
        <View style={localStyles.sectionHeaderRow}>
          <Text style={localStyles.sectionTitle}>Serviços</Text>
          <Text style={localStyles.sectionMeta}>1 categoria</Text>
        </View>
        <View style={localStyles.chipRow}>
          <View style={localStyles.chip}> 
            <Briefcase size={14} color="#2563EB" />
            <Text style={localStyles.chipText}>{usuario.profissao || "Diarista"}</Text>
          </View>
        </View>
      </View>

      <View style={localStyles.sectionBlock}>
        <View style={localStyles.sectionHeaderRow}>
          <Text style={localStyles.sectionTitle}>Serviços feitos</Text>
          <Text style={localStyles.sectionMeta}>{historico.length}</Text>
        </View>
        {historico.length > 0 ? (
          historico.map((item) => (
            <View key={item.id} style={localStyles.offerCard}>
              {item.imagem && (
                <Image source={{ uri: item.imagem }} style={localStyles.offerImage} />
              )}
              <View style={localStyles.offerContent}>
                <View style={localStyles.offerTopRow}>
                  <Text style={localStyles.offerTitle}>{item.servico || "Serviço"}</Text>
                  <Text style={localStyles.offerPrice}>
                    R$ {typeof item.valor === 'number' ? item.valor.toFixed(2) : item.valor}
                  </Text>
                </View>
                <View style={localStyles.offerBottomRow}>
                  <Text style={localStyles.offerDate}>{item.data}</Text>
                  <View style={localStyles.offerStatusBadge}>
                    <Text style={localStyles.offerStatusText}>{item.status || "Oferecido"}</Text>
                  </View>
                </View>
                <View style={localStyles.serviceActionRow}>
                  <TouchableOpacity
                    style={localStyles.editServiceButton}
                    onPress={() =>
                      (navigation as any).navigate("AddServico", {
                        PrestId: auth.currentUser?.uid,
                        servicoId: item.id,
                        servico: {
                          estilo: item.servico,
                          valor: item.valor,
                          imagem: item.imagem,
                        },
                      })
                    }
                  >
                    <Edit2 size={14} color="#fff" />
                    <Text style={localStyles.editServiceButtonText}>Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={localStyles.deleteServiceButton}
                    onPress={() => handleDeleteServico(item)}
                  >
                    <Trash2 size={14} color="#fff" />
                    <Text style={localStyles.deleteServiceButtonText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={localStyles.emptyText}>Nenhum serviço registrado ainda</Text>
        )}
      </View>

      <View style={localStyles.sectionBlock}>
        <View style={localStyles.sectionHeaderRow}>
          <Text style={localStyles.sectionTitle}>Avaliações</Text>
          <Text style={localStyles.sectionMeta}>{avaliacoes.length} recebidas</Text>
        </View>
        {avaliacoes.length > 0 ? (
          avaliacoes.map((item) => (
            <View key={item.id} style={localStyles.reviewCard}>
              <View style={localStyles.reviewHeader}>
                <Text style={localStyles.reviewTitle}>{item.servico || "Serviço"}</Text>
                <View style={localStyles.reviewRating}>
                  <Star size={14} color="#F5B403" fill="#F5B403" />
                  <Text style={localStyles.reviewScore}>{item.nota?.toFixed?.(1) || item.nota}</Text>
                </View>
              </View>
              <Text style={localStyles.reviewDate}>{item.data}</Text>
            </View>
          ))
        ) : (
          <Text style={localStyles.emptyText}>Ainda não há avaliações recebidas</Text>
        )}
      </View>

      <View style={localStyles.footerBlock}>
        <TouchableOpacity style={localStyles.settingsButton} onPress={() => navigation.navigate("ConfiguracoesPrestador") }>
          <Text style={localStyles.settingsButtonText}>Acessar configurações</Text>
          <ArrowRight size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  blockedContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  blockedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#0F2937",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  blockedTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F2937",
    marginBottom: 10,
  },
  blockedText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 12,
  },
  blockedDate: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 18,
  },
  primaryBlockedButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryBlockedButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryBlockedButton: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  secondaryBlockedButtonText: {
    color: "#0F2937",
    fontWeight: "700",
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerCard: {
    backgroundColor: "#E8F4FF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#0F2937",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(15, 41, 55, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(15, 41, 55, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    marginRight: 16,
  },
  avatarCircle: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: "#D9EEF7",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F2937",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 28,
  },
  avatarText: {
    color: "#0F2937",
    fontSize: 32,
    fontWeight: "800",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F2937",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  metaText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "500",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ratingScore: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F2937",
  },
  ratingText: {
    fontSize: 13,
    color: "#64748B",
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F2937",
  },
  sectionMeta: {
    fontSize: 13,
    color: "#64748B",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EAF4FF",
    justifyContent: "center",
    alignItems: "center",
  },
  infoTextGroup: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F2937",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  chipText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "700",
  },
  offerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 14,
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
    overflow: "hidden",
  },
  offerImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#E0E0E0",
  },
  offerContent: {
    padding: 18,
  },
  offerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },  offerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F2937",
    flex: 1,
    paddingRight: 12,
  },
  offerPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2563EB",
  },
  offerBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  offerDate: {
    fontSize: 13,
    color: "#64748B",
  },
  offerStatusBadge: {
    backgroundColor: "#E6F7EC",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  editServiceButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  editServiceButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  serviceActionRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  deleteServiceButton: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  deleteServiceButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  offerStatusText: {
    color: "#276A45",
    fontSize: 12,
    fontWeight: "700",
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F2937",
  },
  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reviewScore: {
    color: "#0F2937",
    fontWeight: "700",
    fontSize: 14,
  },
  reviewDate: {
    fontSize: 13,
    color: "#64748B",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 16,
  },
  footerBlock: {
    marginBottom: 30,
  },
  settingsButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: "#2563EB",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
