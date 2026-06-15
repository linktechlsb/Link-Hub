import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import { registrarPageview } from "@/lib/analytics";

/**
 * Registra um pageview a cada mudança de rota. Deve ser montado uma única vez,
 * dentro do AppLayout (que envolve as rotas autenticadas).
 */
export function usePageTracking() {
  const location = useLocation();
  const ultimoCaminho = useRef<string | null>(null);

  useEffect(() => {
    const caminho = location.pathname;
    if (ultimoCaminho.current === caminho) return;
    ultimoCaminho.current = caminho;
    void registrarPageview(caminho);
  }, [location.pathname]);
}
