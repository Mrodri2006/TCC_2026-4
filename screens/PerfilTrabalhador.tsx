import { View, Text, TouchableOpacity, ScrollView, Alert, Image } from "react-native";
import { ArrowLeft, Edit2, Star, MapPin, Phone, Mail, Briefcase, Camera } from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { auth, firestore, storage } from "../firebase";
import styles from "../estilo";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../theme/ThemeContext";

export default function PerfilTrabalhador() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [usuario, setUsuario] = useState({
    nome: "",
    email: "",
    telefone: "",
    profissao: "",
    avaliacao: 4.8,
    numeroAvaliacoes: 45,
    localizacao: "São Paulo, SP",
    descricao: "Profissional com experiência em serviços",
  });

  const [historico, setHistorico] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);

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
          }
        } catch (erro) {
          console.log("Erro ao carregar dados:", erro);
        }
      };

      carregarDados();
    }, [])
  );

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

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#000" style={{ marginBottom: 4, marginTop: 40 }} />
        </TouchableOpacity>
        <Text
          style={{
            marginTop: 40,
            marginBottom: 4,
            fontSize: 28,
            fontWeight: "600",
            color: "#000",
            alignItems: "center",
            marginRight: 130,
          }}
        >
          Meu Perfil
        </Text>
      </View>

      <View style={styles.perfilSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {usuario.fotoPerfil ? (
              <Image source={{ uri: usuario.fotoPerfil }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {usuario.nome
                  ? usuario.nome
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "U"}
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.avatarEditButton} onPress={selecionarFotoPerfil}>
            <Camera size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.nome}>{usuario.nome || "Carregando..."}</Text>

        <View style={styles.infoRow}>
          <MapPin size={16} color="#666" />
          <Text style={styles.infoText}>{usuario.localizacao}</Text>
        </View>
      </View>

      <View style={styles.avaliacaoCard}>
        <View style={styles.avaliacaoContent}>
          <Star size={20} color="#FFD700" fill="#FFD700" />
          <Text style={styles.avaliacaoTexto}>{usuario.avaliacao}</Text>
          <Text style={styles.avaliacaoSubtexto}>
            ({usuario.numeroAvaliacoes} avaliações)
          </Text>
        </View>
      </View>

      <View style={styles.contatoSection}>
        <Text style={styles.sectionTitle}>Informações de Contato</Text>

        <View style={styles.contatoItem}>
          <Phone size={18} color="#005362" />
          <View style={styles.contatoContent}>
            <Text style={styles.contatoLabel}>Telefone</Text>
            <Text style={styles.contatoValue}>{usuario.telefone || "N?o informado"}</Text>
          </View>
        </View>

        <View style={styles.contatoItem}>
          <Mail size={18} color="#005362" />
          <View style={styles.contatoContent}>
            <Text style={styles.contatoLabel}>Email</Text>
            <Text style={styles.contatoValue}>{usuario.email || "Carregando..."}</Text>
          </View>
        </View>
      </View>

      <View style={styles.historicoSection}>
        <Text style={styles.sectionTitle}>Serviços Oferecidos</Text>
        {usuario.profissao ? (
          <View style={styles.servicosContainer}>
            <View style={styles.servicoBadge}>
              <Briefcase size={16} color="#fff" />
              <Text style={styles.servicoTexto}>{usuario.profissao}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.nenhumTexto}>Nenhum serviço informado</Text>
        )}
      </View>

      <View style={styles.historicoSection}>
        <Text style={styles.sectionTitle}>Serviços Adicionados</Text>

        {historico.length > 0 ? (
          historico.map((item) => (
            <View key={item.id} style={styles.historicoCard}>
              <View style={styles.historicoContent}>
                <Text style={styles.historicoServico}>{item.servico}</Text>
                <Text style={styles.historicoData}>{item.data}</Text>
              </View>
              <View style={styles.historicoRight}>
                <Text style={styles.historicoValor}>R$ {item.valor}</Text>
                <View style={[styles.statusBadge, { backgroundColor: "#d4edda" }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
                <TouchableOpacity
                  style={styles.editButtonMini}
                  onPress={() =>
                    (navigation as any).navigate("AddServico", {
                      PrestId: auth.currentUser?.uid,
                      servicoId: item.id,
                      servico: {
                        estilo: item.estilo,
                        valor: item.valor,
                        imagem: item.imagem,
                      },
                    })
                  }
                >
                  <Edit2 size={16} color="#005362" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.nenhumTexto}>Nenhum servi?o encontrado</Text>
        )}
      </View>

      <View style={styles.historicoSection}>
        <Text style={styles.sectionTitle}>Avaliações Recebidas</Text>

        {avaliacoes.length > 0 ? (
          avaliacoes.map((item) => (
            <View key={item.id} style={styles.historicoCard}>
              <View style={styles.historicoContent}>
                <Text style={styles.historicoServico}>{item.servico}</Text>
                <Text style={styles.historicoData}>{item.data}</Text>
              </View>
              <View style={styles.historicoRight}>
                <Text style={styles.historicoValor}>{item.nota}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.nenhumTexto}>Nenhuma avaliação encontrada</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#000",
            marginBottom: 12,
          }}
        >
          Configurações
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: "#f0f0f0",
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#ddd",
            marginBottom: 50,
          }}
          onPress={() => navigation.navigate("ConfiguracoesPrestador")}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#005362" }}>
            Acessar configurações
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}


