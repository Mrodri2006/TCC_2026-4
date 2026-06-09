import { useCallback, useEffect, useState } from "react";
import { auth, firestore } from "../firebase";
import { MensalidadeStatus } from "../services/billingService";

export function useMensalidadeStatus(autoRefreshMs: number = 0) {
  const [status, setStatus] = useState<MensalidadeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setStatus(null);
        setError("Usuário não autenticado.");
        return;
      }

      const snap = await firestore.collection("Usuario").doc(uid).get();
      const user = snap.data() || {};
      setStatus({
        assinaturaAtiva: user.assinaturaAtiva !== false,
        contaAtiva: user.contaAtiva !== false,
        statusPagamento: user.statusPagamento || null,
        valorMensalidade: user.valorMensalidade || null,
        dataCadastro: user.dataCadastro || user.criadoEm || null,
        dataVencimento: user.dataVencimento || null,
        ultimoPagamento: user.ultimoPagamento || null,
        invoice: null,
      });
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Erro ao consultar mensalidade.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefreshMs) return;
    const t = setInterval(refresh, autoRefreshMs);
    return () => clearInterval(t);
  }, [autoRefreshMs, refresh]);

  return { status, loading, error, refresh };
}
