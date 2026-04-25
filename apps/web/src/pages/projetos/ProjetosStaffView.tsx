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
  liga?: { id: string; nome: string };
  responsavel_nome?: string;
  responsavel?: { nome: string };
};

type LigaAPI = { id: string; nome: string };

type NovoForm = { titulo: string; descricao: string; prazo: string; liga_id: string };

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

const FORM_VAZIO: NovoForm = { titulo: "", descricao: "", prazo: "", liga_id: "" };

export function ProjetosStaffView() {
  const { data: projetosData, refetch: refetchProjetos } =
    useCachedFetch<ProjetoAPI[]>("/api/projetos");
  const { data: ligasData } = useCachedFetch<LigaAPI[]>("/api/ligas");
  const projetos = projetosData ?? [];
  const ligas = ligasData ?? [];
  const [filtroLiga, setFiltroLiga] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [sheetRevisar, setSheetRevisar] = useState<ProjetoAPI | null>(null);
  const [sheetNovo, setSheetNovo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [form, setForm] = useState<NovoForm>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const filtrados = projetos.filter((p) => {
    if (filtroLiga && p.liga?.id !== filtroLiga) return false;
    if (filtroStatus && p.status !== filtroStatus) return false;
    return true;
  });

  const kpis = [
    { label: "Total projetos", valor: String(projetos.length) },
    {
      label: "Em aprovação",
      valor: String(projetos.filter((p) => p.status === "em_aprovacao").length),
    },
    {
      label: "Aprovados",
      valor: String(
        projetos.filter((p) => ["aprovado", "em_andamento", "concluido"].includes(p.status)).length,
      ),
    },
    {
      label: "Recusados",
      valor: String(projetos.filter((p) => p.status === "rejeitado").length),
    },
  ];

  async function handleAprovar() {
    if (!sheetRevisar) return;
    setSalvando(true);
    try {
      const token = await getToken();
      await fetch(`/api/projetos/${sheetRevisar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ aprovacao_staff: "aprovado" }),
      });
      setSheetRevisar(null);
      refetchProjetos();
    } finally {
      setSalvando(false);
    }
  }

  async function handleRecusar() {
    if (!sheetRevisar || !motivo.trim()) return;
    setSalvando(true);
    try {
      const token = await getToken();
      await fetch(`/api/projetos/${sheetRevisar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ aprovacao_staff: "recusado", motivo_recusa: motivo }),
      });
      setSheetRevisar(null);
      setMotivo("");
      refetchProjetos();
    } finally {
      setSalvando(false);
    }
  }

  async function handleCriar() {
    if (!form.titulo.trim() || !form.liga_id) return;
    setSalvando(true);
    try {
      const token = await getToken();
      await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          titulo: form.titulo.trim(),
          descricao: form.descricao.trim() || undefined,
          prazo: form.prazo || undefined,
          liga_id: form.liga_id,
        }),
      });
      setSheetNovo(false);
      setForm(FORM_VAZIO);
      refetchProjetos();
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
          Gestão
        </p>
      </div>

      <div className="space-y-12">
        <KpiRow items={kpis} />

        <div>
          <SectionHeader
            numero="01"
            eyebrow="Diretório"
            titulo="Todos os Projetos"
            acao={
              <button
                onClick={() => {
                  setForm(FORM_VAZIO);
                  setSheetNovo(true);
                }}
                className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy border border-navy px-3 py-1.5 hover:bg-navy hover:text-white transition-colors"
              >
                + Novo Projeto
              </button>
            }
          />

          {/* Filtros */}
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
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {filtrados.length === 0 ? (
            <p className="font-plex-sans text-[13px] text-navy/50">Nenhum projeto encontrado.</p>
          ) : (
            <EditorialTable
              columns={["Projeto", "Liga", "Responsável", "Prazo", "Status", ""]}
              rows={filtrados.map((p) => {
                const s = STATUS_CONFIG[p.status] ?? {
                  label: p.status,
                  className: "text-navy/50",
                };
                return [
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
                  <span key="s" className={`font-medium ${s.className}`}>
                    {s.label}
                  </span>,
                  <button
                    key="btn"
                    onClick={() => {
                      setMotivo("");
                      setSheetRevisar(p);
                    }}
                    className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy transition-colors"
                  >
                    Revisar →
                  </button>,
                ];
              })}
            />
          )}
        </div>
      </div>

      {/* Sheet — revisar projeto */}
      <Sheet
        open={!!sheetRevisar}
        onOpenChange={(o) => {
          if (!o) setSheetRevisar(null);
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
                Projeto
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mt-1">
                {sheetRevisar?.titulo}
              </h2>
            </div>
            <div className="h-px bg-navy/15" />
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {sheetRevisar?.descricao && (
              <div>
                <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2">
                  Descrição
                </p>
                <p className="font-plex-sans text-[13px] text-navy/80">{sheetRevisar.descricao}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-1">
                  Liga
                </p>
                <p className="font-plex-sans text-[13px] text-navy">
                  {sheetRevisar?.liga?.nome ?? "—"}
                </p>
              </div>
              <div>
                <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-1">
                  Status
                </p>
                <p
                  className={`font-plex-sans text-[13px] font-medium ${STATUS_CONFIG[sheetRevisar?.status ?? ""]?.className ?? ""}`}
                >
                  {STATUS_CONFIG[sheetRevisar?.status ?? ""]?.label ?? sheetRevisar?.status}
                </p>
              </div>
              <div>
                <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-1">
                  Prazo
                </p>
                <p className="font-plex-sans text-[13px] text-navy">
                  {sheetRevisar?.prazo
                    ? new Date(sheetRevisar.prazo + "T00:00:00").toLocaleDateString("pt-BR")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-1">
                  Progresso
                </p>
                <p className="font-plex-sans text-[13px] text-navy">
                  {sheetRevisar?.percentual_concluido ?? 0}%
                </p>
              </div>
            </div>

            {sheetRevisar?.status === "em_aprovacao" && (
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
            )}
          </div>

          {sheetRevisar?.status === "em_aprovacao" && (
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
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet — novo projeto */}
      <Sheet
        open={sheetNovo}
        onOpenChange={(o) => {
          if (!o) setSheetNovo(false);
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
                Novo
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mt-1">
                Adicionar projeto
              </h2>
            </div>
            <div className="h-px bg-navy/15" />
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
            <div>
              <label
                htmlFor="novo-titulo"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
              >
                Título
              </label>
              <input
                id="novo-titulo"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Projeto de Marketing"
                className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white placeholder:text-navy/30 focus:outline-none focus:border-navy/60"
              />
            </div>

            <div>
              <label
                htmlFor="novo-liga"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
              >
                Liga
              </label>
              <select
                id="novo-liga"
                value={form.liga_id}
                onChange={(e) => setForm((f) => ({ ...f, liga_id: e.target.value }))}
                className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white focus:outline-none focus:border-navy/60"
              >
                <option value="">Selecionar liga...</option>
                {ligas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="novo-descricao"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
              >
                Descrição
              </label>
              <textarea
                id="novo-descricao"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva o projeto..."
                rows={3}
                className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white placeholder:text-navy/30 focus:outline-none focus:border-navy/60 resize-none"
              />
            </div>

            <div>
              <label
                htmlFor="novo-prazo"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
              >
                Prazo
              </label>
              <input
                id="novo-prazo"
                type="date"
                value={form.prazo}
                onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
                className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white focus:outline-none focus:border-navy/60"
              />
            </div>
          </div>

          <div className="flex-shrink-0">
            <div className="h-px bg-navy/15" />
            <div className="px-8 py-6">
              <button
                onClick={handleCriar}
                disabled={salvando || !form.titulo.trim() || !form.liga_id}
                className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {salvando ? "Salvando..." : "Criar projeto"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
