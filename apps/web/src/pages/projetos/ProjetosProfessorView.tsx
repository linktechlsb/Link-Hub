import { useState } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { supabase } from "@/lib/supabase";
import { EditorialTable, KpiRow, SectionHeader } from "@/pages/home/v1/primitives";

type ProjetoAPI = {
  id: string;
  titulo: string;
  descricao?: string;
  status: string;
  prazo?: string;
  percentual_concluido: number;
  aprovacao_professor: string;
  aprovacao_staff: string;
  criado_em: string;
  liga?: { id: string; nome: string };
  responsavel_nome?: string;
  responsavel?: { nome: string };
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

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function diasDesde(data: string) {
  const diff = Date.now() - new Date(data).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function ProjetosProfessorView() {
  const { data, refetch } = useCachedFetch<ProjetoAPI[]>("/api/projetos");
  const projetos = data ?? [];
  const [sheetProjeto, setSheetProjeto] = useState<ProjetoAPI | null>(null);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const aguardando = projetos.filter((p) => p.aprovacao_professor === "pendente");
  const aprovadosPorMim = projetos.filter((p) => p.aprovacao_professor === "aprovado");
  const recusadosPorMim = projetos.filter((p) => p.aprovacao_professor === "recusado");

  const kpis = [
    { label: "Aguardando decisão", valor: String(aguardando.length) },
    { label: "Aprovados por mim", valor: String(aprovadosPorMim.length) },
    { label: "Recusados por mim", valor: String(recusadosPorMim.length) },
  ];

  async function handleAprovar() {
    if (!sheetProjeto) return;
    setSalvando(true);
    try {
      const token = await getToken();
      await fetch(`/api/projetos/${sheetProjeto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ aprovacao_professor: "aprovado" }),
      });
      setSheetProjeto(null);
      refetch();
    } finally {
      setSalvando(false);
    }
  }

  async function handleRecusar() {
    if (!sheetProjeto || !motivo.trim()) return;
    setSalvando(true);
    try {
      const token = await getToken();
      await fetch(`/api/projetos/${sheetProjeto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ aprovacao_professor: "recusado", motivo_recusa: motivo }),
      });
      setSheetProjeto(null);
      setMotivo("");
      refetch();
    } finally {
      setSalvando(false);
    }
  }

  const responsavelNome = (p: ProjetoAPI) => p.responsavel_nome ?? p.responsavel?.nome ?? "—";

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Cabeçalho */}
      <div className="mb-10">
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
          Projetos
        </h1>
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
          Revisão Acadêmica
        </p>
      </div>

      <div className="space-y-12">
        <KpiRow items={kpis} />

        {/* Aguardando decisão */}
        <div>
          <SectionHeader numero="01" eyebrow="Pendências" titulo="Aguardando Decisão" />
          {aguardando.length === 0 ? (
            <p className="font-plex-sans text-[13px] text-navy/50">
              Nenhum projeto aguardando aprovação.
            </p>
          ) : (
            <EditorialTable
              columns={["Projeto", "Liga", "Responsável", "Prazo", "Aguardando", ""]}
              rows={aguardando.map((p) => [
                <span key="t" className="font-medium">
                  {p.titulo}
                </span>,
                p.liga?.nome ?? "—",
                responsavelNome(p),
                p.prazo
                  ? new Date(p.prazo + "T00:00:00").toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })
                  : "—",
                <span key="d" className="font-plex-mono text-[11px] text-amber-600">
                  {diasDesde(p.criado_em)}d
                </span>,
                <button
                  key="btn"
                  onClick={() => {
                    setMotivo("");
                    setSheetProjeto(p);
                  }}
                  className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy transition-colors"
                >
                  Revisar →
                </button>,
              ])}
            />
          )}
        </div>

        {/* Histórico */}
        {(aprovadosPorMim.length > 0 || recusadosPorMim.length > 0) && (
          <div>
            <SectionHeader numero="02" eyebrow="Histórico" titulo="Minhas Decisões" />
            <EditorialTable
              columns={["Projeto", "Liga", "Decisão", "Data"]}
              rows={[...aprovadosPorMim, ...recusadosPorMim].map((p) => [
                p.titulo,
                p.liga?.nome ?? "—",
                <span
                  key="d"
                  className={
                    p.aprovacao_professor === "aprovado"
                      ? "text-green-700 font-medium"
                      : "text-red-600 font-medium"
                  }
                >
                  {p.aprovacao_professor === "aprovado" ? "Aprovado" : "Recusado"}
                </span>,
                new Date(p.criado_em).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }),
              ])}
            />
          </div>
        )}
      </div>

      {/* Sheet — revisar projeto */}
      <Sheet
        open={!!sheetProjeto}
        onOpenChange={(o) => {
          if (!o) setSheetProjeto(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0 bg-white"
        >
          <div className="flex-shrink-0">
            <div className="h-px bg-navy/90" />
            <div className="px-8 pt-8 pb-6">
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50">
                Revisão
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mt-1">
                {sheetProjeto?.titulo}
              </h2>
            </div>
            <div className="h-px bg-navy/15" />
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {sheetProjeto?.descricao && (
              <div>
                <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2">
                  Descrição
                </p>
                <p className="font-plex-sans text-[13px] text-navy/80">{sheetProjeto.descricao}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-1">
                  Liga
                </p>
                <p className="font-plex-sans text-[13px] text-navy">
                  {sheetProjeto?.liga?.nome ?? "—"}
                </p>
              </div>
              <div>
                <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-1">
                  Status
                </p>
                <p
                  className={`font-plex-sans text-[13px] font-medium ${STATUS_CONFIG[sheetProjeto?.status ?? ""]?.className ?? ""}`}
                >
                  {STATUS_CONFIG[sheetProjeto?.status ?? ""]?.label ?? sheetProjeto?.status}
                </p>
              </div>
              <div>
                <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-1">
                  Prazo
                </p>
                <p className="font-plex-sans text-[13px] text-navy">
                  {sheetProjeto?.prazo
                    ? new Date(sheetProjeto.prazo + "T00:00:00").toLocaleDateString("pt-BR")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-1">
                  Responsável
                </p>
                <p className="font-plex-sans text-[13px] text-navy">
                  {sheetProjeto ? responsavelNome(sheetProjeto) : "—"}
                </p>
              </div>
            </div>

            <div>
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
                Motivo da recusa (se recusar)
              </p>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Descreva o motivo..."
                rows={3}
                className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white placeholder:text-navy/30 focus:outline-none focus:border-navy/60 resize-none"
              />
            </div>
          </div>

          <div className="flex-shrink-0">
            <div className="h-px bg-navy/15" />
            <div className="px-8 py-6 flex gap-3">
              <button
                onClick={handleAprovar}
                disabled={salvando}
                className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {salvando ? "..." : "Aprovar"}
              </button>
              <button
                onClick={handleRecusar}
                disabled={salvando || !motivo.trim()}
                className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy border border-navy px-4 py-3 hover:bg-navy hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {salvando ? "..." : "Recusar"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
