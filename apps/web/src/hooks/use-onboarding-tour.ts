import { useCallback, useEffect, useRef } from "react";

import { useSidebar } from "@/components/ui/sidebar";
import { concluirOnboarding } from "@/lib/conta";
import { iniciarTourPlataforma } from "@/lib/onboarding-tour";

/**
 * Coreografia de lançamento do tour: garante a sidebar visível (abre o menu
 * off-canvas no mobile, expande a sidebar recolhida no desktop), aguarda a
 * montagem dos elementos e inicia o tour. Ao finalizar, persiste a conclusão
 * e fecha o menu mobile. Timers são cancelados no unmount.
 */
export function useLancarTour(atrasoMs: number) {
  const { setOpen, setOpenMobile } = useSidebar();
  const ativo = useRef(true);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    ativo.current = true;
    return () => {
      ativo.current = false;
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  return useCallback(() => {
    if (!ativo.current) return;
    // Avaliado no momento do lançamento — useIsMobile ainda pode não ter resolvido
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (mobile) setOpenMobile(true);
    else setOpen(true);
    timer.current = window.setTimeout(() => {
      if (!ativo.current) return;
      iniciarTourPlataforma(() => {
        void concluirOnboarding();
        if (mobile) setOpenMobile(false);
      });
    }, atrasoMs);
  }, [atrasoMs, setOpen, setOpenMobile]);
}
