import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

type LigaAPI = { id: string; nome: string };

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
      <div className="max-w-5xl mx-auto px-8 py-10">
        <p className="font-plex-sans text-[13px] text-navy/50">Carregando...</p>
      </div>
    );
  }

  if (role === "staff") return <ProjetosStaffView abrirCriar={abrirCriar} />;
  if (role === "professor") return <ProjetosProfessorView />;
  if (role === "diretor") return <ProjetosLiderView abrirCriar={abrirCriar} />;

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

  // Visão do membro / estudante — diretório completo (rascunhos ficam ocultos pela API)
  const lista = (projetos ?? []).filter((p) => p.status !== "rascunho");
  const ligas = ligasData ?? [];

  const filtrados = lista.filter((p) => {
    if (filtroLiga && p.liga?.id !== filtroLiga) return false;
    if (filtroStatus && p.status !== filtroStatus) return false;
    return true;
  });

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
          Diretório
        </p>
      </div>

      <div className="space-y-12">
        {!carregando && <KpiRow items={kpis} />}

        <div>
          <SectionHeader numero="01" eyebrow="Diretório" titulo="Todos os Projetos" />

          <div className="flex gap-3 mb-6">
            <select
              value={filtroLiga}
              onChange={(e) => setFiltroLiga(e.target.value)}
              className="font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2 bg-white focus:outline-none focus:border-navy/60"
            >
              <option value="">Todas as ligas</option>
              {ligas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2 bg-white focus:outline-none focus:border-navy/60"
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_CONFIG)
                .filter(([k]) => k !== "rascunho")
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
            </select>
          </div>

          {carregando ? (
            <Card className="shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {["Projeto", "Liga", "Responsável", "Prazo", "Status", "%"].map((col) => (
                      <TableHead
                        key={col}
                        className="text-xs uppercase tracking-wide text-muted-foreground font-semibold"
                      >
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : filtrados.length === 0 ? (
            <p className="font-plex-sans text-[13px] text-navy/50">Nenhum projeto encontrado.</p>
          ) : (
            <EditorialTable
              columns={["Projeto", "Liga", "Responsável", "Prazo", "Status", "%"]}
              rows={filtrados.map((p) => {
                const s = STATUS_CONFIG[p.status] ?? { label: p.status, className: "text-navy/50" };
                return [
                  <span key="t" className="font-medium">
                    {p.titulo}
                  </span>,
                  p.liga?.nome ?? "—",
                  p.responsavel_nome ?? "—",
                  p.prazo
                    ? new Date(p.prazo.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", {
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
      </div>
    </div>
  );
}
