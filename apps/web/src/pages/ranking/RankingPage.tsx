import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/pages/home/v1/primitives";

import type { RankingLiga } from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarPontos(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function corBadge(pos: number | undefined): string {
  if (pos === 1) return "bg-brand-yellow text-navy";
  if (pos === 2) return "bg-navy/20 text-navy";
  if (pos === 3) return "bg-navy/10 text-navy";
  return "bg-navy/[0.05] text-navy/50";
}

export function RankingPage() {
  const [ranking, setRanking] = useState<RankingLiga[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const token = await getToken();
        const res = await fetch("/api/ranking", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as Array<
            Omit<RankingLiga, "receita_total" | "pontuacao"> & {
              receita_total: string | number;
              pontuacao: string | number;
            }
          >;
          setRanking(
            data.map((r) => ({
              ...r,
              receita_total:
                typeof r.receita_total === "string" ? parseFloat(r.receita_total) : r.receita_total,
              pontuacao: typeof r.pontuacao === "string" ? parseFloat(r.pontuacao) : r.pontuacao,
            })),
          );
        }
      } finally {
        setCarregando(false);
      }
    }
    void carregar();
  }, []);

  if (carregando) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10">
        <p className="font-plex-sans text-[13px] text-navy/50">Carregando ranking…</p>
      </div>
    );
  }

  const topo = ranking.slice(0, 3);
  const pontuacaoMaxima = ranking[0]?.pontuacao ?? 1;

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Cabeçalho */}
      <div className="mb-10">
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">Ranking</h1>
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
          Pontuação automática · projetos, presença, receita e engajamento
        </p>
      </div>

      <div className="space-y-12">
        {/* Pódio */}
        {topo.length > 0 && (
          <div>
            <SectionHeader numero="01" eyebrow="Destaque" titulo="Pódio" />
            <div className="grid grid-cols-3 border border-navy/15">
              {topo.map((r, i) => (
                <div
                  key={r.liga_id}
                  className={cn(
                    "px-6 py-8 text-center",
                    i < topo.length - 1 && "border-r border-navy/15",
                  )}
                >
                  <div
                    className={cn(
                      "inline-flex items-center justify-center h-8 w-8 font-plex-mono text-[13px] font-bold mb-4",
                      corBadge(r.posicao),
                    )}
                  >
                    {r.posicao}
                  </div>
                  <div className="h-10 w-10 mx-auto bg-navy flex items-center justify-center mb-3">
                    <span className="font-plex-mono text-[11px] text-white">
                      {iniciais(r.nome)}
                    </span>
                  </div>
                  <p className="font-plex-sans font-semibold text-[14px] text-navy truncate">
                    {r.nome}
                  </p>
                  <p className="font-plex-sans font-bold text-[28px] text-navy tracking-[-0.02em] mt-2 leading-none">
                    {formatarPontos(r.pontuacao)}
                  </p>
                  <p className="font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/50 mt-1">
                    pontos
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ranking completo */}
        <div>
          <SectionHeader numero="02" eyebrow="Classificação" titulo="Ranking Completo" />
          {ranking.length === 0 ? (
            <p className="font-plex-sans text-[13px] text-navy/50">
              Ainda não há ligas no ranking.
            </p>
          ) : (
            <div className="border-t border-navy">
              {ranking.map((r) => {
                const pct = pontuacaoMaxima > 0 ? (r.pontuacao / pontuacaoMaxima) * 100 : 0;
                return (
                  <div
                    key={r.liga_id}
                    className="border-b border-navy/10 py-5 grid grid-cols-[2.5rem_1fr_auto] items-center gap-4"
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center h-8 w-8 font-plex-mono text-[11px] font-bold flex-shrink-0",
                        corBadge(r.posicao),
                      )}
                    >
                      {String(r.posicao).padStart(2, "0")}
                    </div>
                    <div>
                      <p className="font-plex-sans font-semibold text-[14px] text-navy">{r.nome}</p>
                      <div className="h-px bg-navy/10 mt-2 relative">
                        <div
                          className="absolute left-0 top-0 h-px bg-navy"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="font-plex-mono text-[10px] text-navy/50 mt-1.5">
                        {r.projetos_concluidos + r.projetos_em_andamento} proj · {r.presencas} pres
                        · {formatarMoeda(r.receita_total)} · {r.posts} posts
                      </p>
                    </div>
                    <span className="font-plex-sans font-bold text-[20px] text-navy tracking-[-0.02em]">
                      {formatarPontos(r.pontuacao)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
