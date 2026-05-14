import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

import type { Liga, RankingLiga } from "@link-leagues/types";

interface LigasCarouselProps {
  ligas: Liga[];
  ranking?: RankingLiga[];
  loading?: boolean;
}

export function LigasCarousel({ ligas, ranking = [], loading = false }: LigasCarouselProps) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const autoplay = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border shadow-sm overflow-hidden bg-background">
        {/* Header — espelha px-4 pt-4 pb-3 com título e botões nav */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border">
          <Skeleton className="h-4 w-10" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-9" />
            <div className="flex gap-1">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Área da imagem — h-36 igual ao CarouselItem */}
        <Skeleton className="h-36 w-full rounded-none" />

        {/* Corpo — px-4 py-3 com nome, diretor e badges */}
        <div className="px-4 py-3">
          <Skeleton className="h-4 w-44 mb-1.5" />
          <Skeleton className="h-3 w-36 mt-0.5 mb-3" />
          <div className="flex gap-2 mt-3">
            {/* Badge pts — bg-navy/5 border rounded-lg px-2.5 py-1.5 */}
            <Skeleton className="h-7 w-14 rounded-lg" />
            {/* Badge projetos — bg-brand-yellow/10 border rounded-lg px-2.5 py-1.5 */}
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
        </div>

        {/* Dots — espelha o indicador ativo (w-4) + 2 inativos (w-1.5) */}
        <div className="flex justify-center gap-1.5 py-3 border-t border-border">
          <Skeleton className="h-1.5 w-4 rounded-full" />
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
        </div>
      </div>
    );
  }

  if (ligas.length === 0) return null;

  return (
    <div className="rounded-xl border border-border shadow-sm overflow-hidden bg-background">
      {/* Header — padrão dos cards da home */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border">
        <p className="font-semibold text-sm text-navy">Ligas</p>
        {ligas.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              {String(current + 1).padStart(2, "0")} / {String(ligas.length).padStart(2, "0")}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => api?.scrollPrev()}
                className="h-7 w-7 rounded-lg border border-[#191919] bg-background flex items-center justify-center text-navy hover:bg-navy/5 transition-colors"
                aria-label="Liga anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => api?.scrollNext()}
                className="h-7 w-7 rounded-lg border border-[#191919] bg-background flex items-center justify-center text-navy hover:bg-navy/5 transition-colors"
                aria-label="Próxima liga"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Carousel
        opts={{ loop: true, align: "start" }}
        plugins={ligas.length > 1 ? [autoplay.current] : []}
        setApi={setApi}
      >
        <CarouselContent className="-ml-0">
          {ligas.map((liga) => {
            const score = ranking.find((r) => r.liga_id === liga.id)?.pontuacao ?? 0;
            return (
              <CarouselItem key={liga.id} className="pl-0">
                {/* Imagem limpa — sem texto sobreposto */}
                <div
                  className="relative h-36 cursor-pointer bg-gradient-to-br from-navy to-link-blue"
                  onClick={() => navigate(`/ligas/${liga.id}`)}
                >
                  {liga.imagem_url && (
                    <img
                      src={liga.imagem_url}
                      alt={liga.nome}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Corpo — tipografia e badges do design system */}
                <div className="px-4 py-3">
                  <p className="font-semibold text-sm text-navy truncate">{liga.nome}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    Diretor:{" "}
                    {liga.diretores && liga.diretores.length > 0
                      ? liga.diretores.map((d) => d.nome).join(", ")
                      : "—"}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <div className="flex items-center gap-1.5 bg-navy/5 border border-navy/10 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs font-bold text-navy">{score}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        pts
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-brand-yellow/10 border border-brand-yellow/30 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs font-bold text-navy">
                        {liga.projetos_ativos ?? 0}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        projetos
                      </span>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {/* Dots indicadores */}
      {ligas.length > 1 && (
        <div className="flex justify-center gap-1.5 py-3 border-t border-border">
          {ligas.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "w-4 bg-navy dark:bg-white" : "w-1.5 bg-foreground/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
