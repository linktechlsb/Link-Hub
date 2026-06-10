import { Activity, CheckCircle2, FolderKanban, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Skeleton } from "@/components/ui/skeleton";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useUser } from "@/hooks/use-user";
import { DashboardCard } from "@/pages/home/components/DashboardCard";
import { StatStrip, TabSection } from "@/pages/ligas/tabs/primitives";

import { ProjetosFilterBar } from "./ProjetosFilterBar";
import { ProjetosLiderView } from "./ProjetosLiderView";
import { ProjetosProfessorView } from "./ProjetosProfessorView";
import { ProjetosStaffView } from "./ProjetosStaffView";
import { STATUS_CONFIG } from "./statusConfig";

type ProjetoAPI = {
  id: string;
  liga_id: string;
  liga?: { id: string; nome: string };
  titulo: string;
  descricao?: string;
  responsavel_id: string;
  responsavel_nome?: string;
  status: string;
  prazo?: string;
  percentual_concluido: number;
  aprovacao_professor: string;
  aprovacao_staff: string;
  criado_em: string;
};

type LigaAPI = { id: string; nome: string };

export function ProjetosPage() {
  const { role } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const abrirCriar = !!(location.state as { abrirCriar?: boolean } | null)?.abrirCriar;

  useEffect(() => {
    if (abrirCriar) window.history.replaceState({}, "");
  }, [abrirCriar]);

  const { data: projetos, carregando } = useCachedFetch<ProjetoAPI[]>("/api/projetos");
  const { data: ligasData } = useCachedFetch<LigaAPI[]>("/api/ligas");
  const [filtroLiga, setFiltroLiga] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  if (role === null) {
    return (
      <div className="mx-auto max-w-6xl px-8 py-10">
        <p className="text-sm text-foreground/50">Carregando...</p>
      </div>
    );
  }

  if (role === "staff") return <ProjetosStaffView abrirCriar={abrirCriar} />;
  if (role === "professor") return <ProjetosProfessorView />;
  if (role === "diretor") return <ProjetosLiderView abrirCriar={abrirCriar} />;

  if (role !== "membro" && role !== "estudante") {
    return (
      <div className="mx-auto max-w-6xl px-8 py-10">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Projetos</h1>
          <p className="mt-1 text-sm text-foreground/50">Módulo</p>
        </div>
        <p className="text-sm text-foreground/50">Módulo em desenvolvimento.</p>
      </div>
    );
  }

  // Visão do membro / estudante — diretório completo (rascunhos ficam ocultos pela API)
  const lista = (projetos ?? []).filter((p) => p.status !== "rascunho");
  const ligas = ligasData ?? [];

  const filtrados = lista.filter((p) => {
    if (filtroLiga && p.liga?.id !== filtroLiga) return false;
    if (filtroStatus && p.status !== filtroStatus) return false;
    return true;
  });

  const kpis = [
    { icon: FolderKanban, label: "Total projetos", value: String(lista.length) },
    {
      icon: Activity,
      label: "Em andamento",
      value: String(lista.filter((p) => p.status === "em_andamento").length),
    },
    {
      icon: ThumbsUp,
      label: "Aprovados",
      value: String(lista.filter((p) => p.status === "aprovado").length),
    },
    {
      icon: CheckCircle2,
      label: "Concluídos",
      value: String(lista.filter((p) => p.status === "concluido").length),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Projetos</h1>
        <p className="mt-1 text-sm text-foreground/50">Diretório de todos os projetos das ligas</p>
      </div>

      <div className="space-y-8">
        {!carregando && <StatStrip items={kpis} />}

        <TabSection
          titulo="Todos os projetos"
          acao={
            <ProjetosFilterBar
              ligas={ligas}
              statusOptions={Object.entries(STATUS_CONFIG)
                .filter(([k]) => k !== "rascunho")
                .map(([value, v]) => ({ value, label: v.label }))}
              filtroLiga={filtroLiga}
              setFiltroLiga={setFiltroLiga}
              filtroStatus={filtroStatus}
              setFiltroStatus={setFiltroStatus}
            />
          }
        >
          {carregando ? (
            <DashboardCard className="overflow-hidden p-4">
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full bg-foreground/5" />
                ))}
              </div>
            </DashboardCard>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-foreground/50">Nenhum projeto encontrado.</p>
          ) : (
            <DashboardCard className="overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {["Projeto", "Liga", "Responsável", "Prazo", "Status", "%"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-foreground/40"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((p) => {
                    const s = STATUS_CONFIG[p.status] ?? {
                      label: p.status,
                      className: "text-foreground/50",
                    };
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-border transition-colors last:border-0 hover:bg-foreground/[0.03]"
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/projetos/${p.id}`)}
                            className="text-left text-sm font-medium text-foreground transition-colors hover:text-foreground/60"
                          >
                            {p.titulo}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground/60">
                          {p.liga?.nome ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground/60">
                          {p.responsavel_nome ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground/60">
                          {p.prazo
                            ? new Date(p.prazo.slice(0, 10) + "T12:00:00").toLocaleDateString(
                                "pt-BR",
                                { day: "2-digit", month: "short" },
                              )
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${s.className}`}>{s.label}</span>
                        </td>
                        <td className="px-4 py-3 text-sm tabular-nums text-foreground/60">
                          {p.percentual_concluido}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DashboardCard>
          )}
        </TabSection>
      </div>
    </div>
  );
}
