import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { splitLigaTitle } from "./splitLigaTitle";

import type { Liga } from "@link-leagues/types";

interface EditorialHeroProps {
  ligas: Liga[];
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function EditorialHero({ ligas }: EditorialHeroProps) {
  const navigate = useNavigate();
  const reduced = prefersReducedMotion();
  const autoplay = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" },
    reduced || ligas.length <= 1 ? [] : [autoplay.current],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const update = () => setIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", update);
    update();
    return () => {
      emblaApi.off("select", update);
    };
  }, [emblaApi]);

  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (ligas.length === 0) return null;

  const total = String(ligas.length).padStart(2, "0");
  const current = String(index + 1).padStart(2, "0");

  return (
    <section aria-label="Ligas em destaque" className="font-plex-sans">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {ligas.map((liga) => {
            const segs = splitLigaTitle(liga.nome);
            return (
              <div key={liga.id} className="min-w-0 flex-[0_0_100%]">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/ligas/${liga.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/ligas/${liga.id}`);
                    }
                  }}
                  aria-label={`Abrir liga ${liga.nome}`}
                  className="block w-full text-left bg-[#f5f5f3] p-7 rounded-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-plex-mono text-[11px] tracking-[0.14em] text-navy">
                      {current} <span className="text-navy/40">/ {total}</span>
                    </span>
                    {ligas.length > 1 && (
                      <span className="flex gap-1.5">
                        <button
                          type="button"
                          aria-label="Liga anterior"
                          onClick={(e) => {
                            e.stopPropagation();
                            prev();
                          }}
                          className="w-7 h-7 border border-navy flex items-center justify-center text-navy hover:bg-navy hover:text-white transition-colors"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Próxima liga"
                          onClick={(e) => {
                            e.stopPropagation();
                            next();
                          }}
                          className="w-7 h-7 border border-navy flex items-center justify-center text-navy hover:bg-navy hover:text-white transition-colors"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    )}
                  </div>

                  <h2 className="text-navy font-plex-sans font-bold text-[32px] md:text-[42px] leading-[0.95] tracking-[-0.035em]">
                    {segs.map((s, i) => (
                      <span
                        key={`${liga.id}-${i}`}
                        className={[
                          i > 0 ? "ml-[0.2em]" : "",
                          s.em ? "italic font-medium" : "",
                          s.lowercase ? "lowercase font-medium" : "",
                        ]
                          .join(" ")
                          .trim()}
                      >
                        {s.text}
                      </span>
                    ))}
                  </h2>

                  <div className="mt-4 font-plex-mono text-[10px] uppercase tracking-[0.1em] text-navy/70 flex gap-3 flex-wrap">
                    <span>
                      Dir.{" "}
                      {liga.diretores && liga.diretores.length > 0
                        ? liga.diretores.map((d) => d.nome).join(", ")
                        : "—"}
                    </span>
                  </div>

                  <div className="mt-5 pt-4 border-t border-navy grid grid-cols-3 gap-0">
                    <Stat label="Score" value="78" />
                    <Stat label="Projetos" value={String(liga.projetos_ativos ?? 0)} />
                    <Stat label="Membros" value="—" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="pr-4 border-r border-navy/15 last:border-r-0">
      <div className="font-plex-sans font-bold text-[22px] md:text-[28px] text-navy tracking-[-0.02em]">
        {value}
      </div>
      <div className="font-plex-mono text-[9px] uppercase tracking-[0.14em] text-navy/60 mt-0.5">
        {label}
      </div>
    </div>
  );
}
