import {
  CheckCircle2,
  Clock,
  FolderKanban,
  ListChecks,
  Pencil,
  Plus,
  Send,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormSheet } from "@/components/ui/form-sheet";
import { Input } from "@/components/ui/input";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { supabase } from "@/lib/supabase";
import { DashboardCard } from "@/pages/home/components/DashboardCard";
import { StatStrip } from "@/pages/ligas/tabs/primitives";

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
  motivo_recusa?: string;
  responsavel_id?: string;
  responsavel_nome?: string;
  responsavel?: { nome: string };
  liga?: { id: string; nome: string };
};

type MembroAPI = { id: string; usuario_id: string; nome: string };

type ProfessorAPI = { id: string; nome: string; email: string } | null;

type CategoriaAPI = { id: string; nome: string; liga_id?: string | null };

type MinhaLiga = { id: string; nome: string };

type LigaAPI = { id: string; nome: string };

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

type ProjetoForm = {
  titulo: string;
  descricao: string;
  prazo: string;
  responsavel_id: string;
  receita_estimada: string;
  impacto: string;
  professor_id: string;
  empresa_parceira: string;
  tipo_projeto: string;
  categoria_id: string;
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
  impacto: "",
  professor_id: "",
  empresa_parceira: "",
  tipo_projeto: "",
  categoria_id: "",
};

export function ProjetosLiderView({ abrirCriar }: { abrirCriar?: boolean }) {
  const navigate = useNavigate();
  const { data: liga, carregando: carregandoLiga } = useCachedFetch<MinhaLiga>("/api/ligas/minha");
  const ligaId = liga?.id ?? null;
  const {
    data: projetosData,
    carregando: carregandoProjetos,
    refetch: refetchProjetos,
  } = useCachedFetch<ProjetoAPI[]>(ligaId ? `/api/ligas/${ligaId}/projetos` : null);
  const { data: membrosData } = useCachedFetch<MembroAPI[]>(
    ligaId ? `/api/ligas/${ligaId}/membros` : null,
  );
  const { data: todosProjetosData, carregando: carregandoTodos } =
    useCachedFetch<ProjetoAPI[]>("/api/projetos");
  const { data: ligasData } = useCachedFetch<LigaAPI[]>("/api/ligas");
  const projetos = projetosData ?? [];
  const membros = membrosData ?? [];
  const todosProjetos = (todosProjetosData ?? []).filter((p) => p.status !== "rascunho");
  const ligas = ligasData ?? [];
  const [filtroLiga, setFiltroLiga] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [aba, setAba] = useState<"liga" | "todos">("liga");

  const filtrados = todosProjetos.filter((p) => {
    if (filtroLiga && p.liga?.id !== filtroLiga) return false;
    if (filtroStatus && p.status !== filtroStatus) return false;
    return true;
  });
  const [dialogCriar, setDialogCriar] = useState(false);
  const [sheetProjeto, setSheetProjeto] = useState<ProjetoAPI | "novo" | null>(null);
  const [form, setForm] = useState<ProjetoForm>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [submetendo, setSubmetendo] = useState<string | null>(null);
  const [concluindo, setConcluindo] = useState<string | null>(null);
  const [confirmarConclusao, setConfirmarConclusao] = useState<ProjetoAPI | null>(null);
  const [professorDaLiga, setProfessorDaLiga] = useState<ProfessorAPI>(null);
  const [categorias, setCategorias] = useState<CategoriaAPI[]>([]);

  useEffect(() => {
    if (abrirCriar && ligaId) setDialogCriar(true);
  }, [abrirCriar, ligaId]);

  useEffect(() => {
    if (!ligaId) return;
    getToken().then((token) =>
      fetch(`/api/categorias-projeto?liga_id=${ligaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data: CategoriaAPI[]) => setCategorias(Array.isArray(data) ? data : []))
        .catch(() => setCategorias([])),
    );
  }, [ligaId]);

  useEffect(() => {
    if (!ligaId) return;
    getToken().then((token) =>
      fetch(`/api/ligas/${ligaId}/professor`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data: ProfessorAPI) => {
          setProfessorDaLiga(data);
          if (data?.id) setForm((f) => ({ ...f, professor_id: data.id }));
        })
        .catch(() => setProfessorDaLiga(null)),
    );
  }, [ligaId]);

  const kpis = [
    { icon: FolderKanban, label: "Total da liga", value: String(projetos.length) },
    {
      icon: Clock,
      label: "Em aprovação",
      value: String(projetos.filter((p) => p.status === "em_aprovacao").length),
    },
    {
      icon: CheckCircle2,
      label: "Concluídos (liga)",
      value: String(projetos.filter((p) => p.status === "concluido").length),
    },
    {
      icon: Trophy,
      label: "Concluídos (total)",
      value: String(todosProjetos.filter((p) => p.status === "concluido").length),
    },
  ];

  function abrirEditar(p: ProjetoAPI) {
    setForm({
      titulo: p.titulo,
      descricao: p.descricao ?? "",
      prazo: p.prazo ?? "",
      responsavel_id: p.responsavel_id ?? "",
      receita_estimada: "",
      impacto: "",
      professor_id: professorDaLiga?.id ?? "",
      empresa_parceira: "",
      tipo_projeto: "",
      categoria_id: "",
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
        responsavel_id:
          form.responsavel_id && form.responsavel_id !== "none" ? form.responsavel_id : undefined,
        liga_id: liga.id,
        impacto: form.impacto.trim() || undefined,
        professor_id:
          form.professor_id && form.professor_id !== "none" ? form.professor_id : undefined,
        empresa_parceira: form.empresa_parceira.trim() || undefined,
        tipo_projeto: form.tipo_projeto || undefined,
        categoria_id: form.categoria_id || undefined,
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

  async function handleConcluir(id: string) {
    if (!liga) return;
    setConcluindo(id);
    try {
      const token = await getToken();
      await fetch(`/api/projetos/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "concluido" }),
      });
      refetchProjetos();
    } finally {
      setConcluindo(null);
      setConfirmarConclusao(null);
    }
  }

  const nomeMembro = (id: string) => membros.find((m) => m.usuario_id === id)?.nome ?? "—";
  const responsavelNome = (p: ProjetoAPI) =>
    p.responsavel_nome ??
    p.responsavel?.nome ??
    (p.responsavel_id ? nomeMembro(p.responsavel_id) : "—");

  const isNovo = sheetProjeto === "novo";
  const projetoAtual = isNovo ? null : (sheetProjeto as ProjetoAPI | null);

  const carregandoAbaLiga = carregandoLiga || carregandoProjetos;

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      {/* Cabeçalho */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Projetos</h1>
          <p className="mt-1 text-sm text-foreground/50">{liga?.nome ?? "Minha liga"}</p>
        </div>
        {aba === "liga" && (
          <button
            onClick={abrirNovo}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo projeto
          </button>
        )}
      </div>

      <div className="space-y-8">
        {!carregandoAbaLiga && <StatStrip items={kpis} />}

        <AnimatedTabs
          tabs={[
            { id: "liga", label: "Da liga" },
            { id: "todos", label: "Todos os projetos" },
          ]}
          activeTab={aba}
          onChange={(id) => setAba(id as typeof aba)}
          tabClassName="px-0 py-3"
          innerClassName="gap-6"
          wrapperClassName="border-border"
          activeTabClassName="text-foreground"
          inactiveTabClassName="text-foreground/40 hover:text-foreground"
          indicatorClassName="bg-foreground"
        />

        {aba === "liga" &&
          (carregandoAbaLiga ? (
            <TabelaProjetosSkeleton />
          ) : projetos.length === 0 ? (
            <p className="text-sm text-foreground/50">Nenhum projeto cadastrado.</p>
          ) : (
            <DashboardCard className="overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {["Projeto", "Responsável", "Prazo", "Status", ""].map((h, i) => (
                      <th key={h || i} className={TH_CLASS}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projetos.map((p) => {
                    const s = STATUS_CONFIG[p.status] ?? {
                      label: p.status,
                      className: "text-foreground/50",
                    };
                    const podSubmeter = p.status === "rascunho" || p.status === "rejeitado";
                    const podConcluir = p.status === "aprovado" || p.status === "em_andamento";
                    return (
                      <tr key={p.id} className={ROW_CLASS}>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-foreground">{p.titulo}</span>
                          {p.status === "rejeitado" && p.motivo_recusa && (
                            <p className="mt-0.5 text-xs text-red-600 dark:text-red-300">
                              {p.motivo_recusa}
                            </p>
                          )}
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
                        <td className="px-4 py-3 text-right">
                          <RowActionsMenu
                            ariaLabel="Opções do projeto"
                            actions={[
                              {
                                label: "Milestones",
                                icon: ListChecks,
                                onSelect: () => navigate(`/projetos/${p.id}`),
                              },
                              { label: "Editar", icon: Pencil, onSelect: () => abrirEditar(p) },
                              ...(podSubmeter
                                ? [
                                    {
                                      label: submetendo === p.id ? "Submetendo..." : "Submeter",
                                      icon: Send,
                                      disabled: submetendo === p.id,
                                      onSelect: () => handleSubmeter(p.id),
                                    },
                                  ]
                                : []),
                              ...(podConcluir
                                ? [
                                    {
                                      label: concluindo === p.id ? "Concluindo..." : "Concluir",
                                      icon: CheckCircle2,
                                      disabled: concluindo === p.id,
                                      className:
                                        "text-emerald-600 focus:text-emerald-700 dark:text-emerald-300",
                                      onSelect: () => setConfirmarConclusao(p),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DashboardCard>
          ))}

        {aba === "todos" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Select value={filtroLiga} onValueChange={(v) => setFiltroLiga(v === "all" ? "" : v)}>
                <SelectTrigger className="w-auto min-w-[160px] text-sm">
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
                <SelectTrigger className="w-auto min-w-[160px] text-sm">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">
                    Todos os status
                  </SelectItem>
                  {Object.entries(STATUS_CONFIG)
                    .filter(([k]) => k !== "rascunho")
                    .map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-sm">
                        {v.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {carregandoTodos ? (
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
                            <button
                              onClick={() => navigate(`/projetos/${p.id}`)}
                              className={ACAO_CLASS}
                            >
                              Milestones
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DashboardCard>
            )}
          </div>
        )}
      </div>

      <CriarProjetoDialog
        open={dialogCriar}
        onClose={() => setDialogCriar(false)}
        ligaId={ligaId ?? undefined}
        onCriado={refetchProjetos}
      />

      <AlertDialog
        open={confirmarConclusao !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmarConclusao(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirmar a conclusão de <strong>{confirmarConclusao?.titulo}</strong>? O projeto será
              contabilizado no ranking da liga e não exigirá aprovação de professor ou staff.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={concluindo !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={concluindo !== null}
              onClick={(e) => {
                e.preventDefault();
                if (confirmarConclusao) handleConcluir(confirmarConclusao.id);
              }}
            >
              {concluindo ? "Concluindo..." : "Confirmar conclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sheet — criar / editar projeto */}
      <FormSheet
        open={sheetProjeto !== null}
        onOpenChange={(o) => {
          if (!o) setSheetProjeto(null);
        }}
        eyebrow={isNovo ? "Novo" : "Editar"}
        title={isNovo ? "Adicionar projeto" : projetoAtual?.titulo}
        footer={
          <>
            {(isNovo ||
              projetoAtual?.status === "rascunho" ||
              projetoAtual?.status === "rejeitado") && (
              <button
                onClick={() => handleSalvar(true)}
                disabled={salvando || !form.titulo.trim()}
                className="w-full rounded-full bg-[#10244D] px-4 py-3 font-plex-mono text-[11px] uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-[#10244D]"
              >
                {salvando ? "Salvando..." : "Salvar e submeter para aprovação"}
              </button>
            )}
            <button
              onClick={() => handleSalvar(false)}
              disabled={salvando || !form.titulo.trim()}
              className="w-full rounded-full border border-foreground/20 px-4 py-3 font-plex-mono text-[11px] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-foreground/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {salvando ? "Salvando..." : "Salvar rascunho"}
            </button>
          </>
        }
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="proj-titulo" className={LABEL_CLASS}>
              Título
            </FieldLabel>
            <Input
              id="proj-titulo"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="Nome do projeto"
              className={INPUT_CLASS}
            />
          </Field>

          <Field>
            <FieldLabel className={LABEL_CLASS}>Responsável</FieldLabel>
            <Select
              value={form.responsavel_id}
              onValueChange={(v) => setForm((f) => ({ ...f, responsavel_id: v }))}
            >
              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-[13px]">
                  Nenhum
                </SelectItem>
                {membros.map((m) => (
                  <SelectItem key={m.usuario_id} value={m.usuario_id} className="text-[13px]">
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel className={LABEL_CLASS}>Tipo de Projeto</FieldLabel>
            <Select
              value={form.tipo_projeto}
              onValueChange={(v) => setForm((f) => ({ ...f, tipo_projeto: v }))}
            >
              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder="Selecionar tipo..." />
              </SelectTrigger>
              <SelectContent>
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
            <FieldLabel htmlFor="proj-descricao" className={LABEL_CLASS}>
              Descrição
            </FieldLabel>
            <textarea
              id="proj-descricao"
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Descreva o projeto..."
              rows={3}
              className={TEXTAREA_CLASS}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="proj-impacto" className={LABEL_CLASS}>
              Impacto Projetado/Realizado
            </FieldLabel>
            <textarea
              id="proj-impacto"
              value={form.impacto}
              onChange={(e) => setForm((f) => ({ ...f, impacto: e.target.value }))}
              placeholder="Descreva o impacto esperado ou realizado..."
              rows={3}
              className={TEXTAREA_CLASS}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="proj-empresa" className={LABEL_CLASS}>
              Empresa Parceira Envolvida
            </FieldLabel>
            <Input
              id="proj-empresa"
              value={form.empresa_parceira}
              onChange={(e) => setForm((f) => ({ ...f, empresa_parceira: e.target.value }))}
              placeholder="Ex: Empresa XYZ"
              className={INPUT_CLASS}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="proj-prazo" className={LABEL_CLASS}>
              Prazo
            </FieldLabel>
            <Input
              id="proj-prazo"
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
