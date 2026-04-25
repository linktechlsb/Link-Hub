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
  motivo_recusa?: string;
  responsavel_id?: string;
  responsavel_nome?: string;
  responsavel?: { nome: string };
};

type MembroAPI = { id: string; usuario_id: string; nome: string };

type MinhaLiga = { id: string; nome: string };

type ProjetoForm = {
  titulo: string;
  descricao: string;
  prazo: string;
  responsavel_id: string;
  receita_estimada: string;
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

const FORM_VAZIO: ProjetoForm = {
  titulo: "",
  descricao: "",
  prazo: "",
  responsavel_id: "",
  receita_estimada: "",
};

export function ProjetosLiderView() {
  const { data: liga } = useCachedFetch<MinhaLiga>("/api/ligas/minha");
  const ligaId = liga?.id ?? null;
  const { data: projetosData, refetch: refetchProjetos } = useCachedFetch<ProjetoAPI[]>(
    ligaId ? `/api/ligas/${ligaId}/projetos` : null,
  );
  const { data: membrosData } = useCachedFetch<MembroAPI[]>(
    ligaId ? `/api/ligas/${ligaId}/membros` : null,
  );
  const projetos = projetosData ?? [];
  const membros = membrosData ?? [];
  const [sheetProjeto, setSheetProjeto] = useState<ProjetoAPI | "novo" | null>(null);
  const [form, setForm] = useState<ProjetoForm>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [submetendo, setSubmetendo] = useState<string | null>(null);

  const kpis = [
    { label: "Total projetos", valor: String(projetos.length) },
    { label: "Rascunhos", valor: String(projetos.filter((p) => p.status === "rascunho").length) },
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
  ];

  function abrirEditar(p: ProjetoAPI) {
    setForm({
      titulo: p.titulo,
      descricao: p.descricao ?? "",
      prazo: p.prazo ?? "",
      responsavel_id: p.responsavel_id ?? "",
      receita_estimada: "",
    });
    setSheetProjeto(p);
  }

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setSheetProjeto("novo");
  }

  async function handleSalvar(submeter = false) {
    if (!form.titulo.trim() || !liga) return;
    setSalvando(true);
    try {
      const token = await getToken();
      const body = {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || undefined,
        prazo: form.prazo || undefined,
        responsavel_id: form.responsavel_id || undefined,
        liga_id: liga.id,
        ...(submeter ? { status: "em_aprovacao" } : {}),
      };

      if (sheetProjeto === "novo") {
        await fetch("/api/projetos", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
      } else if (sheetProjeto) {
        await fetch(`/api/projetos/${sheetProjeto.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
      }

      setSheetProjeto(null);
      refetchProjetos();
    } finally {
      setSalvando(false);
    }
  }

  async function handleSubmeter(id: string) {
    if (!liga) return;
    setSubmetendo(id);
    try {
      const token = await getToken();
      await fetch(`/api/projetos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "em_aprovacao" }),
      });
      refetchProjetos();
    } finally {
      setSubmetendo(null);
    }
  }

  const nomeMembro = (id: string) => membros.find((m) => m.usuario_id === id)?.nome ?? "—";
  const responsavelNome = (p: ProjetoAPI) =>
    p.responsavel_nome ??
    p.responsavel?.nome ??
    (p.responsavel_id ? nomeMembro(p.responsavel_id) : "—");

  const isNovo = sheetProjeto === "novo";
  const projetoAtual = isNovo ? null : (sheetProjeto as ProjetoAPI | null);

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Cabeçalho */}
      <div className="mb-10">
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
          Projetos
        </h1>
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
          {liga?.nome ?? "Minha Liga"}
        </p>
      </div>

      <div className="space-y-12">
        <KpiRow items={kpis} />

        <div>
          <SectionHeader
            numero="01"
            eyebrow="Iniciativas"
            titulo="Projetos da Liga"
            acao={
              <button
                onClick={abrirNovo}
                className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy border border-navy px-3 py-1.5 hover:bg-navy hover:text-white transition-colors"
              >
                + Novo Projeto
              </button>
            }
          />

          {projetos.length === 0 ? (
            <p className="font-plex-sans text-[13px] text-navy/50">Nenhum projeto cadastrado.</p>
          ) : (
            <EditorialTable
              columns={["Projeto", "Responsável", "Prazo", "Status", ""]}
              rows={projetos.map((p) => {
                const s = STATUS_CONFIG[p.status] ?? {
                  label: p.status,
                  className: "text-navy/50",
                };
                const podSubmeter = p.status === "rascunho" || p.status === "rejeitado";
                return [
                  <div key="t">
                    <span className="font-medium">{p.titulo}</span>
                    {p.status === "rejeitado" && p.motivo_recusa && (
                      <p className="font-plex-mono text-[10px] text-red-600 mt-0.5">
                        {p.motivo_recusa}
                      </p>
                    )}
                  </div>,
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
                  <div key="acoes" className="flex items-center gap-3">
                    <button
                      onClick={() => abrirEditar(p)}
                      className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy transition-colors"
                    >
                      Editar
                    </button>
                    {podSubmeter && (
                      <button
                        onClick={() => handleSubmeter(p.id)}
                        disabled={submetendo === p.id}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy transition-colors disabled:opacity-40"
                      >
                        {submetendo === p.id ? "..." : "Submeter →"}
                      </button>
                    )}
                  </div>,
                ];
              })}
            />
          )}
        </div>
      </div>

      {/* Sheet — criar / editar projeto */}
      <Sheet
        open={sheetProjeto !== null}
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
                {isNovo ? "Novo" : "Editar"}
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mt-1">
                {isNovo ? "Adicionar projeto" : projetoAtual?.titulo}
              </h2>
            </div>
            <div className="h-px bg-navy/15" />
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
            <div>
              <label
                htmlFor="proj-titulo"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
              >
                Título
              </label>
              <input
                id="proj-titulo"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Nome do projeto"
                className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white placeholder:text-navy/30 focus:outline-none focus:border-navy/60"
              />
            </div>

            <div>
              <label
                htmlFor="proj-responsavel"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
              >
                Responsável
              </label>
              <select
                id="proj-responsavel"
                value={form.responsavel_id}
                onChange={(e) => setForm((f) => ({ ...f, responsavel_id: e.target.value }))}
                className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white focus:outline-none focus:border-navy/60"
              >
                <option value="">Nenhum</option>
                {membros.map((m) => (
                  <option key={m.usuario_id} value={m.usuario_id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="proj-descricao"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
              >
                Descrição
              </label>
              <textarea
                id="proj-descricao"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva o projeto..."
                rows={3}
                className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white placeholder:text-navy/30 focus:outline-none focus:border-navy/60 resize-none"
              />
            </div>

            <div>
              <label
                htmlFor="proj-prazo"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
              >
                Prazo
              </label>
              <input
                id="proj-prazo"
                type="date"
                value={form.prazo}
                onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
                className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white focus:outline-none focus:border-navy/60"
              />
            </div>
          </div>

          <div className="flex-shrink-0">
            <div className="h-px bg-navy/15" />
            <div className="px-8 py-6 flex flex-col gap-3">
              {(isNovo ||
                projetoAtual?.status === "rascunho" ||
                projetoAtual?.status === "rejeitado") && (
                <button
                  onClick={() => handleSalvar(true)}
                  disabled={salvando || !form.titulo.trim()}
                  className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {salvando ? "Salvando..." : "Salvar e submeter para aprovação"}
                </button>
              )}
              <button
                onClick={() => handleSalvar(false)}
                disabled={salvando || !form.titulo.trim()}
                className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy border border-navy px-4 py-3 hover:bg-navy hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {salvando ? "Salvando..." : "Salvar rascunho"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
