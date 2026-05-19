import { useCallback, useEffect, useState } from "react";
import { getMensalidadeStatus, MensalidadeStatus } from "../services/billingService";

export function useMensalidadeStatus(autoRefreshMs: number = 0) {
  const [status, setStatus] = useState<MensalidadeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getMensalidadeStatus();
      setStatus(s);
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

