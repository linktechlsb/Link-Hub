import { useEffect, useRef } from "react";

import { useLancarTour } from "@/hooks/use-onboarding-tour";
import { carregarUsuarioMe } from "@/lib/conta";

/** Dispara o tour de onboarding uma única vez, no primeiro login do usuário. */
export function OnboardingTourLauncher() {
  const lancarTour = useLancarTour(400);
  const jaVerificou = useRef(false);

  useEffect(() => {
    if (jaVerificou.current) return;
    jaVerificou.current = true;

    carregarUsuarioMe()
      .then((me) => {
        if (!me || me.onboarding_concluido_em) return;
        lancarTour();
      })
      .catch(() => {
        // Na dúvida (erro ao ler o estado), não mostra o tour — spec.
      });
  }, [lancarTour]);

  return null;
}
