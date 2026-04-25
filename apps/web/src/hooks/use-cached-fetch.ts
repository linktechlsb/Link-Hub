import { useCallback, useEffect, useState } from "react";

import { cache } from "@/lib/cache";
import { supabase } from "@/lib/supabase";

export function useCachedFetch<T>(url: string | null) {
  const cached = url ? cache.get<T>(url) : null;
  const [data, setData] = useState<T | null>(cached);
  const [carregando, setCarregando] = useState(cached === null && url !== null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!url) return;

    const hit = cache.get<T>(url);
    if (hit) {
      setData(hit);
      setCarregando(false);
      return;
    }

    let cancelado = false;
    setCarregando(true);

    async function buscar() {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token) {
        if (!cancelado) setCarregando(false);
        return;
      }
      try {
        const res = await fetch(url!, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelado) {
          const json = (await res.json()) as T;
          cache.set(url!, json);
          setData(json);
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    void buscar();
    return () => {
      cancelado = true;
    };
  }, [url, versao]);

  const refetch = useCallback(() => {
    if (url) cache.invalidar(url);
    setVersao((v) => v + 1);
  }, [url]);

  return { data, carregando, refetch };
}
