import { CheckCircle2, Clock, FolderKanban, Plus, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormSheet } from "@/components/ui/form-sheet";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { supabase } from "@/lib/supabase";
import { DashboardCard } from "@/pages/home/components/DashboardCard";
import { StatStrip, TabSection } from "@/pages/ligas/tabs/primitives";

import { CriarProjetoDialog } from "./CriarProjetoDialog";
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
  categoria_id: string;
};

type ProfessorAPI = { id: string; nome: string; email: string } | null;
type MembroAPI = { id: string; usuario_id: string; nome: string; cargo?: string; role?: string };
type CategoriaAPI = { id: string; nome: string; liga_id?: string | null };

const TH_CLASS =
  "px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-foreground/40";
const ROW_CLASS =
  "border-b border-border transition-colors last:border-0 hover:bg-foreground/[0.03]";
const ACAO_CLASS = "text-xs text-foreground/50 transition-colors hover:text-foreground";
const LABEL_CLASS = "font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40";
const INPUT_CLASS =
  "border-border bg-muted/50 text-[13px] text-foreground placeholder:text-foreground/20";
const SELECT_TRIGGER_CLASS = "w-full text-[13px]";
const TEXTAREA_CLASS =
  "w-full resize-none rounded border border-border bg-muted/50 px-3 py-2.5 text-[13px] text-foreground placeholder:text-foreground/20 focus:border-foreground/30 focus:outline-none";

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
  categoria_id: "",
};

export function ProjetosStaffView({ abrirCriar }: { abrirCriar?: boolean }) {
  const navigate = useNavigate();
  const {
    data: projetosData,
    carregando,
    refetch: refetchProjetos,
  } = useCachedFetch<ProjetoAPI[]>("/api/projetos");
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
  const [membrosLiga, setMembrosLiga] = useState<MembroAPI[]>([]);
  const [modoEditar, setModoEditar] = useState(false);
  const [formEditar, setFormEditar] = useState<Partial<NovoForm>>({});
  const [categorias, setCategorias] = useState<CategoriaAPI[]>([]);

  const filtrados = projetos.filter((p) => {
    if (filtroLiga && p.liga?.id !== filtroLiga) return false;
    if (filtroStatus && p.status !== filtroStatus) return false;
    return true;
  });

  const kpis = [
    { icon: FolderKanban, label: "Total projetos", value: String(projetos.length) },
    {
      icon: Clock,
      label: "Em aprovação",
      value: String(projetos.filter((p) => p.status === "em_aprovacao").length),
    },
    {
      icon: CheckCircle2,
      label: "Aprovados",
      value: String(
        projetos.filter((p) => ["aprovado", "em_andamento", "concluido"].includes(p.status)).length,
      ),
    },
    {
      icon: XCircle,
      label: "Recusados",
      value: String(projetos.filter((p) => p.status === "rejeitado").length),
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
      setMembrosLiga([]);
      setForm((f) => ({ ...f, responsavel_id: "", professor_id: "" }));
      return;
    }
    getToken().then((token) => {
      // O projeto sempre é salvo com o professor da própria liga.
      fetch(`/api/ligas/${form.liga_id}/professor`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data: ProfessorAPI) => {
          setForm((f) => ({ ...f, professor_id: data?.id ?? "" }));
        })
        .catch(() => setForm((f) => ({ ...f, professor_id: "" })));

      fetch(`/api/ligas/${form.liga_id}/membros`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data: MembroAPI[]) => setMembrosLiga(Array.isArray(data) ? data : []))
        .catch(() => setMembrosLiga([]));
    });
    setForm((f) => ({ ...f, responsavel_id: "" }));
  }, [form.liga_id]);

  useEffect(() => {
    if (!form.liga_id) {
      setCategorias([]);
      return;
    }
    getToken().then((token) =>
      fetch(`/api/categorias-projeto?liga_id=${form.liga_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data: CategoriaAPI[]) => setCategorias(Array.isArray(data) ? data : []))
        .catch(() => setCategorias([])),
    );
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
          categoria_id: form.categoria_id || undefined,
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
    <div className="mx-auto max-w-6xl px-8 py-10">
      {/* Cabeçalho */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Projetos</h1>
          <p className="mt-1 text-sm text-foreground/50">Gestão de todos os projetos das ligas</p>
        </div>
        <button
          onClick={() => {
            setForm(FORM_VAZIO);
            setSheetNovo(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo projeto
        </button>
      </div>

      <div className="space-y-8">
        {!carregando && <StatStrip items={kpis} />}

        <TabSection
          titulo="Todos os projetos"
          acao={
            <div className="flex gap-2">
              <Select value={filtroLiga} onValueChange={(v) => setFiltroLiga(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9 w-auto min-w-[150px] text-sm">
                  <SelectValue placeholder="Todas as ligas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">
                    Todas as ligas
                  </SelectItem>
                  {ligas.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-sm">
                      {l.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filtroStatus}
                onValueChange={(v) => setFiltroStatus(v === "all" ? "" : v)}
              >
                <SelectTrigger className="h-9 w-auto min-w-[150px] text-sm">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">
                    Todos os status
                  </SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-sm">
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        >
          {carregando ? (
            <TabelaProjetosSkeleton />
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-foreground/50">Nenhum projeto encontrado.</p>
          ) : (
            <DashboardCard className="overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {["Projeto", "Liga", "Responsável", "Prazo", "Status", ""].map((h, i) => (
                      <th key={h || i} className={TH_CLASS}>
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
                      <tr key={p.id} className={ROW_CLASS}>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-foreground">{p.titulo}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground/60">
                          {p.liga?.nome ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground/60">
                          {responsavelNome(p)}
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
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => navigate(`/projetos/${p.id}`)}
                              className={ACAO_CLASS}
                            >
                              Milestones
                            </button>
                            <button
                              onClick={() => {
                                setMotivo("");
                                setSheetRevisar(p);
                              }}
                              className={ACAO_CLASS}
                            >
                              Revisar →
                            </button>
                          </div>
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
          className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0 bg-background"
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
      <FormSheet
        open={sheetNovo}
        onOpenChange={(o) => {
          if (!o) setSheetNovo(false);
        }}
        eyebrow="Novo"
        title="Adicionar projeto"
        footer={
          <>
            <button
              onClick={handleCriar}
              disabled={salvando || !form.titulo.trim() || !form.liga_id || !form.responsavel_id}
              className="w-full rounded-full bg-[#10244D] px-4 py-3 font-plex-mono text-[11px] uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {salvando ? "Salvando..." : "Criar projeto"}
            </button>
            <button
              onClick={() => setSheetNovo(false)}
              disabled={salvando}
              className="w-full rounded-full border border-foreground/20 px-4 py-3 font-plex-mono text-[11px] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-foreground/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancelar
            </button>
          </>
        }
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="novo-titulo" className={LABEL_CLASS}>
              Título
            </FieldLabel>
            <Input
              id="novo-titulo"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex: Projeto de Marketing"
              className={INPUT_CLASS}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="novo-liga" className={LABEL_CLASS}>
              Liga
            </FieldLabel>
            <Select
              value={form.liga_id || "__none__"}
              onValueChange={(v) => setForm((f) => ({ ...f, liga_id: v === "__none__" ? "" : v }))}
            >
              <SelectTrigger id="novo-liga" className={SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder="Selecionar liga..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Selecionar liga...</SelectItem>
                {ligas.map((l) => (
                  <SelectItem key={l.id} value={l.id} className="text-[13px]">
                    {l.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="novo-responsavel" className={LABEL_CLASS}>
              Responsável
            </FieldLabel>
            <Select
              value={form.responsavel_id || "__none__"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, responsavel_id: v === "__none__" ? "" : v }))
              }
              disabled={!form.liga_id}
            >
              <SelectTrigger id="novo-responsavel" className={SELECT_TRIGGER_CLASS}>
                <SelectValue
                  placeholder={
                    !form.liga_id ? "Selecione uma liga primeiro" : "Selecionar responsável..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-[13px]">
                  {!form.liga_id ? "Selecione uma liga primeiro" : "Selecionar responsável..."}
                </SelectItem>
                {membrosLiga.map((m) => (
                  <SelectItem key={m.usuario_id} value={m.usuario_id} className="text-[13px]">
                    {m.nome}
                    {m.role ? ` — ${m.role}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="novo-tipo" className={LABEL_CLASS}>
              Tipo de Projeto
            </FieldLabel>
            <Select
              value={form.tipo_projeto || "__none__"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, tipo_projeto: v === "__none__" ? "" : v }))
              }
            >
              <SelectTrigger id="novo-tipo" className={SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder="Selecionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-[13px]">
                  Selecionar tipo...
                </SelectItem>
                <SelectItem value="iniciacao_cientifica" className="text-[13px]">
                  Iniciação Científica
                </SelectItem>
                <SelectItem value="projeto_interno" className="text-[13px]">
                  Projeto Interno
                </SelectItem>
                <SelectItem value="projeto_externo" className="text-[13px]">
                  Projeto Externo (com parceiros)
                </SelectItem>
                <SelectItem value="projeto_estruturante" className="text-[13px]">
                  Projeto Estruturante (Interdisciplinar e/ou Inovação)
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel className={LABEL_CLASS}>Categoria</FieldLabel>
            <Select
              value={form.categoria_id || "__none__"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, categoria_id: v === "__none__" ? "" : v }))
              }
              disabled={!form.liga_id}
            >
              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder="Selecionar categoria..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-[13px]">
                  Selecionar categoria...
                </SelectItem>
                {categorias.filter((c) => !c.liga_id).length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="font-plex-mono text-[9px] uppercase tracking-[0.16em] text-foreground/30">
                      Categorias Base
                    </SelectLabel>
                    {categorias
                      .filter((c) => !c.liga_id)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-[13px]">
                          {c.nome}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                )}
                {categorias.filter((c) => c.liga_id).length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="font-plex-mono text-[9px] uppercase tracking-[0.16em] text-foreground/30">
                      Categorias da Liga
                    </SelectLabel>
                    {categorias
                      .filter((c) => c.liga_id)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-[13px]">
                          {c.nome}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="novo-descricao" className={LABEL_CLASS}>
              Descrição
            </FieldLabel>
            <textarea
              id="novo-descricao"
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Descreva o projeto..."
              rows={3}
              className={TEXTAREA_CLASS}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="novo-impacto" className={LABEL_CLASS}>
              Impacto Projetado/Realizado
            </FieldLabel>
            <textarea
              id="novo-impacto"
              value={form.impacto}
              onChange={(e) => setForm((f) => ({ ...f, impacto: e.target.value }))}
              placeholder="Descreva o impacto esperado ou realizado..."
              rows={3}
              className={TEXTAREA_CLASS}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="novo-empresa" className={LABEL_CLASS}>
              Empresa Parceira Envolvida
            </FieldLabel>
            <Input
              id="novo-empresa"
              value={form.empresa_parceira}
              onChange={(e) => setForm((f) => ({ ...f, empresa_parceira: e.target.value }))}
              placeholder="Ex: Empresa XYZ"
              className={INPUT_CLASS}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="novo-prazo" className={LABEL_CLASS}>
              Prazo
            </FieldLabel>
            <Input
              id="novo-prazo"
              type="date"
              value={form.prazo}
              onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
              className={INPUT_CLASS}
            />
          </Field>
        </FieldGroup>
      </FormSheet>
    </div>
  );
}
