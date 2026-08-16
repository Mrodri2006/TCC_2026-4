
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Image } from "react-native";
import { Star, MapPin, Phone, Mail, ArrowLeft, Award, Heart } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState, useEffect } from "react";
import { auth, firestore } from "../firebase";
import { useTheme } from "../theme/ThemeContext";
import { ReputationCard } from "../components/ReputationCard";
import { ProviderTrustBadge, ProviderTrustCard } from "../components/ProviderTrustBadge";
import { setProviderFavorite, subscribeProviderFavorite } from "../services/favoriteService";
import { getProviderRating } from "../services/reviewService";

const isPermissionDenied = (error: any) =>
  String(error?.code || "").toLowerCase() === "permission-denied";

const warnOptionalReadDenied = (label: string, providerId?: string) => {
  console.warn(`Sem permissao para carregar ${label} do profissional ${providerId || ""}.`);
};

export default function DetalheProfissional() {
  const navigation = useNavigation<any>();
  const route = useRoute() as any;
  const { profissional } = route.params || {};
  const { theme } = useTheme();

  const [servicos, setServicos] = useState<any[]>([]);
  const [usuarioData, setUsuarioData] = useState<any>({});
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [portfolioFotos, setPortfolioFotos] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [availabilitySummary, setAvailabilitySummary] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [favorito, setFavorito] = useState(false);
  const [salvandoFavorito, setSalvandoFavorito] = useState(false);

  const formatDate = (value: any) => {
    if (!value) return "";
    if (typeof value.toDate === "function") return value.toDate().toLocaleDateString("pt-BR");
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR");
  };
  const formatPriceRange = (data: any) => {
    const min = Number(data?.precoMinimo);
    const max = Number(data?.precoMaximo);
    if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min) return `R$ ${min.toFixed(0)} a R$ ${max.toFixed(0)}`;
    if (Number.isFinite(min) && min > 0) return `A partir de R$ ${min.toFixed(0)}`;
    if (Number.isFinite(max) && max > 0) return `Até R$ ${max.toFixed(0)}`;
    return "";
  };

  useEffect(() => {
    buscarDetalhes();
    if (!profissional?.id || !auth.currentUser) return;
    return subscribeProviderFavorite(profissional.id, setFavorito);
  }, [profissional?.id]);

  const alternarFavorito = async () => {
    try { setSalvandoFavorito(true); await setProviderFavorite({ id: profissional.id, nome: profissional.nome, profissao: profissional.profissao }, !favorito); }
    catch { Alert.alert("Favoritos", "Não foi possível atualizar o favorito. Verifique sua conexão e tente novamente."); }
    finally { setSalvandoFavorito(false); }
  };

  const buscarDetalhes = async () => {
    setCarregando(true);
    setPostsLoading(true);
    if (!profissional?.id) {
      setUsuarioData(profissional || {});
      setServicos([]);
      setAvaliacoes([]);
      setPosts([]);
      setPortfolioFotos([]);
      setAvailabilitySummary("");
      setPostsLoading(false);
      setCarregando(false);
      return;
    }

    try {
      let dadosUsuario: any = {};
      try {
        const userDoc = await firestore.collection("Usuario").doc(profissional.id).get();
        dadosUsuario = userDoc.exists ? userDoc.data() || {} : {};
      } catch (userError: any) {
        if (!isPermissionDenied(userError)) throw userError;
        warnOptionalReadDenied("dados principais", profissional.id);
      }

      const rating: any = await getProviderRating(profissional.id, { ...profissional, ...dadosUsuario });
      let avaliacoesData: any[] = Array.isArray(rating.avaliacoes) ? rating.avaliacoes : [];
      if (!avaliacoesData.length) {
        try {
          const avaliacoesSnapshot = await firestore.collection("Usuario").doc(profissional.id)
            .collection("Avaliacoes").orderBy("avaliacaoData", "desc").limit(20).get();
          avaliacoesData = avaliacoesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
        } catch (reviewError: any) {
          if (!isPermissionDenied(reviewError)) throw reviewError;
          warnOptionalReadDenied("avaliacoes", profissional.id);
        }
      }
      const reviewMillis = (value: any) => value?.toMillis?.() || (typeof value === "number" ? value : 0);
      setAvaliacoes(avaliacoesData.sort((a, b) => reviewMillis(b.avaliacaoData) - reviewMillis(a.avaliacaoData)));
      const notasPublicas = avaliacoesData
        .map((item) => Number(item.avaliacaoNota))
        .filter((nota) => Number.isFinite(nota) && nota >= 1 && nota <= 5);
      const ratingFinal = Number(rating.numeroAvaliacoes || 0) > 0
        ? rating
        : notasPublicas.length
          ? {
              avaliacao: notasPublicas.reduce((total, nota) => total + nota, 0) / notasPublicas.length,
              numeroAvaliacoes: notasPublicas.length,
            }
          : rating;
      setUsuarioData({
        ...profissional,
        ...dadosUsuario,
        ...ratingFinal,
        servicosConcluidos: Number(dadosUsuario.servicosConcluidos ?? profissional.servicosConcluidos ?? 0),
      });

      const servicosData: any[] = [];
      try {
        const servicosSnapshot = await firestore
          .collection("Usuario")
          .doc(profissional.id)
          .collection("Serv")
          .get();

        servicosSnapshot.forEach((doc) => {
          servicosData.push({
            id: doc.id,
            ...doc.data(),
          });
        });
      } catch (servicesError: any) {
        if (!isPermissionDenied(servicesError)) throw servicesError;
        warnOptionalReadDenied("servicos", profissional.id);
      }

      const postsData: any[] = [];
      try {
        const postsSnapshot = await firestore
          .collection("Usuario")
          .doc(profissional.id)
          .collection("Posts")
          .orderBy("createdAt", "desc")
          .get();

        postsSnapshot.forEach((doc) => {
          postsData.push({
            id: doc.id,
            ...doc.data(),
          });
        });
      } catch (postsError: any) {
        if (!isPermissionDenied(postsError)) throw postsError;
        warnOptionalReadDenied("postagens", profissional.id);
      }

      let portfolioData: any[] = [];
      try {
        const portfolioSnapshot = await firestore
          .collection("Usuario")
          .doc(profissional.id)
          .collection("Portfolio")
          .orderBy("createdAt", "desc")
          .limit(12)
          .get();
        portfolioData = portfolioSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (portfolioError: any) {
        if (!isPermissionDenied(portfolioError)) throw portfolioError;
        warnOptionalReadDenied("portfolio", profissional.id);
      }

      const week = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
      let availabilityText = "";
      try {
        const availabilitySnapshot = await firestore
          .collection("Usuario")
          .doc(profissional.id)
          .collection("Disponibilidade")
          .get();
        availabilityText = availabilitySnapshot.docs
          .map((doc) => ({ index: Number(doc.id), ...(doc.data() || {}) }))
          .filter((item: any) => item.enabled === true)
          .sort((a: any, b: any) => a.index - b.index)
          .slice(0, 4)
          .map((item: any) => `${week[item.index] || "Dia"} ${item.start || ""}-${item.end || ""}`)
          .join(", ");
      } catch (availabilityError: any) {
        if (!isPermissionDenied(availabilityError)) throw availabilityError;
        warnOptionalReadDenied("disponibilidade", profissional.id);
      }

      setServicos(servicosData);
      setPosts(postsData);
      setPortfolioFotos(portfolioData);
      setAvailabilitySummary(availabilityText);
    } catch (erro) {
      console.error("Erro ao buscar detalhes:", erro);
      setUsuarioData((current: any) => Object.keys(current || {}).length ? current : profissional);
    } finally {
      setPostsLoading(false);
      setCarregando(false);
    }
  };

  const handleSolicitarServico = (servico: any) => {
    navigation.navigate("SolicitarServico", {
      prestadorId: profissional.id,
      prestadorNome: profissional.nome,
      servico: servico.tipo || servico.nome || servico.estilo,
    });
  };

  const handleSolicitarServicoPrincipal = () => {
    if (servicos.length > 0) {
      handleSolicitarServico(servicos[0]);
    } else {
      navigation.navigate("SolicitarServico", {
        prestadorId: profissional.id,
        prestadorNome: profissional.nome,
        servico: profissional.profissao,
      });
    }
  };

  const handleAbrirChat = () => {
    navigation.navigate("Chat", {
      otherUserId: profissional.id,
      otherUserName: profissional.nome || "Prestador",
    });
  };

  if (carregando) {
    return (
      <View style={[styles.carregandoContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#FF8700" />
        <Text style={styles.carregandoTexto}>Carregando informações...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.headerDetalhe}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.botaoVoltar}>
          <ArrowLeft size={24} color="#FF8700" />
        </TouchableOpacity>
        <Text style={{marginTop:40, marginBottom:4, fontSize: 28, fontWeight: "600", color: "#0F2937"}}>Detalhes do Profissional</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.cardPrincipal}>
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.nomePrincipal}>{usuarioData.nome || profissional.nome}</Text>
            <ProviderTrustBadge provider={{ ...profissional, ...usuarioData }} compact style={styles.trustBadge} />
            <View style={styles.profissaoBadgePrincipal}>
              <Text style={styles.profissaoTextoPrincipal}>{usuarioData.profissao || profissional.profissao}</Text>
            </View>
          </View>
          <View style={styles.ratingSummary}>
            <Star size={19} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingAverage}>{Number(usuarioData.avaliacao || 0).toFixed(1)}</Text>
            <Text style={styles.ratingCount}>{Number(usuarioData.numeroAvaliacoes || 0)} avaliações</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Award size={20} color="#16A34A" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Serviços concluídos</Text>
              <Text style={styles.infoValor}>{Number(usuarioData.servicosConcluidos || 0)}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <MapPin size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Distância</Text>
              <Text style={styles.infoValor}>{profissional.distancia}</Text>
            </View>
          </View>

          {usuarioData?.fone && (
            <View style={styles.infoItem}>
              <Phone size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Telefone</Text>
                <Text style={styles.infoValor}>{usuarioData.fone}</Text>
              </View>
            </View>
          )}

          {usuarioData?.email && (
            <View style={styles.infoItem}>
              <Mail size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>E-mail</Text>
                <Text style={styles.infoValor}>{usuarioData.email}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <ReputationCard data={{ ...profissional, ...usuarioData }} />
      <ProviderTrustCard provider={{ ...profissional, ...usuarioData }} />

      <View style={styles.reviewsSection}>
        <View style={styles.sectionHeader}><Star size={20} color="#F59E0B" /><Text style={styles.sectionTitle}>Avaliações recebidas</Text></View>
        {avaliacoes.length ? avaliacoes.slice(0, 5).map((item) => (
          <View key={item.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}><Text style={styles.reviewStars}>{"★".repeat(Number(item.avaliacaoNota || 0))}{"☆".repeat(5 - Number(item.avaliacaoNota || 0))}</Text><Text style={styles.reviewDate}>{formatDate(item.avaliacaoData)}</Text></View>
            {!!item.servico && <Text style={styles.reviewService}>{item.servico}</Text>}
            {!!item.avaliacaoComentario && <Text style={styles.reviewComment}>{item.avaliacaoComentario}</Text>}
          </View>
        )) : <Text style={styles.emptyReviews}>Este profissional ainda não recebeu avaliações.</Text>}
      </View>

      {!!(usuarioData.experiencia || usuarioData.especialidades?.length || usuarioData.certificados?.length || usuarioData.site || usuarioData.portfolio) && <View style={styles.professionalSection}><Text style={styles.sectionTitle}>Perfil profissional</Text>{!!usuarioData.experiencia && <Text style={styles.professionalText}>{usuarioData.experiencia}</Text>}{!!usuarioData.especialidades?.length && <Text style={styles.professionalText}><Text style={styles.professionalLabel}>Especialidades: </Text>{usuarioData.especialidades.join(", ")}</Text>}{!!usuarioData.certificados?.length && <Text style={styles.professionalText}><Text style={styles.professionalLabel}>Certificados: </Text>{usuarioData.certificados.join(", ")}</Text>}{!!usuarioData.site && <Text style={styles.professionalLink}>{usuarioData.site}</Text>}{!!usuarioData.portfolio && <Text style={styles.professionalLink}>{usuarioData.portfolio}</Text>}</View>}

      {!!(usuarioData.tempoExperiencia || formatPriceRange(usuarioData) || availabilitySummary) && (
        <View style={styles.professionalSection}>
          <Text style={styles.sectionTitle}>Informações de contratação</Text>
          {!!usuarioData.tempoExperiencia && <Text style={styles.professionalText}><Text style={styles.professionalLabel}>Experiência: </Text>{usuarioData.tempoExperiencia}</Text>}
          {!!formatPriceRange(usuarioData) && <Text style={styles.professionalText}><Text style={styles.professionalLabel}>Faixa de preço: </Text>{formatPriceRange(usuarioData)}</Text>}
          {!!availabilitySummary && <Text style={styles.professionalText}><Text style={styles.professionalLabel}>Disponibilidade: </Text>{availabilitySummary}</Text>}
        </View>
      )}

      {portfolioFotos.length > 0 && (
        <View style={styles.portfolioSection}>
          <View style={styles.sectionHeader}>
            <Award size={20} color="#FF8700" />
            <Text style={styles.sectionTitle}>Portfólio</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.portfolioList}>
            {portfolioFotos.map((foto) => (
              <Image key={foto.id} source={{ uri: foto.url }} style={styles.portfolioImage} />
            ))}
          </ScrollView>
        </View>
      )}

      <TouchableOpacity style={[styles.favoriteButton, favorito && styles.favoriteButtonActive]} onPress={alternarFavorito} disabled={salvandoFavorito}>
        {salvandoFavorito ? <ActivityIndicator color="#EF4444" /> : <Heart size={20} color="#EF4444" fill={favorito ? "#EF4444" : "transparent"} />}
        <Text style={styles.favoriteText}>{favorito ? "Remover dos favoritos" : "Salvar profissional"}</Text>
      </TouchableOpacity>

      <View style={styles.servicosSection}>
        <View style={styles.sectionHeader}>
          <Award size={20} color="#FF8700" />
          <Text style={styles.sectionTitle}>Serviços Oferecidos</Text>
        </View>

        {servicos.length > 0 ? (
          servicos.map((servico) => (
            <TouchableOpacity 
              key={servico.id} 
              style={styles.servicoCard}
              activeOpacity={0.7}
              onPress={() => handleSolicitarServico(servico)}
            >
              <Text style={styles.servicoNome}>{servico.nome || servico.tipo || servico.estilo}</Text>
              <Text style={styles.servicoTipo}>Tipo: {servico.tipo}</Text>
              {servico.local && (
                <Text style={styles.servicoLocal}>Local: {servico.local}</Text>
              )}
              {servico.data && (
                <Text style={styles.servicoData}>Data: {servico.data}</Text>
              )}
              <Text style={styles.servicoAcao}>👉 Toque para solicitar</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.nenhumServico}>Nenhum serviço cadastrado</Text>
        )}
      </View>

      <View style={styles.postsSection}>
        <View style={styles.sectionHeader}>
          <Award size={20} color="#FF8700" />
          <Text style={styles.sectionTitle}>Postagens do Prestador</Text>
        </View>

        {postsLoading ? (
          <View style={styles.postsLoading}>
            <ActivityIndicator size="small" color="#FF8700" />
            <Text style={styles.postsLoadingText}>Carregando postagens...</Text>
          </View>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <Text style={styles.postText}>{post.texto}</Text>
              <Text style={styles.postDate}>{formatDate(post.createdAt)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.nenhumServico}>Nenhuma postagem pública encontrada</Text>
        )}
      </View>

      <View style={styles.acaoContainer}>
        <TouchableOpacity 
          style={styles.botaoContratar}
          onPress={handleSolicitarServicoPrincipal}
        >
          <Phone size={20} color="#fff" />
          <Text style={styles.botaoContrataTexto}>Solicitar Serviço</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.botaoChat}
          onPress={handleAbrirChat}
        >
          <Text style={styles.botaoChatTexto}>Conversar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 36,
  },

  carregandoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  carregandoTexto: {
    fontSize: 14,
    color: "#666",
    marginTop: 12,
  },

  headerDetalhe: {
    backgroundColor: "#FFF4E5",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  botaoVoltar: {
    padding: 8,
    marginTop: 40
  },

  tituloDetalhe: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },

  cardPrincipal: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 3,
  },

  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 16,
  },

  nomePrincipal: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F2937",
    marginBottom: 8,
  },

  profissaoBadgePrincipal: {
    backgroundColor: "#DDEEFF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },

  profissaoTextoPrincipal: {
    color: "#FF8700",
    fontSize: 13,
    fontWeight: "600",
  },
  trustBadge: {
    marginBottom: 8,
  },

  infoSection: {
    gap: 12,
  },

  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  infoContent: {
    marginLeft: 12,
    flex: 1,
  },

  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },

  infoValor: {
    fontSize: 14,
    color: "#0F2937",
    fontWeight: "600",
    marginTop: 2,
  },

  servicosSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F2937",
  },

  postsSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#F8FAFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#0F2937",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  postText: {
    fontSize: 14,
    color: "#0F2937",
    marginBottom: 6,
    lineHeight: 20,
  },

  postDate: {
    fontSize: 12,
    color: "#64748B",
  },

  postsLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },

  postsLoadingText: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 13,
  },

  servicoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#FF8700",
  },

  servicoNome: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F2937",
    marginBottom: 6,
  },

  servicoTipo: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
  },

  servicoLocal: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
  },

  servicoData: {
    fontSize: 12,
    color: "#999",
  },

  servicoAcao: {
    fontSize: 12,
    color: "#FF8700",
    fontWeight: "600",
    marginTop: 8,
  },

  nenhumServico: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingVertical: 20,
  },

  acaoContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 44,
  },

  ratingSummary: {
    minWidth: 94,
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ratingAverage: { color: "#0F2937", fontSize: 20, fontWeight: "800", marginTop: 2 },
  ratingCount: { color: "#64748B", fontSize: 10, fontWeight: "600", marginTop: 1 },
  professionalSection: { marginHorizontal: 16, marginBottom: 16, borderRadius: 18, padding: 16, backgroundColor: "#FFFFFF" },
  professionalText: { color: "#475569", fontSize: 13, lineHeight: 20, marginTop: 7 },
  professionalLabel: { color: "#0F172A", fontWeight: "800" },
  professionalLink: { color: "#FF8700", fontSize: 12, fontWeight: "800", marginTop: 8 },
  portfolioSection: { paddingHorizontal: 16, paddingVertical: 14 },
  portfolioList: { gap: 10, paddingRight: 16 },
  portfolioImage: { width: 132, height: 100, borderRadius: 14, backgroundColor: "#E2E8F0" },
  favoriteButton: { marginHorizontal: 16, marginBottom: 8, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: "#FCA5A5", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  favoriteButtonActive: { backgroundColor: "#FEF2F2" },
  favoriteText: { color: "#B91C1C", fontSize: 13, fontWeight: "800" },
  reviewsSection: { marginHorizontal: 16, marginBottom: 16, borderRadius: 18, padding: 16, backgroundColor: "#FFFFFF" },
  reviewCard: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0" },
  reviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewStars: { color: "#F59E0B", fontSize: 16, letterSpacing: 1 },
  reviewDate: { color: "#94A3B8", fontSize: 11, fontWeight: "600" },
  reviewService: { color: "#FF8700", fontSize: 11, fontWeight: "700", marginTop: 7 },
  reviewComment: { color: "#475569", fontSize: 13, lineHeight: 19, marginTop: 7 },
  emptyReviews: { color: "#64748B", fontSize: 13, textAlign: "center", paddingVertical: 18 },

  botaoContratar: {
    backgroundColor: "#FF8700",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    elevation: 3,
  },

  botaoChat: {
    backgroundColor: "#FF8700",
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  botaoChatTexto: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  botaoContrataTexto: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
