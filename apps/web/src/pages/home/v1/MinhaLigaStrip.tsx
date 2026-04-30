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
      className="w-full flex items-center justify-between border-t border-navy/80 px-0 py-5 text-left focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
    >
      <div>
        <div className="font-plex-mono text-[10px] uppercase tracking-[0.2em] text-navy/70">
          Minha liga
        </div>
        <div className="font-plex-sans text-[14px] font-semibold text-navy mt-1">{liga.nome}</div>
      </div>
      <div className="font-plex-mono text-[10px] uppercase tracking-[0.2em] text-navy border-b border-navy pb-0.5">
        Acessar →
      </div>
    </button>
  );
}
