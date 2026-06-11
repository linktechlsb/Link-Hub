import { CheckCircle2, HelpCircle, ListChecks, TrendingUp, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { DashboardCard } from "@/pages/home/components/DashboardCard";
import { StatStrip } from "@/pages/ligas/tabs/primitives";

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

/** Cor do número da posição — pódio em destaque (espelha o RankingPanel da Home). */
function corPosicao(pos: number | undefined): string {
  if (pos === 1) return "text-amber-500 dark:text-brand-yellow";
  if (pos === 2) return "text-foreground/70";
  if (pos === 3) return "text-foreground/50";
  return "text-foreground/30";
}

const TH_CLASS = "px-4 py-2.5 text-left text-xs font-normal text-foreground/40";

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
      <div className="mx-auto max-w-5xl px-8 py-10">
        <div className="mb-8">
          <Skeleton className="h-8 w-32 bg-foreground/5" />
          <Skeleton className="mt-2 h-4 w-40 bg-foreground/5" />
        </div>
        <div className="space-y-8">
          <Skeleton className="h-24 w-full rounded-xl bg-foreground/5" />
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl bg-foreground/5" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-xl bg-foreground/5" />
              <Skeleton className="h-16 rounded-xl bg-foreground/5" />
            </div>
          </div>
          <Skeleton className="h-64 w-full rounded-xl bg-foreground/5" />
        </div>
      </div>
    );
  }

  const topo = ranking.slice(0, 3);
  const totalProjetos = ranking.reduce(
    (acc, r) => acc + r.projetos_concluidos + r.projetos_em_andamento,
    0,
  );
  const projetosConcluidos = ranking.reduce((acc, r) => acc + r.projetos_concluidos, 0);

  const kpis = [
    { icon: Trophy, label: "Ligas", value: String(ranking.length) },
    { icon: ListChecks, label: "Projetos", value: String(totalProjetos) },
    { icon: CheckCircle2, label: "Concluídos", value: String(projetosConcluidos) },
    {
      icon: TrendingUp,
      label: "Líder",
      value: topo[0] ? formatarPontos(topo[0].pontuacao) : "—",
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto max-w-5xl px-8 py-10">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Ranking</h1>
          <p className="mt-1 text-sm text-foreground/50">Classificação geral das ligas</p>
        </div>

        <div className="space-y-8">
          <StatStrip items={kpis} />

          {/* Pódio */}
          {topo.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-xs text-foreground/40">Pódio</h2>
              <div className="space-y-3">
                {/* 1º lugar — largura total */}
                {topo[0] && (
                  <DashboardCard className="p-5">
                    <div className="flex items-center gap-4">
                      <span
                        className={cn(
                          "w-8 text-center font-display text-3xl font-bold leading-none tabular-nums",
                          corPosicao(1),
                        )}
                      >
                        1
                      </span>
                      <Avatar className="size-11 rounded-lg">
                        <AvatarImage src={topo[0].imagem_url ?? undefined} alt={topo[0].nome} />
                        <AvatarFallback className="rounded-lg bg-foreground/[0.06] text-xs font-medium text-foreground/70">
                          {iniciais(topo[0].nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-base font-bold text-foreground">
                          {topo[0].nome}
                        </p>
                        <p className="mt-0.5 text-xs text-foreground/50">
                          {topo[0].projetos_concluidos + topo[0].projetos_em_andamento} proj ·{" "}
                          {topo[0].presenca_percentual}% pres ·{" "}
                          {formatarMoeda(topo[0].receita_total)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-display text-3xl font-bold leading-none tabular-nums text-foreground">
                          {formatarPontos(topo[0].pontuacao)}
                        </p>
                        <p className="mt-1 text-xs text-foreground/40">pontos</p>
                      </div>
                    </div>
                  </DashboardCard>
                )}

                {/* 2º e 3º — lado a lado */}
                {topo.length > 1 && (
                  <div className="grid grid-cols-2 gap-3">
                    {topo.slice(1).map((r) => (
                      <DashboardCard key={r.liga_id} className="p-5">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "w-6 text-center font-display text-2xl font-bold leading-none tabular-nums",
                              corPosicao(r.posicao),
                            )}
                          >
                            {r.posicao}
                          </span>
                          <Avatar className="size-9 rounded-lg">
                            <AvatarImage src={r.imagem_url ?? undefined} alt={r.nome} />
                            <AvatarFallback className="rounded-lg bg-foreground/[0.06] text-[10px] font-medium text-foreground/70">
                              {iniciais(r.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-sm font-bold text-foreground">
                              {r.nome}
                            </p>
                            <p className="mt-0.5 text-xs text-foreground/50">
                              {r.projetos_concluidos + r.projetos_em_andamento} proj ·{" "}
                              {r.presenca_percentual}% pres
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-display text-xl font-bold leading-none tabular-nums text-foreground">
                              {formatarPontos(r.pontuacao)}
                            </p>
                            <p className="mt-1 text-xs text-foreground/40">pts</p>
                          </div>
                        </div>
                      </DashboardCard>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Ranking completo */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xs text-foreground/40">Ranking completo</h2>
            {ranking.length === 0 ? (
              <p className="text-sm text-foreground/50">Ainda não há ligas no ranking.</p>
            ) : (
              <DashboardCard className="overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className={cn(TH_CLASS, "w-14")}>#</th>
                      <th className={TH_CLASS}>Liga</th>
                      <th className={TH_CLASS}>Projetos</th>
                      <th className={TH_CLASS}>Presença</th>
                      <th className={cn(TH_CLASS, "text-right")}>Pontuação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((r) => (
                      <tr
                        key={r.liga_id}
                        className="border-b border-border transition-colors last:border-0 hover:bg-foreground/[0.03]"
                      >
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "font-display text-sm font-bold tabular-nums",
                              corPosicao(r.posicao),
                            )}
                          >
                            {r.posicao != null ? String(r.posicao).padStart(2, "0") : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2.5">
                            <Avatar className="size-7 rounded-md">
                              <AvatarImage src={r.imagem_url ?? undefined} alt={r.nome} />
                              <AvatarFallback className="rounded-md bg-foreground/[0.06] text-[10px] font-medium text-foreground/70">
                                {iniciais(r.nome)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-foreground">{r.nome}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm tabular-nums text-foreground/60">
                          {r.projetos_concluidos + r.projetos_em_andamento}
                        </td>
                        <td className="px-4 py-3 text-sm tabular-nums text-foreground/60">
                          {r.presenca_percentual}%
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-display text-base font-bold tabular-nums text-foreground">
                            {formatarPontos(r.pontuacao)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DashboardCard>
            )}
          </section>
        </div>
      </div>

      {/* Tooltip de pontuação — canto inferior direito */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="fixed bottom-6 right-6 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-opacity hover:opacity-80"
            aria-label="Como funciona a pontuação"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="end"
          className="max-w-[280px] overflow-hidden border border-border p-0 shadow-lg"
        >
          <div className="border-b border-border bg-muted px-4 py-2.5">
            <p className="text-xs font-semibold text-foreground">Como funciona a pontuação</p>
          </div>
          <div className="space-y-2.5 bg-popover px-4 py-3">
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
                    <div className="flex items-start gap-2">
                      <div className="mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-yellow" />
                      <div>
                        <p className="text-xs font-semibold leading-tight text-popover-foreground">
                          {meta.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{meta.unidade}</p>
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold tabular-nums text-popover-foreground/70">
                      +{Number(c.valor)} pts
                    </span>
                  </div>
                );
              })}
            {configs.length === 0 && (
              <p className="text-xs text-muted-foreground">Carregando pesos…</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
