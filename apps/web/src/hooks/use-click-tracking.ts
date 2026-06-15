import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import { normalizarRota, registrarEventos, rotaIgnorada } from "@/lib/analytics";

import type { RegistrarEventoInput } from "@link-leagues/types";

const INTERVALO_FLUSH_MS = 10_000; // envia o buffer a cada 10s
const MAX_BUFFER = 50; // envia imediatamente ao atingir o limite

/**
 * Captura cliques globais (coordenadas relativas ao viewport) para o mapa de
 * calor. Os eventos são acumulados num buffer e enviados em lote. Deve ser
 * montado uma única vez dentro do AppLayout.
 */
export function useClickTracking() {
  const location = useLocation();
  const caminhoRef = useRef(location.pathname);
  const rotaRef = useRef(normalizarRota(location.pathname));
  const bufferRef = useRef<RegistrarEventoInput[]>([]);

  useEffect(() => {
    caminhoRef.current = location.pathname;
    rotaRef.current = normalizarRota(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const flush = () => {
      if (bufferRef.current.length === 0) return;
      const lote = bufferRef.current;
      bufferRef.current = [];
      void registrarEventos(lote);
    };

    const onClick = (e: MouseEvent) => {
      if (rotaIgnorada(caminhoRef.current)) return;
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      bufferRef.current.push({
        tipo: "click",
        caminho: caminhoRef.current,
        rota: rotaRef.current,
        pos_x: e.clientX / vw,
        pos_y: e.clientY / vh,
        viewport_w: vw,
        viewport_h: vh,
      });
      if (bufferRef.current.length >= MAX_BUFFER) flush();
    };

    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("click", onClick, true);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    const intervalo = window.setInterval(flush, INTERVALO_FLUSH_MS);

    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
      window.clearInterval(intervalo);
      flush();
    };
  }, []);
}
