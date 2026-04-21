import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { Liga } from "@link-leagues/types";

interface LigasCarouselProps {
  ligas: Liga[];
}

export function LigasCarousel({ ligas }: LigasCarouselProps) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (ligas.length === 0) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % ligas.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [ligas.length]);

  function irPara(index: number) {
    clearInterval(timerRef.current);
    setCurrentIndex((index + ligas.length) % ligas.length);
    timerRef.current = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % ligas.length);
    }, 4000);
  }

  if (ligas.length === 0) return null;

  const liga = ligas[currentIndex];
  if (!liga) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-sm">
      {/* Slide */}
      <div
        className="relative h-52 cursor-pointer"
        style={{ background: "linear-gradient(135deg, #10284E 0%, #546484 100%)" }}
        onClick={() => navigate(`/ligas/${liga.id}`)}
      >
        {liga.imagem_url && (
          <img
            src={liga.imagem_url}
            alt={liga.nome}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/40 to-transparent" />

        {/* Seta esquerda */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            irPara(currentIndex - 1);
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 rounded-full p-1.5 text-white transition-colors backdrop-blur-sm"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Seta direita */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            irPara(currentIndex + 1);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 rounded-full p-1.5 text-white transition-colors backdrop-blur-sm"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Conteúdo */}
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
          <div>
            <h2 className="font-display font-bold text-white text-lg leading-tight">{liga.nome}</h2>
            <p className="text-white/60 text-xs mt-0.5">
              Diretor:{" "}
              {liga.diretores && liga.diretores.length > 0
                ? liga.diretores.map((d) => d.nome).join(", ")
                : "—"}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-center">
              <div className="text-brand-yellow font-bold text-sm">78</div>
              <div className="text-white/70 text-xs">Score</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-center">
              <div className="text-brand-yellow font-bold text-sm">{liga.projetos_ativos ?? 0}</div>
              <div className="text-white/70 text-xs">Projetos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 py-3 bg-white border-t border-border">
        {ligas.map((_, i) => (
          <button
            key={i}
            onClick={() => irPara(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentIndex ? "w-4 bg-navy" : "w-1.5 bg-slate-200 hover:bg-slate-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
