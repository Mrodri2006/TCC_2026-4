type FirebaseLikeError = {
  code?: string;
};

const messages: Record<string, string> = {
  "auth/email-already-in-use": "Este e-mail já está vinculado a uma conta.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/invalid-email": "Informe um e-mail válido.",
  "auth/network-request-failed": "Sem conexão com a internet. Verifique a rede e tente novamente.",
  "auth/too-many-requests": "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.",
  "auth/user-disabled": "Esta conta está desativada. Entre em contato com o suporte.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/weak-password": "Use uma senha com pelo menos 6 caracteres.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "permission-denied": "Você não tem permissão para concluir esta ação.",
  unavailable: "O serviço está temporariamente indisponível. Tente novamente.",
};

export function getFirebaseErrorMessage(error: unknown, fallback: string) {
  const code = typeof error === "object" && error !== null
    ? String((error as FirebaseLikeError).code || "").replace(/^firestore\//, "")
    : "";

  return messages[code] || fallback;
}
