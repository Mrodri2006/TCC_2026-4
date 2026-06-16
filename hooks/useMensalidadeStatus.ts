import { useCallback, useEffect, useRef, useState } from "react";
import { auth, firestore } from "../firebase";
import { MensalidadeStatus } from "../services/billingService";

export function useMensalidadeStatus(autoRefreshMs: number = 0) {
  const [status, setStatus] = useState<MensalidadeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const statusRef = useRef<MensalidadeStatus | null>(null);

  const refresh = useCallback(async () => {
    if (!statusRef.current) {
      setLoading(true);
    }
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        statusRef.current = null;
        setStatus(null);
        setError("Usuário não autenticado.");
        return;
      }

      const snap = await firestore.collection("Usuario").doc(uid).get();
      const user = snap.data() || {};
      const statusPagamento = user.statusPagamento || null;
      const pagamentoEmDia = ["em_dia", "pago", "confirmado"].includes(statusPagamento);
      const pagamentoBloqueado = ["inadimplente", "bloqueado"].includes(statusPagamento);
      const nextStatus: MensalidadeStatus = {
        assinaturaAtiva: pagamentoEmDia ? true : !pagamentoBloqueado && user.assinaturaAtiva !== false,
        contaAtiva: pagamentoEmDia ? true : !pagamentoBloqueado && user.contaAtiva !== false,
        statusPagamento,
        valorMensalidade: user.valorMensalidade || null,
        dataCadastro: user.dataCadastro || user.criadoEm || null,
        dataVencimento: user.dataVencimento || null,
        ultimoPagamento: user.ultimoPagamento || null,
        invoice: null,
      };
      statusRef.current = nextStatus;
      setStatus(nextStatus);
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
