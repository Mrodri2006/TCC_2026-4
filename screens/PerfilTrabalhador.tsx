import { View, Text, TouchableOpacity, ScrollView, Alert, Image } from "react-native";
import { ArrowLeft, Edit2, Star, MapPin, Phone, Mail, LogOut, Camera, Briefcase } from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { auth, firestore } from "../firebase";
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#fff" style={{marginTop: 40}} />
        </TouchableOpacity>

        <Text style={{ 
          marginTop: 40, 
          marginBottom: 4, 
          fontSize: 28, 
          fontWeight: "600", 
          color: "#000", 
          marginRight: 130 
          }}>
          Meu Perfil
        </Text>
      </View>

      <View style={styles.perfilSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar} />
        </View>
        <Text style={styles.nome}>{usuario.nome}</Text>
        <Text style={styles.email}>{usuario.email}</Text>
      </View>

      <View style={styles.avaliacaoCard}>
        <View style={styles.avaliacaoContent}>
          <Star size={20} color="#FFD700" fill="#FFD700" />
          <Text style={styles.avaliacaoTexto}>{usuario.avaliacao}</Text>
          <Text style={styles.avaliacaoSubtexto}>({usuario.numeroAvaliacoes} avaliações)</Text>
        </View>
      </View>

      <View style={styles.contatoSection}>
        <Text style={styles.sectionTitle}>Informações de Contato</Text>

        <View style={styles.infoItem}>
          <Phone size={18} color="#1e90ff" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Telefone</Text>
            <Text style={styles.infoText}>{usuario.telefone || "Não informado"}</Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <Mail size={18} color="#1e90ff" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoText}>{usuario.email}</Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <MapPin size={18} color="#1e90ff" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Localização</Text>
            <Text style={styles.infoText}>{usuario.localizacao}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Serviços Adicionados</Text>

        {historico.length > 0 ? (
          historico.map((item) => (
            <View key={item.id} style={styles.historicoItem}>
              <View style={styles.historicoLeft}>
                {item.imagem ? (
                  <Image source={{ uri: item.imagem }} style={styles.historicoImagem} />
                ) : (
                  <View style={styles.historicoImagemPlaceholder}>
                    <Camera size={16} color="#1e90ff" />
                    <Text style={styles.historicoImagemTexto}>Sem foto</Text>
                  </View>
                )}
                <View style={styles.historicoContent}>
                  <Text style={styles.historicoServico}>{item.servico}</Text>
                  <Text style={styles.historicoData}>{item.data}</Text>

                  <Text
                    style={[
                      styles.historicoStatus,
                      item.status === "Concluído" && styles.statusConcluido,
                    ]}
                  >
                    {item.status}
                  </Text>

                  <Text style={styles.historicoValor}>
                    R$ {item.valor}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.nenhumTexto}>Nenhum serviço encontrado</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Avaliações Recebidas</Text>

        {avaliacoes.length > 0 ? (
          avaliacoes.map((item) => (
            <View key={item.id} style={styles.historicoItem}>
              <View style={styles.historicoLeft}>
                <Star size={16} color="#FFD700" fill="#FFD700" />
                <View style={styles.historicoContent}>
                  <Text style={styles.historicoServico}>{item.servico}</Text>
                  <Text style={styles.historicoData}>{item.data}</Text>
                </View>
              </View>
              <Text style={styles.historicoValor}>{item.nota}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.nenhumTexto}>Nenhuma avaliação encontrada</Text>
        )}
      </View>


      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações</Text>
        <TouchableOpacity
          style={{
            backgroundColor: "#fff",
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#E0E0E0",
          }}
          onPress={() => navigation.navigate("ConfiguracoesPrestador")}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#005362" }}>
            Acessar configurações
          </Text>
        </TouchableOpacity>
        
      </View>
      <View style={styles.spacer} />
    </ScrollView>
  );
}
