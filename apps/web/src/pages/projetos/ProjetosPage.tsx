import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useUser } from "@/hooks/use-user";
import { EditorialTable, KpiRow, SectionHeader } from "@/pages/home/v1/primitives";

import { ProjetosLiderView } from "./ProjetosLiderView";
import { ProjetosProfessorView } from "./ProjetosProfessorView";
import { ProjetosStaffView } from "./ProjetosStaffView";

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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "text-navy/50" },
  em_aprovacao: { label: "Em aprovação", className: "text-amber-600" },
  aprovado: { label: "Aprovado", className: "text-blue-600" },
  rejeitado: { label: "Rejeitado", className: "text-red-600" },
  em_andamento: { label: "Em andamento", className: "text-blue-600" },
  concluido: { label: "Concluído", className: "text-green-700" },
  cancelado: { label: "Cancelado", className: "text-navy/40" },
};

export function ProjetosPage() {
  const { role } = useUser();
  const { data: projetos, carregando } = useCachedFetch<ProjetoAPI[]>("/api/projetos");

  if (role === null) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10">
        <p className="font-plex-sans text-[13px] text-navy/50">Carregando...</p>
      </div>
    );
  }

  if (role === "staff") return <ProjetosStaffView />;
  if (role === "professor") return <ProjetosProfessorView />;
  if (role === "diretor") return <ProjetosLiderView />;

  if (role !== "membro" && role !== "estudante") {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="mb-10">
          <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
            Projetos
          </h1>
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
            Módulo
          </p>
        </div>
        <p className="font-plex-sans text-[13px] text-navy/50">Módulo em desenvolvimento.</p>
      </div>
    );
  }

  // Visão do membro / estudante
  const lista = projetos ?? [];
  const ativos = lista.filter((p) => ["aprovado", "em_andamento"].includes(p.status));

  const kpis = [
    { label: "Total projetos", valor: String(lista.length) },
    {
      label: "Em andamento",
      valor: String(lista.filter((p) => p.status === "em_andamento").length),
    },
    { label: "Aprovados", valor: String(lista.filter((p) => p.status === "aprovado").length) },
    { label: "Concluídos", valor: String(lista.filter((p) => p.status === "concluido").length) },
  ];

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-10">
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
          Projetos
        </h1>
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
          Minha Liga
        </p>
      </div>

      <div className="space-y-12">
        {!carregando && <KpiRow items={kpis} />}

        <div>
          <SectionHeader numero="01" eyebrow="Iniciativas" titulo="Projetos Ativos" />
          {carregando ? (
            <p className="font-plex-sans text-[13px] text-navy/50">Carregando projetos...</p>
          ) : ativos.length === 0 ? (
            <p className="font-plex-sans text-[13px] text-navy/50">Nenhum projeto ativo.</p>
          ) : (
            <EditorialTable
              columns={["Projeto", "Liga", "Prazo", "Status", "%"]}
              rows={ativos.map((p) => {
                const s = STATUS_CONFIG[p.status] ?? { label: p.status, className: "text-navy/50" };
                return [
                  <span key="t" className="font-medium">
                    {p.titulo}
                  </span>,
                  p.liga?.nome ?? "—",
                  p.prazo
                    ? new Date(p.prazo + "T00:00:00").toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })
                    : "—",
                  <span key="s" className={`font-medium ${s.className}`}>
                    {s.label}
                  </span>,
                  <span key="pct" className="font-plex-mono text-navy/70">
                    {p.percentual_concluido}%
                  </span>,
                ];
              })}
            />
          )}
        </div>

        {lista.filter((p) => !["aprovado", "em_andamento"].includes(p.status)).length > 0 && (
          <div>
            <SectionHeader numero="02" eyebrow="Histórico" titulo="Outros Projetos" />
            <EditorialTable
              columns={["Projeto", "Liga", "Status", "%"]}
              rows={lista
                .filter((p) => !["aprovado", "em_andamento"].includes(p.status))
                .map((p) => {
                  const s = STATUS_CONFIG[p.status] ?? {
                    label: p.status,
                    className: "text-navy/50",
                  };
                  return [
                    p.titulo,
                    p.liga?.nome ?? "—",
                    <span key="s" className={`font-medium ${s.className}`}>
                      {s.label}
                    </span>,
                    <span key="pct" className="font-plex-mono text-navy/70">
                      {p.percentual_concluido}%
                    </span>,
                  ];
                })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
