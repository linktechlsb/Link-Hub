import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
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
      <div className="rounded-xl border border-border dark:border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.35)] overflow-hidden dark:bg-white/[0.02]">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border dark:border-white/[0.05]">
          <Skeleton className="h-4 w-10" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-9" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        </div>
        <Skeleton className="h-44 w-full rounded-none" />
        <div className="flex justify-center gap-1.5 py-3 border-t border-border dark:border-white/[0.05]">
          <Skeleton className="h-1.5 w-4 rounded-full" />
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
        </div>
      </div>
    );
  }

  if (ligas.length === 0) return null;

  return (
    <div className="rounded-xl border border-border dark:border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)] overflow-hidden dark:bg-white/[0.02]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border dark:border-white/[0.05]">
        <p className="font-semibold text-sm text-navy dark:text-foreground">Ligas</p>
        {ligas.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground/60 tabular-nums">
              {String(current + 1).padStart(2, "0")} / {String(ligas.length).padStart(2, "0")}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => api?.scrollPrev()}
                className="h-8 w-8 rounded-lg border border-border dark:border-white/[0.12] bg-background dark:bg-white/[0.06] flex items-center justify-center text-navy dark:text-white/70 hover:bg-navy/5 dark:hover:bg-white/10 transition-all duration-200 hover:scale-105"
                aria-label="Liga anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => api?.scrollNext()}
                className="h-8 w-8 rounded-lg border border-border dark:border-white/[0.12] bg-background dark:bg-white/[0.06] flex items-center justify-center text-navy dark:text-white/70 hover:bg-navy/5 dark:hover:bg-white/10 transition-all duration-200 hover:scale-105"
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
                {/* Imagem com overlay de texto integrado */}
                <div
                  className="relative h-44 cursor-pointer bg-gradient-to-br from-navy to-link-blue overflow-hidden"
                  onClick={() => navigate(`/ligas/${liga.id}`)}
                >
                  {liga.imagem_url && (
                    <img
                      src={liga.imagem_url}
                      alt={liga.nome}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Badges no canto superior direito */}
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded-md px-2 py-1">
                      <Star className="h-2.5 w-2.5 text-brand-yellow fill-brand-yellow" />
                      <span className="text-[10px] font-bold text-white leading-none">{score}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-brand-yellow/20 backdrop-blur-sm border border-brand-yellow/30 rounded-md px-2 py-1">
                      <span className="text-[10px] font-bold text-brand-yellow leading-none">
                        {liga.projetos_ativos ?? 0} proj.
                      </span>
                    </div>
                  </div>

                  {/* Texto sobreposto na base */}
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6">
                    <p className="font-semibold text-sm text-white truncate leading-tight">
                      {liga.nome}
                    </p>
                    <p className="text-[11px] text-white/60 mt-0.5 truncate">
                      {liga.diretores && liga.diretores.length > 0
                        ? liga.diretores.map((d: { nome: string }) => d.nome).join(", ")
                        : "—"}
                    </p>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {/* Dots indicadores */}
      {ligas.length > 1 && (
        <div className="flex justify-center gap-1.5 py-3 border-t border-border dark:border-white/[0.05]">
          {ligas.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "w-4 bg-brand-yellow" : "w-1.5 bg-foreground/20 dark:bg-white/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
