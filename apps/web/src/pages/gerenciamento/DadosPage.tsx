import { Activity, Eye, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { HeatmapCanvas } from "@/pages/gerenciamento/HeatmapCanvas";
import { DashboardCard } from "@/pages/home/components/DashboardCard";
import { StatStrip, TabSection } from "@/pages/ligas/tabs/primitives";

import type {
  AcessoRecente,
  AnalyticsResumo,
  HeatmapPonto,
  HeatmapRota,
  PaginaAcesso,
  TendenciaPonto,
} from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarDia(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatarNumero(valor: number): string {
  return valor.toLocaleString("pt-BR");
}

export function DadosPage() {
  const [resumo, setResumo] = useState<AnalyticsResumo | null>(null);
  const [paginas, setPaginas] = useState<PaginaAcesso[]>([]);
  const [tendencia, setTendencia] = useState<TendenciaPonto[]>([]);
  const [recentes, setRecentes] = useState<AcessoRecente[]>([]);
  const [heatmapRotas, setHeatmapRotas] = useState<HeatmapRota[]>([]);
  const [rotaHeatmap, setRotaHeatmap] = useState<string>("");
  const [heatmapPontos, setHeatmapPontos] = useState<HeatmapPonto[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [resResumo, resPaginas, resTendencia, resRecentes, resHeatRotas] = await Promise.all([
          fetch("/api/analytics/resumo", { headers }),
          fetch("/api/analytics/paginas?periodo=7d", { headers }),
          fetch("/api/analytics/tendencia?periodo=30d", { headers }),
          fetch("/api/analytics/recentes?limite=30", { headers }),
          fetch("/api/analytics/heatmap/rotas", { headers }),
        ]);

        if (resResumo.ok) setResumo((await resResumo.json()) as AnalyticsResumo);
        if (resPaginas.ok) setPaginas((await resPaginas.json()) as PaginaAcesso[]);
        if (resTendencia.ok) setTendencia((await resTendencia.json()) as TendenciaPonto[]);
        if (resRecentes.ok) setRecentes((await resRecentes.json()) as AcessoRecente[]);
        if (resHeatRotas.ok) {
          const rotas = (await resHeatRotas.json()) as HeatmapRota[];
          setHeatmapRotas(rotas);
          if (rotas.length > 0) setRotaHeatmap(rotas[0]!.rota);
        }
      } finally {
        setCarregando(false);
      }
    }
    void carregar();
  }, []);

  // Carrega os pontos do mapa de calor sempre que a rota selecionada muda.
  useEffect(() => {
    if (!rotaHeatmap) {
      setHeatmapPontos([]);
      return;
    }
    let ativo = true;
    async function carregarHeatmap() {
      const token = await getToken();
      const res = await fetch(
        `/api/analytics/heatmap?rota=${encodeURIComponent(rotaHeatmap)}&periodo=30d`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (ativo && res.ok) setHeatmapPontos((await res.json()) as HeatmapPonto[]);
    }
    void carregarHeatmap();
    return () => {
      ativo = false;
    };
  }, [rotaHeatmap]);

  const maxAcessos = paginas.length > 0 ? Math.max(...paginas.map((p) => p.total)) : 0;

  // URL concreta para o preview do heatmap (caminho representativo da rota selecionada).
  const previewUrl =
    heatmapRotas.find((r) => r.rota === rotaHeatmap)?.caminho ?? rotaHeatmap ?? null;

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Dados</h1>
        <p className="mt-1 text-sm text-foreground/50">
          Uso da plataforma — acessos, usuários ativos e páginas mais visitadas
        </p>
      </div>

      {carregando ? (
        <div className="space-y-8">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* KPIs */}
          <StatStrip
            items={[
              {
                icon: Activity,
                label: "Online agora",
                value: formatarNumero(resumo?.online_agora ?? 0),
              },
              {
                icon: Users,
                label: "Usuários hoje",
                value: formatarNumero(resumo?.usuarios_hoje ?? 0),
              },
              {
                icon: Users,
                label: "Usuários (7 dias)",
                value: formatarNumero(resumo?.usuarios_7d ?? 0),
              },
              {
                icon: Eye,
                label: "Total de acessos",
                value: formatarNumero(resumo?.total_pageviews ?? 0),
              },
            ]}
          />

          {/* Tendência no tempo */}
          <TabSection titulo="Tendência (30 dias)">
            <DashboardCard className="p-5">
              {tendencia.length === 0 ? (
                <p className="py-12 text-center text-sm text-foreground/40">
                  Ainda não há dados de acesso registrados.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={tendencia} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="corPageviews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10284E" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10284E" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="corUsuarios" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#546484" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#546484" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="currentColor"
                      className="text-border"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dia"
                      tickFormatter={formatarDia}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip
                      labelFormatter={(v) => formatarDia(String(v))}
                      formatter={(value, name) => [
                        value,
                        name === "pageviews" ? "Acessos" : "Usuários",
                      ]}
                    />
                    <Area
                      type="monotone"
                      name="pageviews"
                      dataKey="pageviews"
                      stroke="#10284E"
                      strokeWidth={2}
                      fill="url(#corPageviews)"
                    />
                    <Area
                      type="monotone"
                      name="usuarios"
                      dataKey="usuarios"
                      stroke="#546484"
                      strokeWidth={2}
                      fill="url(#corUsuarios)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </DashboardCard>
          </TabSection>

          {/* Acessos por página */}
          <TabSection titulo="Acessos por página (7 dias)">
            <DashboardCard className="p-5">
              {paginas.length === 0 ? (
                <p className="py-8 text-center text-sm text-foreground/40">
                  Sem acessos no período.
                </p>
              ) : (
                <ul className="space-y-4">
                  {paginas.map((p) => (
                    <li key={p.rota}>
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium text-foreground">{p.rota}</span>
                        <span className="shrink-0 text-xs text-foreground/50">
                          {formatarNumero(p.total)} acessos · {p.usuarios_unicos} usuários
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                        <div
                          className="h-full rounded-full bg-navy dark:bg-link-blue"
                          style={{ width: `${maxAcessos > 0 ? (p.total / maxAcessos) * 100 : 0}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardCard>
          </TabSection>

          {/* Acessos recentes */}
          <TabSection titulo="Acessos recentes">
            <DashboardCard className="overflow-hidden">
              {recentes.length === 0 ? (
                <p className="py-8 text-center text-sm text-foreground/40">
                  Nenhum acesso recente.
                </p>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-5 py-3 text-left text-xs font-normal text-foreground/40">
                        Nome
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-normal text-foreground/40">
                        Papel
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-normal text-foreground/40">
                        Liga
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-normal text-foreground/40">
                        Página
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-normal text-foreground/40">
                        Quando
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentes.map((acesso, i) => (
                      <tr
                        key={`${acesso.criado_em}-${i}`}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-5 py-3 text-sm font-medium text-foreground">
                          {acesso.usuario_nome ?? "—"}
                        </td>
                        <td className="px-5 py-3">
                          {acesso.papel ? (
                            <span className="inline-flex items-center rounded-full bg-foreground/[0.06] px-2.5 py-0.5 text-xs font-medium capitalize text-foreground/70">
                              {acesso.papel}
                            </span>
                          ) : (
                            <span className="text-sm text-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm text-foreground/70">
                          {acesso.liga_nome ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-sm text-foreground/70">{acesso.rota}</td>
                        <td className="px-5 py-3 text-right text-xs tabular-nums text-foreground/50">
                          {formatarData(acesso.criado_em)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </DashboardCard>
          </TabSection>

          {/* Mapa de calor de cliques */}
          <TabSection
            titulo="Mapa de calor de cliques"
            acao={
              heatmapRotas.length > 0 ? (
                <select
                  value={rotaHeatmap}
                  onChange={(e) => setRotaHeatmap(e.target.value)}
                  className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground"
                >
                  {heatmapRotas.map((r) => (
                    <option key={r.rota} value={r.rota}>
                      {r.rota} ({r.total})
                    </option>
                  ))}
                </select>
              ) : undefined
            }
          >
            <DashboardCard className="p-5">
              {heatmapRotas.length === 0 ? (
                <p className="py-12 text-center text-sm text-foreground/40">
                  Ainda não há cliques registrados. Navegue pela plataforma para começar a coletar
                  dados.
                </p>
              ) : (
                <>
                  <div
                    className="relative w-full overflow-hidden rounded-lg border border-border bg-white"
                    style={{ aspectRatio: "16 / 9" }}
                  >
                    {previewUrl ? (
                      <iframe
                        key={previewUrl}
                        src={previewUrl}
                        title="Pré-visualização da página"
                        className="absolute inset-0 h-full w-full border-0"
                        scrolling="no"
                      />
                    ) : null}
                    <HeatmapCanvas pontos={heatmapPontos} />
                  </div>
                  <p className="mt-3 text-xs text-foreground/40">
                    {heatmapPontos.length} cliques nos últimos 30 dias · posição relativa à tela
                    (acima da dobra). Azul = menos cliques, vermelho = mais cliques.
                  </p>
                </>
              )}
            </DashboardCard>
          </TabSection>
        </div>
      )}
    </div>
  );
}
