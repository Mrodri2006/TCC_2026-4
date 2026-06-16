import { View, Text, TouchableOpacity, ScrollView, Alert, Image, StyleSheet, ActivityIndicator, TextInput } from "react-native";
import { ArrowLeft, Edit2, Star, MapPin, Phone, Mail, Briefcase, Camera, ArrowRight, Trash2 } from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { auth, firestore, storage } from "../firebase";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../theme/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMensalidadeStatus } from "../services/billingService";
import { useMensalidadeStatus } from "../hooks/useMensalidadeStatus";

export default function PerfilTrabalhador() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useTheme();
  const { status: mensalidadeAtual, loading: mensalidadeLoading } = useMensalidadeStatus(30000);

  const cardBackground = isDark ? theme.surface : "#FFFFFF";
  const sectionBackground = isDark ? theme.surface : "#E8F4FB";
  const borderColor = isDark ? theme.surfaceBorder : "#E0E0E0";
  const textPrimary = theme.textPrimary;
  const textSecondary = theme.textSecondary;
  const textMuted = theme.textMuted;
  const iconBackground = isDark ? "rgba(255,255,255,0.06)" : "rgba(15, 41, 55, 0.06)";

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
  const [mostrarTodasAvaliacoes, setMostrarTodasAvaliacoes] = useState(false);
  const [verificandoPagamento, setVerificandoPagamento] = useState(false);
  const [postagens, setPostagens] = useState<any[]>([]);
  const [novaPostagem, setNovaPostagem] = useState("");
  const [postagensCarregando, setPostagensCarregando] = useState(false);

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

            setPostagensCarregando(true);
            const postsSnapshot = await firestore
              .collection("Usuario")
              .doc(usuarioAutenticado.uid)
              .collection("Posts")
              .orderBy("createdAt", "desc")
              .get();
            const postsLista = postsSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setPostagens(postsLista);
            setPostagensCarregando(false);
          }
        } catch (erro) {
          console.log("Erro ao carregar dados:", erro);
          setPostagensCarregando(false);
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

  const vencimentoData = getDateFromField(mensalidadeAtual?.dataVencimento);
  const bloqueadoPorMensalidade =
    !mensalidadeLoading &&
    (mensalidadeAtual?.contaAtiva === false || mensalidadeAtual?.assinaturaAtiva === false);
  const LIMITE_AVALIACOES = 3;
  const avaliacoesVisiveis = mostrarTodasAvaliacoes
    ? avaliacoes
    : avaliacoes.slice(0, LIMITE_AVALIACOES);

  const verificarConfirmacaoPagamento = async () => {
    try {
      const usuarioAutenticado = auth.currentUser;
      if (!usuarioAutenticado) {
        Alert.alert("Erro", "Usuário não autenticado.");
        return;
      }

      setVerificandoPagamento(true);
      const statusAtual = await getMensalidadeStatus();

      if (statusAtual.contaAtiva && statusAtual.assinaturaAtiva) {
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

  const publicarPostagem = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert("Erro", "Usuário não autenticado.");
        return;
      }

      const texto = novaPostagem.trim();
      if (!texto) {
        Alert.alert("Postagem vazia", "Digite algo para publicar.");
        return;
      }

      const novoPost = {
        texto,
        createdAt: new Date(),
      };

      const postRef = await firestore
        .collection("Usuario")
        .doc(userId)
        .collection("Posts")
        .add(novoPost);

      setPostagens((prev) => [{ id: postRef.id, ...novoPost }, ...prev]);
      setNovaPostagem("");
      Alert.alert("Sucesso", "Post publicado no perfil.");
    } catch (erro) {
      console.error("Erro ao publicar postagem:", erro);
      Alert.alert("Erro", "Não foi possível publicar a postagem.");
    }
  };

  const handleDeletePostagem = (post: any) => {
    Alert.alert(
      "Excluir postagem",
      "Deseja apagar esta postagem?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const userId = auth.currentUser?.uid;
              if (!userId || !post?.id) {
                Alert.alert("Erro", "Nao foi possivel identificar a postagem.");
                return;
              }

              await firestore
                .collection("Usuario")
                .doc(userId)
                .collection("Posts")
                .doc(post.id)
                .delete();

              setPostagens((prev) => prev.filter((item) => item.id !== post.id));
              Alert.alert("Sucesso", "Postagem excluida com sucesso.");
            } catch (erro) {
              console.log("Erro ao excluir postagem:", erro);
              Alert.alert("Erro", "Nao foi possivel excluir a postagem.");
            }
          },
        },
      ]
    );
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
      <SafeAreaView style={[localStyles.container, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={localStyles.blockedContent}>
          <View style={[localStyles.blockedCard, { backgroundColor: cardBackground, borderColor, borderWidth: isDark ? 1 : 0 }]}> 
            <Text style={[localStyles.blockedTitle, { color: textPrimary }]}>Acesso temporariamente bloqueado</Text>
            <Text style={[localStyles.blockedText, { color: textSecondary }]}> 
              Seu período de uso expirou. O app será liberado apenas após a confirmação do pagamento da mensalidade.
            </Text>
            <Text style={[localStyles.blockedDate, { color: textMuted }]}> 
              Vencimento: {vencimentoData ? vencimentoData.toLocaleDateString("pt-BR") : "não informado"}
            </Text>

            <TouchableOpacity
              style={localStyles.primaryBlockedButton}
              onPress={() => navigation.navigate("PagamentoMensalidade")}
            >
              <Text style={localStyles.primaryBlockedButtonText}>Pagar mensalidade</Text>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[localStyles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={localStyles.scrollContent}>
        <View style={localStyles.headerCard}>
          <View style={localStyles.topRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[localStyles.iconButton, { backgroundColor: theme.headerBtnBg }]}> 
              <ArrowLeft size={20} color={textPrimary} />
            </TouchableOpacity>
            <Text style={[localStyles.topBarTitle, { color: textPrimary }]}>Perfil</Text>
            <TouchableOpacity onPress={() => navigation.navigate("EditarPerfil")} style={[localStyles.editButton, { backgroundColor: theme.headerBtnBg }]}> 
              <Edit2 size={18} color={textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={[localStyles.profileHeader, { backgroundColor: sectionBackground, borderColor, borderWidth: isDark ? 1 : 0 }]}> 
            <View style={localStyles.avatarWrapper}>
              {usuario.fotoPerfil ? (
                <Image source={{ uri: usuario.fotoPerfil }} style={localStyles.avatarImage} />
              ) : (
                <View style={[localStyles.avatarCircle, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#D9EEF7" }]}> 
                  <Text style={[localStyles.avatarText, { color: textPrimary }]}> 
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
              <Text style={[localStyles.profileName, { color: textPrimary }]}>{usuario.nome || "Diarista 2"}</Text>
              <View style={localStyles.metaRow}>
                <MapPin size={14} color={textMuted} />
                <Text style={[localStyles.metaText, { color: textMuted }]}>{usuario.localizacao}</Text>
              </View>
              <View style={localStyles.ratingRow}>
                <Star size={16} color="#F5B403" fill="#F5B403" />
                <Text style={[localStyles.ratingScore, { color: textPrimary }]}>{usuario.avaliacao.toFixed(1)}</Text>
                <Text style={[localStyles.ratingText, { color: textMuted }]}>({usuario.numeroAvaliacoes} avaliações)</Text>
              </View>
            </View>
          </View>
        </View>

      <View style={localStyles.sectionBlock}>
        <Text style={[localStyles.sectionTitle, { color: textPrimary }]}>Contato</Text>
        <View style={[localStyles.infoCard, { backgroundColor: cardBackground, borderColor, borderWidth: isDark ? 1 : 0 }]}> 
          <View style={localStyles.infoRow}>
            <View style={[localStyles.infoIcon, { backgroundColor: iconBackground }]}><Phone size={18} color={textPrimary} /></View>
            <View style={localStyles.infoTextGroup}>
              <Text style={[localStyles.infoLabel, { color: textMuted }]}>Telefone</Text>
              <Text style={[localStyles.infoValue, { color: textPrimary }]}>{usuario.telefone || "Não informado"}</Text>
            </View>
          </View>
        </View>
        <View style={[localStyles.infoCard, { backgroundColor: cardBackground, borderColor, borderWidth: isDark ? 1 : 0 }]}> 
          <View style={localStyles.infoRow}>
            <View style={[localStyles.infoIcon, { backgroundColor: iconBackground }]}><Mail size={18} color={textPrimary} /></View>
            <View style={localStyles.infoTextGroup}>
              <Text style={[localStyles.infoLabel, { color: textMuted }]}>Email</Text>
              <Text style={[localStyles.infoValue, { color: textPrimary }]}>{usuario.email || "Não informado"}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={localStyles.sectionBlock}>
        <View style={localStyles.sectionHeaderRow}>
          <Text style={[localStyles.sectionTitle, { color: textPrimary }]}>Serviços</Text>
          <Text style={[localStyles.sectionMeta, { color: textMuted }]}>1 categoria</Text>
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
          <Text style={[localStyles.sectionTitle, { color: textPrimary }]}>Postagens</Text>
          <Text style={[localStyles.sectionMeta, { color: textMuted }]}>{postagens.length} publicações</Text>
        </View>
        <View style={[localStyles.postInputCard, { backgroundColor: cardBackground, borderColor, borderWidth: isDark ? 1 : 0 }]}> 
          <TextInput
            style={[localStyles.newPostInput, { color: textPrimary, borderColor }]}
            placeholder="Escreva uma postagem sobre seu trabalho..."
            placeholderTextColor={textMuted}
            value={novaPostagem}
            onChangeText={setNovaPostagem}
            multiline
          />
          <TouchableOpacity style={[localStyles.postButton, { backgroundColor: "#2563EB" }]} onPress={publicarPostagem}>
            <Text style={localStyles.postButtonText}>Publicar</Text>
          </TouchableOpacity>
        </View>
        {postagensCarregando ? (
          <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 12 }} />
        ) : postagens.length > 0 ? (
          postagens.map((post) => (
            <View key={post.id} style={[localStyles.postCard, { backgroundColor: cardBackground, borderColor, borderWidth: isDark ? 1 : 0 }]}> 
              <View style={localStyles.postHeaderRow}>
                <View style={localStyles.postContent}>
                  <Text style={[localStyles.postText, { color: textPrimary }]}>{post.texto}</Text>
                  <Text style={[localStyles.postTimestamp, { color: textMuted }]}>
                    {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString("pt-BR") : new Date(post.createdAt).toLocaleDateString("pt-BR")}
                  </Text>
                </View>

                <TouchableOpacity
                  style={localStyles.deletePostButton}
                  onPress={() => handleDeletePostagem(post)}
                  activeOpacity={0.85}
                >
                  <Trash2 size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={[localStyles.emptyText, { color: textMuted }]}>Nenhuma postagem feita ainda.</Text>
        )}
      </View>

      <View style={localStyles.sectionBlock}>
        <View style={localStyles.sectionHeaderRow}>
          <Text style={[localStyles.sectionTitle, { color: textPrimary }]}>Serviços feitos</Text>
          <Text style={[localStyles.sectionMeta, { color: textMuted }]}>{historico.length}</Text>
        </View>
        {historico.length > 0 ? (
          historico.map((item) => (
            <View key={item.id} style={[localStyles.offerCard, { backgroundColor: cardBackground, borderColor, borderWidth: isDark ? 1 : 0 }]}> 
              {item.imagem && (
                <Image source={{ uri: item.imagem }} style={localStyles.offerImage} />
              )}
              <View style={localStyles.offerContent}>
                <View style={localStyles.offerTopRow}>
                  <Text style={[localStyles.offerTitle, { color: textPrimary }]}>{item.servico || "Serviço"}</Text>
                  <Text style={[localStyles.offerPrice, { color: textPrimary }]}> 
                    R$ {typeof item.valor === 'number' ? item.valor.toFixed(2) : item.valor}
                  </Text>
                </View>
                <View style={localStyles.offerBottomRow}>
                  <Text style={[localStyles.offerDate, { color: textMuted }]}>{item.data}</Text>
                  <View style={[localStyles.offerStatusBadge, { backgroundColor: isDark ? "rgba(72, 187, 120, 0.15)" : "#E6F7EC" }]}> 
                    <Text style={[localStyles.offerStatusText, { color: isDark ? "#A7F3D0" : "#276A45" }]}>{item.status || "Oferecido"}</Text>
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
          <Text style={[localStyles.emptyText, { color: textMuted }]}>Nenhum serviço registrado ainda</Text>
        )}
      </View>

      <View style={localStyles.sectionBlock}>
        <View style={localStyles.sectionHeaderRow}>
          <Text style={[localStyles.sectionTitle, { color: textPrimary }]}>Avaliações</Text>
          <Text style={[localStyles.sectionMeta, { color: textMuted }]}>{avaliacoes.length} recebidas</Text>
        </View>
        {avaliacoes.length > 0 ? (
          avaliacoesVisiveis.map((item) => (
            <View key={item.id} style={[localStyles.reviewCard, { backgroundColor: cardBackground, borderColor, borderWidth: isDark ? 1 : 0 }]}> 
              <View style={localStyles.reviewHeader}>
                <Text style={[localStyles.reviewTitle, { color: textPrimary }]}>{item.servico || "Serviço"}</Text>
                <View style={localStyles.reviewRating}>
                  <Star size={14} color="#F5B403" fill="#F5B403" />
                  <Text style={[localStyles.reviewScore, { color: textPrimary }]}>{item.nota?.toFixed?.(1) || item.nota}</Text>
                </View>
              </View>
              <Text style={[localStyles.reviewDate, { color: textMuted }]}>{item.data}</Text>
            </View>
          ))
        ) : (
          <Text style={[localStyles.emptyText, { color: textMuted }]}>Ainda não há avaliações recebidas</Text>
        )}
        {avaliacoes.length > LIMITE_AVALIACOES ? (
          <TouchableOpacity
            style={[localStyles.verMaisButton, { backgroundColor: isDark ? theme.actionBg : "#EFF6FF", borderColor: isDark ? theme.surfaceBorder : "#BFDBFE" }]}
            onPress={() => setMostrarTodasAvaliacoes((prev) => !prev)}
          >
            <Text style={[localStyles.verMaisButtonText, { color: isDark ? theme.textPrimary : "#1D4ED8" }]}> 
              {mostrarTodasAvaliacoes ? "Ver menos" : "Ver mais"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

        <View style={localStyles.footerBlock}>
          <TouchableOpacity style={[localStyles.settingsButton, { backgroundColor: cardBackground, borderColor, borderWidth: isDark ? 1 : 0 }]} onPress={() => navigation.navigate("ConfiguracoesPrestador") }>
            <Text style={[localStyles.settingsButtonText, { color: textPrimary }]}>Acessar configurações</Text>
            <ArrowRight size={18} color={textPrimary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  verMaisButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  verMaisButtonText: {
    color: "#1D4ED8",
    fontWeight: "700",
    fontSize: 13,
  },
  scrollContent: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  headerCard: {
    marginBottom: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginBottom: 6,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F2937",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15, 41, 55, 0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15, 41, 55, 0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    alignItems: "center",
    marginTop: 0,
    marginBottom: 20,
    backgroundColor: "#E8F4FB",
    borderRadius: 28,
    paddingVertical: 22,
    paddingHorizontal: 18,
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  avatarWrapper: {
    marginBottom: 12,
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
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarText: {
    color: "#0F2937",
    fontSize: 32,
    fontWeight: "800",
  },
  profileInfo: {
    alignItems: "center",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  metaText: {
    marginLeft: 6,
    color: "#64748B",
    fontSize: 14,
    fontWeight: "500",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingScore: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  ratingText: {
    marginLeft: 6,
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
  sectionUnderline: {
    width: 44,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#0EA5A8",
    marginTop: 8,
    marginBottom: 14,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#0F2937",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#E8F4FB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
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
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DDEEFF",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipText: {
    marginLeft: 6,
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },
  offerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#0F2937",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  offerImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#E0E0E0",
  },
  offerContent: {
    padding: 14,
  },
  offerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F2937",
    flex: 1,
    paddingRight: 12,
  },
  offerPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F2937",
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
    backgroundColor: "#0EA5A8",
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
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#0F2937",
    shadowOpacity: 0.04,
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
    color: "#0F172A",
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
  postInputCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  newPostInput: {
    minHeight: 80,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    textAlignVertical: "top",
    fontSize: 14,
    backgroundColor: "transparent",
  },
  postButton: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  postButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  postCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  postHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  postContent: {
    flex: 1,
    paddingRight: 10,
  },
  postText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  postTimestamp: {
    fontSize: 12,
    color: "#64748B",
  },
  deletePostButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  footerBlock: {
    marginBottom: 30,
  },
  settingsButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: "#0F2937",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  settingsButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F2937",
  },
});
