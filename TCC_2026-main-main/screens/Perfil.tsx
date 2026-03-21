import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert } from "react-native";
import { ArrowLeft, Edit2, Star, MapPin, Phone, Mail, LogOut } from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { auth, firestore } from "../firebase";
import React from "react";
import styles from "../estilo";
import Aval from "../model/Aval";

export default function Perfil() {
  const navigation = useNavigation();
  const [usuario, setUsuario] = useState({
    nome: "",
    email: "",
    telefone: "",
    avaliacao: 4.8,
    numeroAvaliacoes: 45,
    localizacao: "São Paulo, SP",
    descricao: "Profissional com 5 anos de experiência em serviços gerais",
    servicos: [
      { id: 1, nome: "Eletricista" },
      { id: 2, nome: "Encanador" },
      { id: 3, nome: "Manutenção Geral" },
    ],
    historico: [
      { id: 1, servico: "Reparo Elétrico", data: "20/11/2024", status: "Concluído", valor: "R$ 150" },
      { id: 2, servico: "Desentupimento", data: "15/11/2024", status: "Concluído", valor: "R$ 200" },
      { id: 3, servico: "Instalação Luminária", data: "10/11/2024", status: "Concluído", valor: "R$ 120" },
    ],
  });
  useFocusEffect(
    useCallback(() => {
      const carregarDadosUsuario = async () => {
        try {
          const usuarioAutenticado = auth.currentUser;
          if (usuarioAutenticado) {
            const docSnap = await firestore.collection("Usuario").doc(usuarioAutenticado.uid).get();
            
            if (docSnap.exists) {
              const dados = docSnap.data();
              setUsuario(prevState => ({
                ...prevState,
                nome: dados.nome || usuarioAutenticado.displayName || "Usuário",
                email: usuarioAutenticado.email || "",
                telefone: dados.fone || "",
              }));
            } else {
              setUsuario(prevState => ({
                ...prevState,
                nome: usuarioAutenticado.displayName || "Usuário",
                email: usuarioAutenticado.email || "",
              }));
            }
          }
        } catch (erro) {
          console.log("Erro ao carregar dados do usuário:", erro);
        }
      };

      carregarDadosUsuario();
    }, [])
  );

  const handleDeletarConta = () => {
    Alert.alert(
      "Deletar Conta",
      "Tem certeza? Esta ação não pode ser desfeita. Todos os seus dados serão permanentemente removidos.",
      [
        { text: "Cancelar", onPress: () => {}, style: "cancel" },
        {
          text: "Deletar",
          onPress: async () => {
            try {
              const usuarioId = auth.currentUser?.uid;
              
              if (usuarioId) {
                await firestore.collection("Usuario").doc(usuarioId).delete();
              }

              await auth.currentUser?.delete();

              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });

              Alert.alert("Sucesso", "Sua conta foi deletada com sucesso");
            } catch (erro: any) {
              console.log("Erro ao deletar conta:", erro);
              Alert.alert("Erro", "Não foi possível deletar sua conta: " + erro.message);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
     
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#000" style={{marginBottom:4, marginTop:40}} />
        </TouchableOpacity>
        <Text style={{ 
          marginTop:40, 
          marginBottom:4, 
          fontSize: 28, 
          fontWeight: "600", 
          color: "#000", 
          alignItems: "center", 
          marginRight:130
          }}>
            Meu Perfil
          </Text>
      </View>
      
      <View style={styles.perfilSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {usuario.nome
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </Text>
          </View>
        </View>

        <Text style={styles.nome}>{usuario.nome || "Carregando..."}</Text>

        <View style={styles.infoRow}>
          <MapPin size={16} color="#666" />
          <Text style={styles.infoText}>{usuario.localizacao}</Text>
        </View>

      </View>


      <View style={styles.contatoSection}>
        <Text style={styles.sectionTitle}>Informações de Contato</Text>

        <View style={styles.contatoItem}>
          <Phone size={18} color="#005362" />
          <View style={styles.contatoContent}>
            <Text style={styles.contatoLabel}>Telefone</Text>
            <Text style={styles.contatoValue}>{usuario.telefone}</Text>
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
        <Text style={styles.sectionTitle}>Serviços Solicitados</Text>

        {usuario.historico.map((item) => (
          <View key={item.id} style={styles.historicoCard}>
            <View style={styles.historicoContent}>
              <Text style={styles.historicoServico}>{item.servico}</Text>
              <Text style={styles.historicoData}>{item.data}</Text>
            </View>
            <View style={styles.historicoRight}>
              <Text style={styles.historicoValor}>{item.valor}</Text>
              <View style={[styles.statusBadge, { backgroundColor: "#d4edda" }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <Text style={{
         fontSize: 16,
         fontWeight: "600",
         color: "#000",
         marginBottom: 12,
         }}>
           Configurações 
        </Text>
        <TouchableOpacity style={{
          backgroundColor: "#f0f0f0",
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 10,
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#ddd",
          marginBottom:50,
          }} onPress={() => navigation.navigate("Configuracoes")}>
          <Text style={{fontSize: 14, fontWeight: "600", color: "#005362", }}>Acessar configurações</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
