import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

import { DashboardCard } from "./DashboardCard";

import type { HomeData } from "../useHomeData";
import type { ConfiguracaoPontuacao, RankingLiga } from "@link-leagues/types";

/** Quantas ligas listar na tabela (o restante fica em /ranking). */
const MAX_LINHAS = 5;

function num(valor: number | string | undefined): number {
  if (valor == null) return 0;
  return typeof valor === "string" ? parseFloat(valor) || 0 : valor;
}

/**
 * Critérios de pontuação na ordem de exibição.
 * `cor` alimenta a barra segmentada + legenda; `quantidade` extrai a contagem
 * da liga; o peso vem de /api/ranking/configuracoes (chave).
 */
const CRITERIOS: {
  chave: string;
  label: string;
  cor: string;
  quantidade: (r: RankingLiga) => number;
}[] = [
  {
    chave: "projeto_concluido",
    label: "Projetos concluídos",
    cor: "#4FA8F5",
    quantidade: (r) => num(r.projetos_concluidos),
  },
  {
    chave: "projeto_em_andamento",
    label: "Em andamento",
    cor: "#F59E42",
    quantidade: (r) => num(r.projetos_em_andamento),
  },
  { chave: "presenca", label: "Presenças", cor: "#FEC641", quantidade: (r) => num(r.presencas) },
  {
    chave: "receita_por_real",
    label: "Receita",
    cor: "#2DD4BF",
    quantidade: (r) => num(r.receita_total),
  },
  { chave: "post_mural", label: "Posts", cor: "#34D399", quantidade: (r) => num(r.posts) },
];

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatarPontos(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

/** Cor do número da posição — só o 1º lugar ganha destaque de marca. */
function corPosicao(pos: number): string {
  if (pos === 1) return "text-amber-500 dark:text-brand-yellow";
  return "text-foreground/60";
}

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Painel de ranking das ligas para a Home: posição em destaque, barra
 * segmentada da composição da pontuação da liga (por critério) + legenda,
 * e tabela do ranking.
 */
export function RankingPanel({ data }: { data: HomeData }) {
  const { ranking, minhaLiga, loadingUser } = data;
  const [configs, setConfigs] = useState<ConfiguracaoPontuacao[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      const token = await getToken();
      if (!token) {
        if (!cancelado) setLoadingConfigs(false);
        return;
      }
      const res = await fetch(`/api/ranking/configuracoes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && !cancelado) setConfigs(await res.json());
      if (!cancelado) setLoadingConfigs(false);
    }
    void carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  const loading = loadingUser || loadingConfigs;

  const ordenado = [...ranking]
    .map((r) => ({ ...r, pontuacao: num(r.pontuacao) }))
    .sort((a, b) => b.pontuacao - a.pontuacao);

  // Liga em destaque no header: a do usuário; senão a líder.
  const ligaDestaque =
    (minhaLiga ? ordenado.find((r) => r.liga_id === minhaLiga.id) : undefined) ?? ordenado[0];
  const posicaoDestaque = ligaDestaque
    ? ordenado.findIndex((r) => r.liga_id === ligaDestaque.liga_id) + 1
    : null;

  const peso = (chave: string) => num(configs.find((c) => c.chave === chave)?.valor);

  // Composição da pontuação da liga em destaque, por critério (contagem × peso).
  const segmentos = ligaDestaque
    ? CRITERIOS.map((c) => ({ ...c, valor: c.quantidade(ligaDestaque) * peso(c.chave) })).filter(
        (s) => s.valor > 0,
      )
    : [];
  const totalSeg = segmentos.reduce((acc, s) => acc + s.valor, 0);

  const totalGeral = ordenado.reduce((acc, r) => acc + r.pontuacao, 0);
  const linhas = ordenado.slice(0, MAX_LINHAS);

  return (
    <DashboardCard className="flex flex-col gap-5 p-5">
      {/* Header: label + posição em destaque */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-medium text-foreground/70">
            Ranking{ligaDestaque ? ` · ${ligaDestaque.nome}` : ""}
          </h3>
          <p className="mt-1 font-display text-3xl font-bold leading-none text-foreground">
            {posicaoDestaque ? `#${posicaoDestaque}` : "—"}
          </p>
        </div>
        <Link
          to="/ranking"
          className="flex items-center gap-1 text-[11px] text-foreground/60 transition-colors hover:text-foreground"
        >
          Ver ranking <ArrowUpRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-5">
          <Skeleton className="h-2.5 w-full rounded-full bg-foreground/5" />
          <div className="flex flex-col">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border py-2.5 last:border-0"
              >
                <Skeleton className="size-4 bg-foreground/5" />
                <Skeleton className="size-7 rounded-md bg-foreground/5" />
                <Skeleton className="h-4 flex-1 bg-foreground/5" />
                <Skeleton className="h-4 w-10 bg-foreground/5" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Composição da pontuação: barra segmentada + legenda */}
          {segmentos.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1">
                {segmentos.map((s) => (
                  <div
                    key={s.chave}
                    className="h-2.5 rounded-full"
                    style={{ width: `${(s.valor / totalSeg) * 100}%`, backgroundColor: s.cor }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {segmentos.map((s) => (
                  <div key={s.chave} className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: s.cor }} />
                    <span className="text-[11px] text-foreground/60">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabela do ranking */}
          {linhas.length === 0 ? (
            <p className="py-6 text-center text-xs text-foreground/60">
              Ainda não há ligas no ranking. A pontuação aparece assim que as ligas registrarem
              atividade.
            </p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-3 border-b border-border pb-2 text-[10px] uppercase tracking-wide text-foreground/50">
                <span className="w-4" />
                <span className="flex-1">Liga</span>
                <span className="w-12 text-right">Partic.</span>
                <span className="w-14 text-right">Pontos</span>
              </div>
              {linhas.map((r, idx) => {
                const pos = idx + 1;
                const ehMinha = minhaLiga?.id === r.liga_id;
                const share = totalGeral > 0 ? (r.pontuacao / totalGeral) * 100 : 0;
                return (
                  <div
                    key={r.liga_id}
                    className="flex items-center gap-3 border-b border-border py-2.5 last:border-0"
                  >
                    <span
                      className={cn(
                        "w-4 text-center font-display text-sm font-bold tabular-nums",
                        corPosicao(pos),
                      )}
                    >
                      {pos}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Avatar className="size-7 rounded-md">
                        <AvatarImage src={r.imagem_url ?? undefined} alt={r.nome} />
                        <AvatarFallback className="rounded-md bg-foreground/[0.06] text-[10px] font-medium text-foreground/70">
                          {iniciais(r.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-xs font-medium text-foreground">{r.nome}</span>
                      {ehMinha && (
                        <span className="shrink-0 rounded bg-brand-yellow/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-brand-yellow">
                          Sua liga
                        </span>
                      )}
                    </div>
                    <span className="w-12 text-right text-xs tabular-nums text-foreground/60">
                      {Math.round(share)}%
                    </span>
                    <span className="w-14 text-right font-display text-sm font-bold tabular-nums text-foreground">
                      {formatarPontos(r.pontuacao)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </DashboardCard>
  );
}
