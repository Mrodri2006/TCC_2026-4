import { StyleSheet } from "react-native";

export const COLORS = {
  primary: "#005362",
  primaryDark: "#0F2937",
  primarySoft: "#E7F3F5",
  accent: "#527954",
  accentSoft: "#EAF3EA",
  warning: "#F59E0B",
  danger: "#DC2626",
  success: "#16A34A",
  white: "#FFFFFF",
  background: "#F4F7F8",
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAFC",
  border: "#DCE7EA",
  text: "#102A32",
  textMuted: "#64748B",
};

const shadowSoft = {
  shadowColor: COLORS.primaryDark,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
};

const pillButton = {
  minHeight: 48,
  borderRadius: 16,
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "row",
};

export default StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: COLORS.background,
  },

  containerHome: {
    flex: 1,
    width: "100%",
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 20,
    paddingBottom: 28,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 18,
    backgroundColor: "transparent",
  },

  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },

  headerSection: {
    marginBottom: 28,
    alignItems: "center",
  },

  titulo: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },

  titulo2: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: "center",
  },

  subtitulo: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadowSoft,
  },

  inputView: {
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  input: {
    minHeight: 52,
    marginBottom: 14,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  inputPicker: {
    minHeight: 52,
    marginBottom: 14,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  textPicker: {
    fontSize: 13,
    color: COLORS.text,
  },

  buttonView: {
    width: "100%",
    paddingHorizontal: 20,
    gap: 10,
  },

  button: {
    ...pillButton,
    width: "100%",
    paddingHorizontal: 18,
    backgroundColor: COLORS.primary,
    ...shadowSoft,
  },

  buttonText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 14,
  },

  buttonSec: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primary,
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
  },

  buttonSecText: {
    color: COLORS.primary,
  },

  listItem: {
    width: "100%",
    backgroundColor: COLORS.surface,
    padding: 14,
    marginVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadowSoft,
  },

  listaItem: {
    width: "100%",
    backgroundColor: COLORS.surface,
    padding: 14,
    marginVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadowSoft,
  },

  TabInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 8,
  },

  buttonTab: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  buttonTab1: {
    paddingHorizontal: 24,
  },

  buttonTextTab: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 14,
  },

  buttonTextTab2: {
    color: COLORS.textMuted,
    fontWeight: "800",
    fontSize: 14,
  },

  activeTab: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    ...shadowSoft,
  },

  activeTabText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 14,
  },

  inactiveTab: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  inactiveTabText: {
    color: COLORS.textMuted,
    fontWeight: "700",
    fontSize: 14,
  },

  text: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginVertical: 8,
    textAlign: "left",
  },

  flatlist: {
    flex: 1,
    width: "92%",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 18,
    paddingTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: "center",
    ...shadowSoft,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadowSoft,
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 0,
  },

  resultadoText: {
    marginHorizontal: 20,
    marginBottom: 14,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textMuted,
  },

  carregandoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 36,
  },

  carregandoTexto: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },

  profissionalCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadowSoft,
  },

  profissionalInfo: {
    flex: 1,
    paddingRight: 12,
  },

  nomeProfissional: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 6,
  },

  infoLinha: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  infoTexto: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
  },

  botaoChamar: {
    ...pillButton,
    paddingHorizontal: 16,
    backgroundColor: COLORS.accent,
  },

  botaoTexto: {
    marginLeft: 8,
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "800",
  },

  nenhumResultado: {
    marginHorizontal: 24,
    marginVertical: 32,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
    color: COLORS.textMuted,
    textAlign: "center",
  },

  emptyContainer: {
    margin: 20,
    padding: 26,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadowSoft,
  },

  emptyTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: COLORS.textMuted,
    textAlign: "center",
  },

  sectionTitle: {
    marginBottom: 14,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },

  card: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadowSoft,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },

  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: COLORS.textMuted,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: COLORS.success,
    gap: 6,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.white,
    textTransform: "capitalize",
  },

  buttonsRow: {
    marginTop: 16,
  },

  contatoButton: {
    ...pillButton,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 41, 55, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  modalContainer: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    ...shadowSoft,
  },

  modalTitulo: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 12,
    textAlign: "center",
  },

  modalText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    textAlign: "left",
    marginVertical: 8,
  },

  Icone: {
    fontSize: 28,
    marginRight: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    ...shadowSoft,
  },
});
