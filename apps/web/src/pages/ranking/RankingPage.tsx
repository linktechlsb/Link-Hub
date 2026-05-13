import { HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/pages/home/v1/primitives";

import type { ConfiguracaoPontuacao, RankingLiga } from "@link-leagues/types";

const CRITERIOS: Record<string, { label: string; unidade: string }> = {
  projeto_concluido: { label: "Projeto concluído", unidade: "por projeto" },
  projeto_em_andamento: { label: "Projeto em andamento", unidade: "por projeto" },
  presenca: { label: "Presença registrada", unidade: "por presença" },
  receita_por_real: { label: "Receita", unidade: "por R$ 1 arrecadado" },
  post_mural: { label: "Post no mural", unidade: "por post" },
};

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
  const [configs, setConfigs] = useState<ConfiguracaoPontuacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [resRanking, resConfigs] = await Promise.all([
          fetch("/api/ranking", { headers }),
          fetch("/api/ranking/configuracoes", { headers }),
        ]);

        if (resRanking.ok) {
          const data = (await resRanking.json()) as Array<
            Omit<RankingLiga, "receita_total" | "pontuacao" | "presenca_percentual"> & {
              receita_total: string | number;
              pontuacao: string | number;
              presenca_percentual: string | number;
            }
          >;
          setRanking(
            data.map((r) => ({
              ...r,
              receita_total:
                typeof r.receita_total === "string" ? parseFloat(r.receita_total) : r.receita_total,
              pontuacao: typeof r.pontuacao === "string" ? parseFloat(r.pontuacao) : r.pontuacao,
              presenca_percentual:
                typeof r.presenca_percentual === "string"
                  ? parseFloat(r.presenca_percentual)
                  : r.presenca_percentual,
            })),
          );
        }

        if (resConfigs.ok) {
          setConfigs((await resConfigs.json()) as ConfiguracaoPontuacao[]);
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

  return (
    <TooltipProvider delayDuration={200}>
      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Cabeçalho */}
        <div className="mb-10">
          <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
            Ranking
          </h1>
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
            Ranking de ligas
          </p>
        </div>

        <div className="space-y-12">
          {/* Pódio */}
          {topo.length > 0 && (
            <div>
              <SectionHeader
                numero="01"
                eyebrow="Destaque"
                titulo="Pódio"
                tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue dark:text-white"
              />
              <div className="space-y-3">
                {/* 1º lugar — full width */}
                {topo[0] && (
                  <Card className="shadow-sm border-l-4 border-l-brand-yellow">
                    <CardContent className="py-4 px-5">
                      <div className="flex items-center gap-4">
                        <span className="font-plex-sans font-bold text-[28px] text-brand-yellow leading-none min-w-[2rem]">
                          1
                        </span>
                        <div className="h-10 w-10 bg-navy flex items-center justify-center flex-shrink-0">
                          <span className="font-plex-mono text-[11px] text-white">
                            {iniciais(topo[0].nome)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-plex-sans font-semibold text-[14px] text-navy">
                            {topo[0].nome}
                          </p>
                          <p className="font-plex-mono text-[10px] text-navy/50 mt-0.5">
                            {topo[0].projetos_concluidos + topo[0].projetos_em_andamento} proj ·{" "}
                            {topo[0].presenca_percentual}% pres ·{" "}
                            {formatarMoeda(topo[0].receita_total)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-plex-sans font-bold text-[28px] text-navy leading-none">
                            {formatarPontos(topo[0].pontuacao)}
                          </p>
                          <p className="font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/50 mt-1">
                            pontos
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 2º e 3º — lado a lado */}
                {topo.length > 1 && (
                  <div className="grid grid-cols-2 gap-3">
                    {topo.slice(1).map((r, i) => (
                      <Card
                        key={r.liga_id}
                        className={cn(
                          "shadow-sm border-l-4",
                          i === 0 ? "border-l-link-blue" : "border-l-navy/20",
                        )}
                      >
                        <CardContent className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "font-plex-sans font-bold text-[20px] leading-none min-w-[1.5rem]",
                                i === 0
                                  ? "text-link-blue dark:text-white"
                                  : "text-navy/30 dark:text-white",
                              )}
                            >
                              {r.posicao}
                            </span>
                            <div className="h-8 w-8 bg-navy flex items-center justify-center flex-shrink-0">
                              <span className="font-plex-mono text-[10px] text-white">
                                {iniciais(r.nome)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-plex-sans font-semibold text-[13px] text-navy truncate">
                                {r.nome}
                              </p>
                              <p className="font-plex-mono text-[9px] text-navy/50 mt-0.5">
                                {r.projetos_concluidos + r.projetos_em_andamento} proj ·{" "}
                                {r.presenca_percentual}% pres
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-plex-sans font-bold text-[18px] text-navy leading-none">
                                {formatarPontos(r.pontuacao)}
                              </p>
                              <p className="font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/50 mt-1">
                                pts
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ranking completo */}
          <div>
            <SectionHeader
              numero="02"
              eyebrow="Classificação"
              titulo="Ranking Completo"
              tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue dark:text-white"
            />
            {ranking.length === 0 ? (
              <p className="font-plex-sans text-[13px] text-foreground/50">
                Ainda não há ligas no ranking.
              </p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-foreground/[0.08]">
                    <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal w-14">
                      #
                    </th>
                    <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                      Liga
                    </th>
                    <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                      Projetos
                    </th>
                    <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                      Presença
                    </th>
                    <th className="text-right py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                      Pontuação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r, idx) => {
                    const isLast = idx === ranking.length - 1;
                    return (
                      <tr
                        key={r.liga_id}
                        className={!isLast ? "border-b border-foreground/[0.06]" : ""}
                      >
                        <td className="py-4 px-4">
                          <div
                            className={cn(
                              "flex items-center justify-center h-7 w-7 font-plex-mono text-[10px] font-bold",
                              corBadge(r.posicao),
                            )}
                          >
                            {r.posicao != null ? String(r.posicao).padStart(2, "0") : "—"}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-plex-sans text-[13px] text-foreground font-semibold">
                            {r.nome}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                          {r.projetos_concluidos + r.projetos_em_andamento}
                        </td>
                        <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                          {r.presenca_percentual}%
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-plex-sans font-bold text-[16px] text-navy">
                            {formatarPontos(r.pontuacao)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Tooltip de pontuação — canto inferior direito */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="fixed bottom-6 right-6 h-9 w-9 rounded-full bg-white dark:bg-card border border-border flex items-center justify-center shadow-md hover:opacity-80 transition-opacity"
            aria-label="Como funciona a pontuação"
          >
            <HelpCircle className="h-4 w-4 text-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="end"
          className="max-w-[280px] p-0 overflow-hidden border border-border shadow-lg"
        >
          <div className="bg-navy px-4 py-2.5">
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.16em] text-brand-yellow">
              Como funciona a pontuação
            </p>
          </div>
          <div className="bg-popover px-4 py-3 space-y-2.5">
            {configs
              .filter((c) => c.chave in CRITERIOS)
              .sort(
                (a, b) =>
                  Object.keys(CRITERIOS).indexOf(a.chave) - Object.keys(CRITERIOS).indexOf(b.chave),
              )
              .map((c) => {
                const meta = CRITERIOS[c.chave]!;
                return (
                  <div key={c.chave} className="flex items-center justify-between gap-6">
                    <div className="flex gap-2 items-start">
                      <div className="h-1.5 w-1.5 rounded-full bg-brand-yellow flex-shrink-0 mt-[5px]" />
                      <div>
                        <p className="font-plex-sans font-semibold text-[11px] text-popover-foreground leading-tight">
                          {meta.label}
                        </p>
                        <p className="font-plex-mono text-[9px] text-muted-foreground mt-0.5">
                          {meta.unidade}
                        </p>
                      </div>
                    </div>
                    <span className="font-plex-mono text-[11px] font-bold text-popover-foreground/70 flex-shrink-0">
                      +{Number(c.valor)} pts
                    </span>
                  </div>
                );
              })}
            {configs.length === 0 && (
              <p className="font-plex-mono text-[10px] text-muted-foreground">Carregando pesos…</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
