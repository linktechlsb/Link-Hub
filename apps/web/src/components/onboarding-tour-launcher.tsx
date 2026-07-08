import { useEffect, useRef } from "react";

import { useSidebar } from "@/components/ui/sidebar";
import { carregarUsuarioMe, concluirOnboarding } from "@/lib/conta";
import { iniciarTourPlataforma } from "@/lib/onboarding-tour";

/** Dispara o tour de onboarding uma única vez, no primeiro login do usuário. */
export function OnboardingTourLauncher() {
  const { isMobile, setOpenMobile } = useSidebar();
  const jaVerificou = useRef(false);

  useEffect(() => {
    if (jaVerificou.current) return;
    jaVerificou.current = true;

    carregarUsuarioMe()
      .then((me) => {
        if (!me || me.onboarding_concluido_em) return;
        if (isMobile) setOpenMobile(true);
        // Aguarda a sidebar (e o menu mobile) montar antes de medir os elementos
        window.setTimeout(() => {
          iniciarTourPlataforma(() => {
            void concluirOnboarding();
            if (isMobile) setOpenMobile(false);
          });
        }, 400);
      })
      .catch(() => {
        // Na dúvida (erro ao ler o estado), não mostra o tour — spec.
      });
  }, [isMobile, setOpenMobile]);

  return null;
}
