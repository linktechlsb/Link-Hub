import { Trophy, TrendingUp, Users, MessageSquare, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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

function corPorPosicao(pos: number | undefined): string {
  if (pos === 1) return "bg-brand-yellow text-navy";
  if (pos === 2) return "bg-gray-200 text-navy";
  if (pos === 3) return "bg-orange-200 text-orange-900";
  return "bg-gray-100 text-muted-foreground";
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

  const topo = ranking.slice(0, 3);
  const restante = ranking.slice(3);
  const pontuacaoMaxima = ranking[0]?.pontuacao ?? 1;

  if (carregando) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando ranking…</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-navy">Ranking</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pontuação automática baseada em projetos, presença, receita e engajamento
        </p>
      </div>

      {/* Pódio */}
      {topo.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {topo.map((r) => (
            <div
              key={r.liga_id}
              className={cn(
                "bg-white border rounded-xl p-4 text-center",
                r.posicao === 1 ? "border-brand-yellow shadow-sm" : "border-brand-gray",
              )}
            >
              <div
                className={cn(
                  "inline-flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold mb-2",
                  corPorPosicao(r.posicao),
                )}
              >
                {r.posicao}
              </div>
              <Avatar className="h-12 w-12 mx-auto mb-2">
                {r.imagem_url ? <AvatarImage src={r.imagem_url} alt={r.nome} /> : null}
                <AvatarFallback className="bg-navy text-white text-xs">
                  {iniciais(r.nome)}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm font-semibold text-navy truncate">{r.nome}</p>
              <p className="font-display font-bold text-xl text-navy mt-1">
                {formatarPontos(r.pontuacao)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">pontos</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista completa */}
      <div className="bg-white border border-brand-gray rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-brand-gray flex items-center gap-2">
          <Trophy className="h-4 w-4 text-link-blue" />
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider">
            Ranking Completo ({ranking.length})
          </p>
        </div>

        {ranking.length === 0 ? (
          <p className="p-8 text-sm text-muted-foreground text-center">
            Ainda não há ligas no ranking.
          </p>
        ) : (
          <div className="divide-y divide-brand-gray">
            {restante.map((r) => {
              const porcentagem = pontuacaoMaxima > 0 ? (r.pontuacao / pontuacaoMaxima) * 100 : 0;
              return (
                <div key={r.liga_id} className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "inline-flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold flex-shrink-0",
                        corPorPosicao(r.posicao),
                      )}
                    >
                      {r.posicao}
                    </div>
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      {r.imagem_url ? <AvatarImage src={r.imagem_url} alt={r.nome} /> : null}
                      <AvatarFallback className="bg-navy text-white text-[10px]">
                        {iniciais(r.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-navy truncate">{r.nome}</p>
                        <p className="font-display font-bold text-sm text-navy flex-shrink-0">
                          {formatarPontos(r.pontuacao)} pts
                        </p>
                      </div>
                      <div className="w-full bg-brand-gray rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${porcentagem}%`,
                            background: "linear-gradient(90deg, #10284E, #546484)",
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {r.projetos_concluidos + r.projetos_em_andamento} proj.
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {r.presencas} presenças
                        </span>
                        <span className="flex items-center gap-1">
                          <Wallet className="h-3 w-3" />
                          {formatarMoeda(r.receita_total)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {r.posts} posts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
