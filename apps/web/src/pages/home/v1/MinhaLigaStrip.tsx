import { useNavigate } from "react-router-dom";

import type { Liga } from "@link-leagues/types";

interface MinhaLigaStripProps {
  liga: Liga;
}

export function MinhaLigaStrip({ liga }: MinhaLigaStripProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/ligas/${liga.id}`)}
      aria-label={`Acessar liga ${liga.nome}`}
      className="w-full flex items-center justify-between border border-[#191919] rounded-lg px-5 py-4 text-left hover:bg-foreground/5 transition-colors focus:outline-none focus:ring-1 focus:ring-foreground/20"
    >
      <div>
        <div className="font-plex-mono text-[10px] uppercase tracking-[0.2em] text-foreground/50">
          Minha liga
        </div>
        <div className="font-plex-sans text-[14px] font-semibold text-foreground mt-1">
          {liga.nome}
        </div>
      </div>
      <div className="font-plex-mono text-[10px] uppercase tracking-[0.2em] text-foreground/50 border-b border-foreground/20 pb-0.5">
        Acessar →
      </div>
    </button>
  );
}
