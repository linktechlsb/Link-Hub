import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { supabase } from "@/lib/supabase";
import { KpiRow, SectionHeader } from "@/pages/home/v1/primitives";

import { CriarProjetoDialog } from "./CriarProjetoDialog";

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

type NovoForm = {
  titulo: string;
  descricao: string;
  prazo: string;
  liga_id: string;
  responsavel_id: string;
  impacto: string;
  professor_id: string;
  empresa_parceira: string;
  tipo_projeto: string;
};

type ProfessorAPI = { id: string; nome: string; email: string } | null;
type MembroAPI = { id: string; usuario_id: string; nome: string; cargo?: string; role?: string };

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

const FORM_VAZIO: NovoForm = {
  titulo: "",
  descricao: "",
  prazo: "",
  liga_id: "",
  responsavel_id: "",
  impacto: "",
  professor_id: "",
  empresa_parceira: "",
  tipo_projeto: "",
};

export function ProjetosStaffView({ abrirCriar }: { abrirCriar?: boolean }) {
  const { data: projetosData, refetch: refetchProjetos } =
    useCachedFetch<ProjetoAPI[]>("/api/projetos");
  const { data: ligasData } = useCachedFetch<LigaAPI[]>("/api/ligas");
  const projetos = projetosData ?? [];
  const ligas = ligasData ?? [];
  const [filtroLiga, setFiltroLiga] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [dialogCriar, setDialogCriar] = useState(false);
  const [sheetRevisar, setSheetRevisar] = useState<ProjetoAPI | null>(null);
  const [sheetNovo, setSheetNovo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [form, setForm] = useState<NovoForm>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [professorDaLiga, setProfessorDaLiga] = useState<ProfessorAPI>(null);
  const [membrosLiga, setMembrosLiga] = useState<MembroAPI[]>([]);
  const [modoEditar, setModoEditar] = useState(false);
  const [formEditar, setFormEditar] = useState<Partial<NovoForm>>({});

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

  async function handleEnviar() {
    if (!sheetRevisar) return;
    setSalvando(true);
    try {
      const token = await getToken();
      await fetch(`/api/projetos/${sheetRevisar.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "em_aprovacao" }),
      });
      setSheetRevisar(null);
      refetchProjetos();
    } finally {
      setSalvando(false);
    }
  }

  async function handleSalvarEdicao() {
    if (!sheetRevisar) return;
    setSalvando(true);
    try {
      const token = await getToken();
      await fetch(`/api/projetos/${sheetRevisar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          titulo: formEditar.titulo?.trim() || undefined,
          descricao: formEditar.descricao?.trim() || undefined,
          prazo: formEditar.prazo || undefined,
          impacto: formEditar.impacto?.trim() || undefined,
          empresa_parceira: formEditar.empresa_parceira?.trim() || undefined,
          tipo_projeto: formEditar.tipo_projeto || undefined,
        }),
      });
      setModoEditar(false);
      setSheetRevisar(null);
      refetchProjetos();
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => {
    if (abrirCriar) setDialogCriar(true);
  }, [abrirCriar]);

  useEffect(() => {
    if (!form.liga_id) {
      setProfessorDaLiga(null);
      setMembrosLiga([]);
      setForm((f) => ({ ...f, responsavel_id: "" }));
      return;
    }
    getToken().then((token) => {
      fetch(`/api/ligas/${form.liga_id}/professor`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data: ProfessorAPI) => {
          setProfessorDaLiga(data);
          setForm((f) => ({ ...f, professor_id: data?.id ?? "" }));
        })
        .catch(() => setProfessorDaLiga(null));

      fetch(`/api/ligas/${form.liga_id}/membros`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data: MembroAPI[]) => setMembrosLiga(Array.isArray(data) ? data : []))
        .catch(() => setMembrosLiga([]));
    });
    setForm((f) => ({ ...f, responsavel_id: "" }));
  }, [form.liga_id]);

  async function handleCriar() {
    if (!form.titulo.trim() || !form.liga_id || !form.responsavel_id) return;
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
          responsavel_id: form.responsavel_id,
          impacto: form.impacto.trim() || undefined,
          professor_id: form.professor_id || undefined,
          empresa_parceira: form.empresa_parceira.trim() || undefined,
          tipo_projeto: form.tipo_projeto || undefined,
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
                className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors"
              >
                + Novo Projeto
              </button>
            }
          />

          {/* Filtros */}
          <div className="flex gap-3 mb-6">
            <Select value={filtroLiga} onValueChange={(v) => setFiltroLiga(v === "all" ? "" : v)}>
              <SelectTrigger className="font-plex-sans text-[13px] w-auto min-w-[160px]">
                <SelectValue placeholder="Todas as ligas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-plex-sans text-[13px]">
                  Todas as ligas
                </SelectItem>
                {ligas.map((l) => (
                  <SelectItem key={l.id} value={l.id} className="font-plex-sans text-[13px]">
                    {l.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filtroStatus}
              onValueChange={(v) => setFiltroStatus(v === "all" ? "" : v)}
            >
              <SelectTrigger className="font-plex-sans text-[13px] w-auto min-w-[160px]">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-plex-sans text-[13px]">
                  Todos os status
                </SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="font-plex-sans text-[13px]">
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filtrados.length === 0 ? (
            <p className="font-plex-sans text-[13px] text-foreground/50">
              Nenhum projeto encontrado.
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-foreground/[0.08]">
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Projeto
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Liga
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Responsável
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Prazo
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Status
                  </th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p, idx) => {
                  const s = STATUS_CONFIG[p.status] ?? {
                    label: p.status,
                    className: "text-foreground/50",
                  };
                  const isLast = idx === filtrados.length - 1;
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-foreground/[0.03] transition-colors ${!isLast ? "border-b border-foreground/[0.06]" : ""}`}
                    >
                      <td className="py-4 px-4">
                        <span className="font-plex-sans text-[13px] text-foreground font-semibold">
                          {p.titulo}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                        {p.liga?.nome ?? "—"}
                      </td>
                      <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                        {responsavelNome(p)}
                      </td>
                      <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                        {p.prazo
                          ? new Date(p.prazo.slice(0, 10) + "T12:00:00").toLocaleDateString(
                              "pt-BR",
                              { day: "2-digit", month: "short" },
                            )
                          : "—"}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`font-plex-mono text-[12px] font-medium ${s.className}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => {
                            setMotivo("");
                            setSheetRevisar(p);
                          }}
                          className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-foreground/50 hover:text-foreground transition-colors"
                        >
                          Revisar →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <CriarProjetoDialog
        open={dialogCriar}
        onClose={() => setDialogCriar(false)}
        ligas={ligas}
        onCriado={refetchProjetos}
      />

      {/* Sheet — revisar projeto */}
      <Sheet
        open={!!sheetRevisar}
        onOpenChange={(o) => {
          if (!o) {
            setSheetRevisar(null);
            setModoEditar(false);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0 bg-white dark:bg-[#030303]"
        >
          <div className="flex-shrink-0">
            <div className="h-px bg-navy/90 dark:bg-white/20" />
            <div className="px-8 pt-8 pb-6">
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 dark:text-white/40">
                Projeto
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy dark:text-white mt-1">
                {sheetRevisar?.titulo}
              </h2>
            </div>
            <div className="h-px bg-navy/15 dark:bg-white/10" />
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {modoEditar ? (
              <>
                <div>
                  <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-2 block">
                    Título
                  </label>
                  <input
                    value={formEditar.titulo ?? ""}
                    onChange={(e) => setFormEditar((f) => ({ ...f, titulo: e.target.value }))}
                    className="w-full font-plex-sans text-[13px] text-navy dark:text-white border border-navy/20 dark:border-white/15 rounded px-3 py-2.5 bg-white dark:bg-white/5 focus:outline-none focus:border-navy/60 dark:focus:border-white/40"
                  />
                </div>
                <div>
                  <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-2 block">
                    Descrição
                  </label>
                  <textarea
                    value={formEditar.descricao ?? ""}
                    onChange={(e) => setFormEditar((f) => ({ ...f, descricao: e.target.value }))}
                    rows={3}
                    className="w-full font-plex-sans text-[13px] text-navy dark:text-white border border-navy/20 dark:border-white/15 rounded px-3 py-2.5 bg-white dark:bg-white/5 placeholder:text-navy/30 dark:placeholder:text-white/25 focus:outline-none focus:border-navy/60 dark:focus:border-white/40 resize-none"
                  />
                </div>
                <div>
                  <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-2 block">
                    Tipo de Projeto
                  </label>
                  <Select
                    value={formEditar.tipo_projeto || "__none__"}
                    onValueChange={(v) =>
                      setFormEditar((f) => ({ ...f, tipo_projeto: v === "__none__" ? "" : v }))
                    }
                  >
                    <SelectTrigger className="w-full border-navy/20 dark:border-white/15 rounded bg-white dark:bg-white/5 text-navy dark:text-white font-plex-sans text-[13px] focus:ring-0 focus:border-navy/60 dark:focus:border-white/40">
                      <SelectValue placeholder="Selecionar tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecionar tipo...</SelectItem>
                      <SelectItem value="iniciacao_cientifica">Iniciação Científica</SelectItem>
                      <SelectItem value="projeto_interno">Projeto Interno</SelectItem>
                      <SelectItem value="projeto_externo">
                        Projeto Externo (com parceiros)
                      </SelectItem>
                      <SelectItem value="projeto_estruturante">
                        Projeto Estruturante (Interdisciplinar e/ou Inovação)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-2 block">
                    Impacto Projetado/Realizado
                  </label>
                  <textarea
                    value={formEditar.impacto ?? ""}
                    onChange={(e) => setFormEditar((f) => ({ ...f, impacto: e.target.value }))}
                    rows={3}
                    className="w-full font-plex-sans text-[13px] text-navy dark:text-white border border-navy/20 dark:border-white/15 rounded px-3 py-2.5 bg-white dark:bg-white/5 placeholder:text-navy/30 dark:placeholder:text-white/25 focus:outline-none focus:border-navy/60 dark:focus:border-white/40 resize-none"
                  />
                </div>
                <div>
                  <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-2 block">
                    Empresa Parceira
                  </label>
                  <input
                    value={formEditar.empresa_parceira ?? ""}
                    onChange={(e) =>
                      setFormEditar((f) => ({ ...f, empresa_parceira: e.target.value }))
                    }
                    className="w-full font-plex-sans text-[13px] text-navy dark:text-white border border-navy/20 dark:border-white/15 rounded px-3 py-2.5 bg-white dark:bg-white/5 focus:outline-none focus:border-navy/60 dark:focus:border-white/40"
                  />
                </div>
                <div>
                  <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-2 block">
                    Prazo
                  </label>
                  <input
                    type="date"
                    value={formEditar.prazo ?? ""}
                    onChange={(e) => setFormEditar((f) => ({ ...f, prazo: e.target.value }))}
                    className="w-full font-plex-sans text-[13px] text-navy dark:text-white border border-navy/20 dark:border-white/15 rounded px-3 py-2.5 bg-white dark:bg-white/5 focus:outline-none focus:border-navy/60 dark:focus:border-white/40"
                  />
                </div>
              </>
            ) : (
              <>
                {sheetRevisar?.descricao && (
                  <div>
                    <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2">
                      Descrição
                    </p>
                    <p className="font-plex-sans text-[13px] text-navy/80 dark:text-white/70">
                      {sheetRevisar.descricao}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-1">
                      Liga
                    </p>
                    <p className="font-plex-sans text-[13px] text-navy dark:text-white">
                      {sheetRevisar?.liga?.nome ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-1">
                      Status
                    </p>
                    <p
                      className={`font-plex-sans text-[13px] font-medium ${STATUS_CONFIG[sheetRevisar?.status ?? ""]?.className ?? ""}`}
                    >
                      {STATUS_CONFIG[sheetRevisar?.status ?? ""]?.label ?? sheetRevisar?.status}
                    </p>
                  </div>
                  <div>
                    <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-1">
                      Prazo
                    </p>
                    <p className="font-plex-sans text-[13px] text-navy dark:text-white">
                      {sheetRevisar?.prazo
                        ? new Date(
                            sheetRevisar.prazo.slice(0, 10) + "T12:00:00",
                          ).toLocaleDateString("pt-BR")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-1">
                      Progresso
                    </p>
                    <p className="font-plex-sans text-[13px] text-navy dark:text-white">
                      {sheetRevisar?.percentual_concluido ?? 0}%
                    </p>
                  </div>
                </div>

                {sheetRevisar?.status === "em_aprovacao" && (
                  <div>
                    <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-3">
                      Motivo da recusa (se recusar)
                    </p>
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Descreva o motivo..."
                      rows={3}
                      className="w-full font-plex-sans text-[13px] text-navy dark:text-white border border-navy/20 dark:border-white/15 rounded px-3 py-2.5 bg-white dark:bg-white/5 placeholder:text-navy/30 dark:placeholder:text-white/25 focus:outline-none focus:border-navy/60 dark:focus:border-white/40 resize-none"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex-shrink-0">
            <div className="h-px bg-navy/15 dark:bg-white/10" />
            <div className="px-8 py-6 flex gap-3">
              {modoEditar ? (
                <>
                  <button
                    onClick={handleSalvarEdicao}
                    disabled={salvando}
                    className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy dark:bg-white dark:text-navy px-4 py-3 rounded hover:bg-navy/90 dark:hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {salvando ? "..." : "Salvar"}
                  </button>
                  <button
                    onClick={() => setModoEditar(false)}
                    disabled={salvando}
                    className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy dark:text-white border border-navy dark:border-white px-4 py-3 rounded hover:bg-navy hover:text-white dark:hover:bg-white dark:hover:text-navy transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                </>
              ) : sheetRevisar?.status === "em_aprovacao" ? (
                <>
                  <button
                    onClick={handleAprovar}
                    disabled={salvando}
                    className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy dark:bg-white dark:text-navy px-4 py-3 rounded hover:bg-navy/90 dark:hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {salvando ? "..." : "Aprovar"}
                  </button>
                  <button
                    onClick={handleRecusar}
                    disabled={salvando || !motivo.trim()}
                    className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy dark:text-white border border-navy dark:border-white px-4 py-3 rounded hover:bg-navy hover:text-white dark:hover:bg-white dark:hover:text-navy transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {salvando ? "..." : "Recusar"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setFormEditar({
                        titulo: sheetRevisar?.titulo ?? "",
                        descricao: sheetRevisar?.descricao ?? "",
                        prazo: sheetRevisar?.prazo?.slice(0, 10) ?? "",
                        impacto: "",
                        empresa_parceira: "",
                        tipo_projeto: "",
                      });
                      setModoEditar(true);
                    }}
                    className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy dark:text-white border border-navy dark:border-white px-4 py-3 rounded hover:bg-navy hover:text-white dark:hover:bg-white dark:hover:text-navy transition-colors"
                  >
                    Editar
                  </button>
                  {sheetRevisar?.status === "rascunho" && (
                    <button
                      onClick={handleEnviar}
                      disabled={salvando}
                      className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy dark:bg-white dark:text-navy px-4 py-3 rounded hover:bg-navy/90 dark:hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {salvando ? "..." : "Enviar"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet — novo projeto */}
      <Sheet
        open={sheetNovo}
        onOpenChange={(o) => {
          if (!o) setSheetNovo(false);
        }}
      >
        <SheetContent side="right" className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0">
          <div className="flex-shrink-0">
            <div className="h-px bg-foreground/20" />
            <div className="px-8 pt-8 pb-6">
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40">
                Novo
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-foreground mt-1">
                Adicionar projeto
              </h2>
            </div>
            <div className="h-px bg-foreground/[0.08]" />
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
            <div>
              <label
                htmlFor="novo-titulo"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
              >
                Título
              </label>
              <input
                id="novo-titulo"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Projeto de Marketing"
                className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
              />
            </div>

            <div>
              <label
                htmlFor="novo-liga"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
              >
                Liga
              </label>
              <Select
                value={form.liga_id || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, liga_id: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger id="novo-liga" className="w-full font-plex-sans text-[13px]">
                  <SelectValue placeholder="Selecionar liga..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecionar liga...</SelectItem>
                  {ligas.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="font-plex-sans text-[13px]">
                      {l.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                htmlFor="novo-responsavel"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
              >
                Responsável
              </label>
              <Select
                value={form.responsavel_id || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, responsavel_id: v === "__none__" ? "" : v }))
                }
                disabled={!form.liga_id}
              >
                <SelectTrigger id="novo-responsavel" className="w-full font-plex-sans text-[13px]">
                  <SelectValue
                    placeholder={
                      !form.liga_id ? "Selecione uma liga primeiro" : "Selecionar responsável..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="font-plex-sans text-[13px]">
                    {!form.liga_id ? "Selecione uma liga primeiro" : "Selecionar responsável..."}
                  </SelectItem>
                  {membrosLiga.map((m) => (
                    <SelectItem
                      key={m.usuario_id}
                      value={m.usuario_id}
                      className="font-plex-sans text-[13px]"
                    >
                      {m.nome}
                      {m.role ? ` — ${m.role}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                htmlFor="novo-tipo"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
              >
                Tipo de Projeto
              </label>
              <Select
                value={form.tipo_projeto || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, tipo_projeto: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger id="novo-tipo" className="w-full font-plex-sans text-[13px]">
                  <SelectValue placeholder="Selecionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="font-plex-sans text-[13px]">
                    Selecionar tipo...
                  </SelectItem>
                  <SelectItem value="iniciacao_cientifica" className="font-plex-sans text-[13px]">
                    Iniciação Científica
                  </SelectItem>
                  <SelectItem value="projeto_interno" className="font-plex-sans text-[13px]">
                    Projeto Interno
                  </SelectItem>
                  <SelectItem value="projeto_externo" className="font-plex-sans text-[13px]">
                    Projeto Externo (com parceiros)
                  </SelectItem>
                  <SelectItem value="projeto_estruturante" className="font-plex-sans text-[13px]">
                    Projeto Estruturante (Interdisciplinar e/ou Inovação)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                htmlFor="novo-professor"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
              >
                Professor Mentor Alocado
              </label>
              <Select
                value={form.professor_id || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, professor_id: v === "__none__" ? "" : v }))
                }
                disabled={!form.liga_id || !professorDaLiga}
              >
                <SelectTrigger id="novo-professor" className="w-full font-plex-sans text-[13px]">
                  <SelectValue
                    placeholder={
                      !form.liga_id
                        ? "Selecione uma liga primeiro"
                        : professorDaLiga
                          ? "Nenhum"
                          : "Nenhum professor na liga"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="font-plex-sans text-[13px]">
                    {!form.liga_id ? "Selecione uma liga primeiro" : "Nenhum"}
                  </SelectItem>
                  {professorDaLiga && (
                    <SelectItem value={professorDaLiga.id} className="font-plex-sans text-[13px]">
                      {professorDaLiga.nome}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                htmlFor="novo-descricao"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
              >
                Descrição
              </label>
              <textarea
                id="novo-descricao"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva o projeto..."
                rows={3}
                className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 resize-none rounded"
              />
            </div>

            <div>
              <label
                htmlFor="novo-impacto"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
              >
                Impacto Projetado/Realizado
              </label>
              <textarea
                id="novo-impacto"
                value={form.impacto}
                onChange={(e) => setForm((f) => ({ ...f, impacto: e.target.value }))}
                placeholder="Descreva o impacto esperado ou realizado..."
                rows={3}
                className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 resize-none rounded"
              />
            </div>

            <div>
              <label
                htmlFor="novo-empresa"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
              >
                Empresa Parceira Envolvida
              </label>
              <input
                id="novo-empresa"
                value={form.empresa_parceira}
                onChange={(e) => setForm((f) => ({ ...f, empresa_parceira: e.target.value }))}
                placeholder="Ex: Empresa XYZ"
                className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
              />
            </div>

            <div>
              <label
                htmlFor="novo-prazo"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
              >
                Prazo
              </label>
              <input
                id="novo-prazo"
                type="date"
                value={form.prazo}
                onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
                className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 focus:outline-none focus:border-foreground/30 rounded"
              />
            </div>
          </div>

          <div className="flex-shrink-0">
            <div className="h-px bg-foreground/[0.08]" />
            <div className="px-8 py-6 flex flex-col gap-3">
              <button
                onClick={handleCriar}
                disabled={salvando || !form.titulo.trim() || !form.liga_id || !form.responsavel_id}
                className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-[#10244D] px-4 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {salvando ? "Salvando..." : "Criar projeto"}
              </button>
              <button
                onClick={() => setSheetNovo(false)}
                disabled={salvando}
                className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/20 px-4 py-3 rounded-full hover:bg-foreground/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
