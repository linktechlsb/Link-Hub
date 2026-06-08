import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useState } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { supabase } from "@/lib/supabase";
import { DashboardCard } from "@/pages/home/components/DashboardCard";
import { StatStrip, TabSection } from "@/pages/ligas/tabs/primitives";

import { TabelaProjetosSkeleton } from "./ProjetoSkeletons";
import { STATUS_CONFIG } from "./statusConfig";

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

const TH_CLASS =
  "px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-foreground/40";
const ROW_CLASS =
  "border-b border-border transition-colors last:border-0 hover:bg-foreground/[0.03]";

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function diasDesde(data: string) {
  const diff = Date.now() - new Date(data).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function ProjetosProfessorView() {
  const { data, carregando, refetch } = useCachedFetch<ProjetoAPI[]>("/api/projetos");
  const projetos = data ?? [];
  const [sheetProjeto, setSheetProjeto] = useState<ProjetoAPI | null>(null);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const aguardando = projetos.filter((p) => p.aprovacao_professor === "pendente");
  const aprovadosPorMim = projetos.filter((p) => p.aprovacao_professor === "aprovado");
  const recusadosPorMim = projetos.filter((p) => p.aprovacao_professor === "recusado");

  const kpis = [
    { icon: Clock, label: "Aguardando decisão", value: String(aguardando.length) },
    { icon: CheckCircle2, label: "Aprovados por mim", value: String(aprovadosPorMim.length) },
    { icon: XCircle, label: "Recusados por mim", value: String(recusadosPorMim.length) },
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
    <div className="mx-auto max-w-6xl px-8 py-10">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Projetos</h1>
        <p className="mt-1 text-sm text-foreground/50">Revisão acadêmica dos projetos das ligas</p>
      </div>

      <div className="space-y-8">
        {!carregando && <StatStrip items={kpis} />}

        {/* Aguardando decisão */}
        <TabSection titulo="Aguardando decisão">
          {carregando ? (
            <TabelaProjetosSkeleton linhas={3} />
          ) : aguardando.length === 0 ? (
            <p className="text-sm text-foreground/50">Nenhum projeto aguardando aprovação.</p>
          ) : (
            <DashboardCard className="overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {["Projeto", "Liga", "Responsável", "Prazo", "Aguardando", ""].map((h, i) => (
                      <th key={h || i} className={TH_CLASS}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {aguardando.map((p) => (
                    <tr key={p.id} className={ROW_CLASS}>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-foreground">{p.titulo}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground/60">
                        {p.liga?.nome ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground/60">{responsavelNome(p)}</td>
                      <td className="px-4 py-3 text-sm text-foreground/60">
                        {p.prazo
                          ? new Date(p.prazo + "T00:00:00").toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-300">
                          {diasDesde(p.criado_em)}d
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setMotivo("");
                            setSheetProjeto(p);
                          }}
                          className="text-xs text-foreground/50 transition-colors hover:text-foreground"
                        >
                          Revisar →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DashboardCard>
          )}
        </TabSection>

        {/* Histórico */}
        {(aprovadosPorMim.length > 0 || recusadosPorMim.length > 0) && (
          <TabSection titulo="Minhas decisões">
            <DashboardCard className="overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {["Projeto", "Liga", "Decisão", "Data"].map((h) => (
                      <th key={h} className={TH_CLASS}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...aprovadosPorMim, ...recusadosPorMim].map((p) => (
                    <tr key={p.id} className={ROW_CLASS}>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-foreground">{p.titulo}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground/60">
                        {p.liga?.nome ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium ${
                            p.aprovacao_professor === "aprovado"
                              ? "text-emerald-600 dark:text-emerald-300"
                              : "text-red-600 dark:text-red-300"
                          }`}
                        >
                          {p.aprovacao_professor === "aprovado" ? "Aprovado" : "Recusado"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground/60">
                        {new Date(p.criado_em).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DashboardCard>
          </TabSection>
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
