import { StyleSheet } from "react-native";

const COLORS = {
  primary: "#005362",
  accent: "#527954",
  white: "#FFFFFF",
  light: "#F7F7F7",
  dark: "#1E1E1E",
  gray: "#A0A0A0",
  danger: "#E74C3C",
};

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },

  containerHome: {
    flex: 1,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },

  titulo: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 180,
    marginBottom: 40,
  },

  titulo2: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.white,
    marginTop: 140,
    marginBottom: 40,
  },

  inputView: {
    width: "100%",
    marginBottom: 20,
  },

  input: {
    marginBottom: 20,
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 6,
  },

  buttonView: {
    width: "55%",
  },

  button: {
    backgroundColor: COLORS.primary,
    width: "100%",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },

  buttonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 15,
  },

  buttonSec: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
    borderWidth: 2,
  },

  buttonSecText: {
    color: COLORS.primary,
  },

  inputPicker: {
    marginBottom: 20,
    backgroundColor: COLORS.white,
    paddingLeft: 8,
    paddingVertical: 10,
    borderRadius: 6,
  },

  textPicker: {
    fontSize: 12,
  },

  listItem: {
    backgroundColor: COLORS.light,
    borderBottomWidth: 0,
    padding: 12,
    marginVertical: 6,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: "100%",
  },

  listaItem: {
    backgroundColor: COLORS.light,
    borderBottomWidth: 0,
    padding: 12,
    marginVertical: 6,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: "100%",
  },

  TabInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },

  buttonTab: {
    paddingHorizontal: 25,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ccc",
  },

  buttonTab1: {
    paddingLeft: 25,
    paddingRight: 25,
  },

  buttonTextTab: {
    color: "blue",
    fontWeight: "700",
    fontSize: 15,
  },

  buttonTextTab2: {
    color: "black",
    fontWeight: "700",
    fontSize: 15,
  },

  text: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginVertical: 8,
    textAlign: "left",
  },

  flatlist: {
    flex: 1,
    width: "90%",
    height: "100%",
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    alignSelf: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  modalContainer: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  modalTitulo: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 0.5,
  },

  modalText: {
    fontSize: 16,
    color: "#333333",
    lineHeight: 22,
    textAlign: "left",
    letterSpacing: 0.3,
    marginVertical: 8,
  },

  Icone: {
    fontSize: 28,
    marginRight: 10,
    marginTop: 140,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 50, // bordas arredondadas
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
    content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerSection: {
    marginBottom: 25,
    alignItems: 'center',
  },
  titulo: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 14,
    color: '#f0f0f0',
    fontWeight: '500',
  },
  activeTab: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    backgroundColor: '#005362',
    borderRadius: 25,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#005362',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  inactiveTab: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTabText: {
    color: '#999',
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -15,
    marginBottom: 10,
    marginLeft: 4,
  },
  dateButton: {
    justifyContent: 'center',
    height: 56,
    marginBottom: 20,
  },
  dateButtonText: {
    color: '#333',
    fontSize: 16,
  },
  registerButton: {
    backgroundColor: '#005362',
    width: '100%',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#005362',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#005362',
  },
  backButtonText: {
    color: '#005362',
    fontWeight: '700',
    fontSize: 15,
  },
  profissaoLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    marginBottom: 12,
    marginLeft: 4,
  },
  profissaoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 15,
  },
  profissaoButton: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  profissaoButtonAtivo: {
    backgroundColor: '#527954',
    borderColor: '#527954',
  },
  profissaoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  profissaoButtonTextoAtivo: {
    color: '#fff',
  },
    content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerSection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#005362',
    marginBottom: 8,
  },
    titulo2: {
    fontSize: 40,
    fontWeight: '800',
    color: '#005362',
    marginBottom: 8,
    left: 0,
    right: 0,
  },
  subtitulo: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTab: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    backgroundColor: '#005362',
    borderRadius: 25,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#005362',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  inactiveTab: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTabText: {
    color: '#999',
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -15,
    marginBottom: 10,
    marginLeft: 4,
  },
  loginButton: {
    backgroundColor: '#005362',
    width: '180%',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#005362',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  registerText: {
    color: '#333',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  registerLink: {
    color: '#005362',
    fontWeight: '700',
    textDecorationLine: 'underline',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  forgotPasswordText: {
    textAlign: 'center',
    color: '#005362',
    fontSize: 13,
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    width: '80%',
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingBottom: 30,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  editButton: {
    backgroundColor: "#005362",
    padding: 8,
    borderRadius: 8,
  },

  perfilSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },

  avatarContainer: {
    marginBottom:4, marginTop:40
    
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 45,
    backgroundColor: "#005362",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    marginBottom:4, 
    marginTop:5
  },

  nome: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginBottom: 6,
    marginBottom:4,
    marginTop:20,
    justifyContent:"center",
    alignItems:"center",
  },

  email: {
    fontSize: 14,
    color: "#666",
  },

  avaliacaoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: 14,
  },

  avaliacaoContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  avaliacaoTexto: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },

  avaliacaoSubtexto: {
    fontSize: 12,
    color: "#666",
  },

  section: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#f7f7f7",
    borderRadius: 14,
    padding: 14,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },

  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },

  infoText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginTop: 2,
  },

  descricaoBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#005362",
  },

  descricao: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },

  servicosContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  servicoBadge: {
    backgroundColor: "#005362",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  servicoTexto: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  historicoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
  },

  historicoLeft: {
    flexDirection: "row",
    gap: 10,
  },

  historicoImagem: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  historicoImagemPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#EAF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  historicoImagemTexto: {
    fontSize: 8,
    color: "#1e90ff",
    marginTop: 2,
    fontWeight: "600",
  },

  historicoServico: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },

  historicoData: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },

 historicoValor: {
  fontSize: 14,
  fontWeight: "700",
  color: "#005362",
},

  logoutButton: {
    marginHorizontal: 16,
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e90ff",
  },

  deleteButton: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#DC143C",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  historicoContent: { 
    flex: 1, 
  },
  historicoRight: {
     alignItems: "flex-end", 
     gap: 4, 
    },
   historicoStatus: {
  fontSize: 11,
  fontWeight: "600",
  color: "#28a745",
  backgroundColor: "#d4edda",
  paddingVertical: 4,
  paddingHorizontal: 8,
  borderRadius: 6,
  overflow: "hidden",
},
  statusConcluido: {
     color: "#4CAF50",
     },
     spacer: {
       height: 24,
       },
       nenhumTexto: {
         fontSize: 14,
         color: "#999",
         textAlign: "center",
         marginVertical: 10,
     },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
 contatoSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  contatoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
    contatoContent: {
    flex: 1,
  },
    contatoLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },
    contatoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginTop: 2,
  },
  historicoSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  historicoCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#d4edda",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#28a745",
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
    buttonSecundario: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  buttonSecundarioText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#005362",
  },
    buttonSair: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
    buttonSairText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e90ff",
  },
    buttonDelete: {
    backgroundColor: "#DC143C",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
    buttonDeleteText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
    container: {
      flex: 1,
      backgroundColor: "#fff",
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#f0f0f0",
    },
    titulo: {
      fontSize: 24,
      fontWeight: "700",
      color: "#005362",
    },
    infoSection: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#f0f8fa",
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
      gap: 10,
    },
    infoText: {
      fontSize: 14,
      color: "#005362",
      fontWeight: "500",
      flex: 1,
    },
    prestadoresList: {
      paddingBottom: 20,
    },
    prestadorCard: {
      flexDirection: "row",
      backgroundColor: "#f9f9f9",
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      elevation: 2,
      borderLeftWidth: 4,
      borderLeftColor: "#527954",
      alignItems: "flex-start",
    },
    avatarContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "#527954",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    avatarText: {
      color: "#fff",
      fontSize: 24,
      fontWeight: "700",
    },
    infoContainer: {
      flex: 1,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    nomePrestador: {
      fontSize: 16,
      fontWeight: "600",
      color: "#333",
      marginBottom: 6,
    },
    profissaoBadge: {
      backgroundColor: "#527954",
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 6,
      alignSelf: "flex-start",
    },
    profissaoTexto: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
    },
    detalhesRow: {
      flexDirection: "row",
      gap: 12,
      marginVertical: 8,
    },
    detalheItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    detalheTexto: {
      fontSize: 13,
      color: "#666",
      fontWeight: "500",
    },
    emailTexto: {
      fontSize: 12,
      color: "#999",
      marginTop: 6,
    },
    botaoChamar: {
      backgroundColor: "#527954",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      elevation: 3,
      marginLeft: 8,
    },
    botaoTxt: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 12,
    },
    carregandoContainer: {
      justifyContent: "center",
      alignItems: "center",
      marginVertical: 60,
    },
    carregandoTexto: {
      fontSize: 14,
      color: "#666",
      marginTop: 12,
    },
    nenhumContainer: {
      justifyContent: "center",
      alignItems: "center",
      marginVertical: 60,
    },
    nenhumResultado: {
      fontSize: 16,
      color: "#999",
      textAlign: "center",
    },
      container: {
        padding: 16,
        backgroundColor: "#fff",
        flex: 1,
      },
    
      header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      },
    
      backButton: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: "#f1f1f1",
      },
    
      titulo: {
        fontSize: 24,
        fontWeight: "700",
        color: "#000",
      },
    
      searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#eee",
        padding: 12,
        borderRadius: 16,
        marginBottom: 16,
      },
    
      searchInput: {
        marginLeft: 10,
        flex: 1,
        fontSize: 14,
        color: "#000",
      },
    
      resultadoText: {
        fontSize: 14,
        color: "#666",
        marginBottom: 16,
        fontWeight: "500",
      },
    
      profissionalCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#f7f7f7",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
      },
    
      profissionalInfo: {
        flex: 1,
      },
    
      nomeProfissional: {
        fontSize: 16,
        fontWeight: "700",
        color: "#000",
        marginBottom: 8,
      },
    
      infoLinha: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
        gap: 8,
      },
    
      infoTexto: {
        fontSize: 14,
        color: "#666",
      },
    
      botaoChamar: {
        backgroundColor: "#000",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      },
    
      botaoTexto: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 12,
      },
    
      nenhumResultado: {
        fontSize: 16,
        color: "#999",
        textAlign: "center",
        marginVertical: 40,
      },
    
      carregandoContainer: {
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 40,
      },
    
      carregandoTexto: {
        fontSize: 14,
        color: "#666",
        marginTop: 12,
      },
        container: {
          flex: 1,
          backgroundColor: "#f5f5f5",
        },
        header: {
          backgroundColor: "#1e90ff",
          paddingHorizontal: 16,
          paddingVertical: 16,
          paddingTop: 24,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        content: {
          padding: 16,
        },
        sectionTitle: {
          fontSize: 16,
          fontWeight: "700",
          color: "#000",
          marginBottom: 16,
        },
        card: {
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          elevation: 2,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          borderLeftWidth: 4,
          borderLeftColor: "#1e90ff",
        },
        cardHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        },
        cardTitle: {
          fontSize: 16,
          fontWeight: "700",
          color: "#000",
          flex: 1,
        },
        statusBadge: {
          backgroundColor: "#4CAF50",
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 4,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        },
        statusText: {
          color: "#fff",
          fontSize: 11,
          fontWeight: "600",
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
          gap: 8,
        },
        infoText: {
          color: "#555",
          fontSize: 14,
        },
        buttonsRow: {
          flexDirection: "row",
          gap: 8,
          marginTop: 12,
        },
        contatoButton: {
          flex: 1,
          backgroundColor: "#1e90ff",
          padding: 10,
          borderRadius: 10,
          alignItems: "center",
        },
        cancelButton: {
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: "#ff5252",
          padding: 10,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          width: 45,
        },
        buttonText: {
          color: "#fff",
          fontWeight: "600",
          fontSize: 13,
        },
        emptyContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
          paddingVertical: 60,
        },
        emptyTitle: {
          fontSize: 18,
          fontWeight: "700",
          color: "#000",
          marginTop: 16,
          textAlign: "center",
        },
        emptyText: {
          fontSize: 14,
          color: "#999",
          marginTop: 8,
          textAlign: "center",
        },
});
