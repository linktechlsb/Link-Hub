import { useEffect, useState } from "react";

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
  motivo_recusa?: string;
  responsavel_id?: string;
  responsavel_nome?: string;
  responsavel?: { nome: string };
  liga?: { id: string; nome: string };
};

type MembroAPI = { id: string; usuario_id: string; nome: string };

type ProfessorAPI = { id: string; nome: string; email: string } | null;

type MinhaLiga = { id: string; nome: string };

type LigaAPI = { id: string; nome: string };

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
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "text-foreground/40" },
  em_aprovacao: { label: "Em aprovação", className: "text-amber-600" },
  aprovado: { label: "Aprovado", className: "text-blue-600" },
  rejeitado: { label: "Rejeitado", className: "text-red-600" },
  em_andamento: { label: "Em andamento", className: "text-blue-600" },
  concluido: { label: "Concluído", className: "text-green-600" },
  cancelado: { label: "Cancelado", className: "text-foreground/30" },
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
};

export function ProjetosLiderView({ abrirCriar }: { abrirCriar?: boolean }) {
  const { data: liga } = useCachedFetch<MinhaLiga>("/api/ligas/minha");
  const ligaId = liga?.id ?? null;
  const { data: projetosData, refetch: refetchProjetos } = useCachedFetch<ProjetoAPI[]>(
    ligaId ? `/api/ligas/${ligaId}/projetos` : null,
  );
  const { data: membrosData } = useCachedFetch<MembroAPI[]>(
    ligaId ? `/api/ligas/${ligaId}/membros` : null,
  );
  const { data: todosProjetosData } = useCachedFetch<ProjetoAPI[]>("/api/projetos");
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

  useEffect(() => {
    if (abrirCriar && ligaId) setDialogCriar(true);
  }, [abrirCriar, ligaId]);

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
    { label: "Total da liga", valor: String(projetos.length) },
    {
      label: "Em aprovação",
      valor: String(projetos.filter((p) => p.status === "em_aprovacao").length),
    },
    {
      label: "Concluídos (liga)",
      valor: String(projetos.filter((p) => p.status === "concluido").length),
    },
    {
      label: "Concluídos (total)",
      valor: String(todosProjetos.filter((p) => p.status === "concluido").length),
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
            titulo={aba === "liga" ? "Projetos da Liga" : "Todos os Projetos"}
            tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue dark:text-white"
            acao={
              aba === "liga" ? (
                <button
                  onClick={abrirNovo}
                  className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors"
                >
                  + Novo Projeto
                </button>
              ) : null
            }
          />

          <AnimatedTabs
            tabs={[
              { id: "liga", label: "Da Liga" },
              { id: "todos", label: "Todos os Projetos" },
            ]}
            activeTab={aba}
            onChange={(id) => setAba(id as typeof aba)}
            wrapperClassName="border-foreground/[0.08] mb-6"
            innerClassName="gap-6"
            tabClassName="px-0 py-3"
            activeTabClassName="text-foreground"
            inactiveTabClassName="text-foreground/40 hover:text-foreground"
            indicatorClassName="bg-foreground"
          />

          {aba === "liga" &&
            (projetos.length === 0 ? (
              <p className="font-plex-sans text-[13px] text-foreground/50">
                Nenhum projeto cadastrado.
              </p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-foreground/[0.08]">
                    <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                      Projeto
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
                  {projetos.map((p, idx) => {
                    const s = STATUS_CONFIG[p.status] ?? {
                      label: p.status,
                      className: "text-foreground/50",
                    };
                    const podSubmeter = p.status === "rascunho" || p.status === "rejeitado";
                    const podConcluir = p.status === "aprovado" || p.status === "em_andamento";
                    const isLast = idx === projetos.length - 1;
                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-foreground/[0.03] transition-colors ${!isLast ? "border-b border-foreground/[0.06]" : ""}`}
                      >
                        <td className="py-4 px-4">
                          <span className="font-plex-sans text-[13px] text-foreground font-semibold">
                            {p.titulo}
                          </span>
                          {p.status === "rejeitado" && p.motivo_recusa && (
                            <p className="font-plex-mono text-[10px] text-red-500 mt-0.5">
                              {p.motivo_recusa}
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                          {responsavelNome(p)}
                        </td>
                        <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                          {p.prazo
                            ? new Date(p.prazo.slice(0, 10) + "T12:00:00").toLocaleDateString(
                                "pt-BR",
                                {
                                  day: "2-digit",
                                  month: "short",
                                },
                              )
                            : "—"}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`font-plex-mono text-[12px] font-medium ${s.className}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => abrirEditar(p)}
                              className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-foreground/50 hover:text-foreground transition-colors"
                            >
                              Editar
                            </button>
                            {podSubmeter && (
                              <button
                                onClick={() => handleSubmeter(p.id)}
                                disabled={submetendo === p.id}
                                className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-foreground/50 hover:text-foreground transition-colors disabled:opacity-40"
                              >
                                {submetendo === p.id ? "..." : "Submeter →"}
                              </button>
                            )}
                            {podConcluir && (
                              <button
                                onClick={() => setConfirmarConclusao(p)}
                                disabled={concluindo === p.id}
                                className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-green-600 hover:text-green-700 transition-colors disabled:opacity-40"
                              >
                                {concluindo === p.id ? "..." : "Concluir →"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ))}

          {aba === "todos" && (
            <>
              <div className="flex gap-3 mb-6">
                <Select
                  value={filtroLiga}
                  onValueChange={(v) => setFiltroLiga(v === "all" ? "" : v)}
                >
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
                    {Object.entries(STATUS_CONFIG)
                      .filter(([k]) => k !== "rascunho")
                      .map(([k, v]) => (
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
                                  {
                                    day: "2-digit",
                                    month: "short",
                                  },
                                )
                              : "—"}
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`font-plex-mono text-[12px] font-medium ${s.className}`}
                            >
                              {s.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
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
      <Sheet
        open={sheetProjeto !== null}
        onOpenChange={(o) => {
          if (!o) setSheetProjeto(null);
        }}
      >
        <SheetContent side="right" className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0">
          <div className="flex-shrink-0">
            <div className="h-px bg-foreground/20" />
            <div className="px-8 pt-8 pb-6">
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40">
                {isNovo ? "Novo" : "Editar"}
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-foreground mt-1">
                {isNovo ? "Adicionar projeto" : projetoAtual?.titulo}
              </h2>
            </div>
            <div className="h-px bg-foreground/[0.08]" />
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
            <div>
              <label
                htmlFor="proj-titulo"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
              >
                Título
              </label>
              <input
                id="proj-titulo"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Nome do projeto"
                className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
              />
            </div>

            <div>
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                Responsável
              </label>
              <Select
                value={form.responsavel_id}
                onValueChange={(v) => setForm((f) => ({ ...f, responsavel_id: v }))}
              >
                <SelectTrigger className="w-full font-plex-sans text-[13px]">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="font-plex-sans text-[13px]">
                    Nenhum
                  </SelectItem>
                  {membros.map((m) => (
                    <SelectItem
                      key={m.usuario_id}
                      value={m.usuario_id}
                      className="font-plex-sans text-[13px]"
                    >
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                Tipo de Projeto
              </label>
              <Select
                value={form.tipo_projeto}
                onValueChange={(v) => setForm((f) => ({ ...f, tipo_projeto: v }))}
              >
                <SelectTrigger className="w-full font-plex-sans text-[13px]">
                  <SelectValue placeholder="Selecionar tipo..." />
                </SelectTrigger>
                <SelectContent>
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
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                Professor Mentor Alocado
              </label>
              <Select
                value={form.professor_id}
                onValueChange={(v) => setForm((f) => ({ ...f, professor_id: v }))}
                disabled={!professorDaLiga}
              >
                <SelectTrigger className="w-full font-plex-sans text-[13px] disabled:opacity-40">
                  <SelectValue
                    placeholder={professorDaLiga ? "Nenhum" : "Nenhum professor na liga"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="font-plex-sans text-[13px]">
                    Nenhum
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
                htmlFor="proj-descricao"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
              >
                Descrição
              </label>
              <textarea
                id="proj-descricao"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva o projeto..."
                rows={3}
                className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 resize-none rounded"
              />
            </div>

            <div>
              <label
                htmlFor="proj-impacto"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
              >
                Impacto Projetado/Realizado
              </label>
              <textarea
                id="proj-impacto"
                value={form.impacto}
                onChange={(e) => setForm((f) => ({ ...f, impacto: e.target.value }))}
                placeholder="Descreva o impacto esperado ou realizado..."
                rows={3}
                className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 resize-none rounded"
              />
            </div>

            <div>
              <label
                htmlFor="proj-empresa"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
              >
                Empresa Parceira Envolvida
              </label>
              <input
                id="proj-empresa"
                value={form.empresa_parceira}
                onChange={(e) => setForm((f) => ({ ...f, empresa_parceira: e.target.value }))}
                placeholder="Ex: Empresa XYZ"
                className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
              />
            </div>

            <div>
              <label
                htmlFor="proj-prazo"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
              >
                Prazo
              </label>
              <input
                id="proj-prazo"
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
              {(isNovo ||
                projetoAtual?.status === "rascunho" ||
                projetoAtual?.status === "rejeitado") && (
                <button
                  onClick={() => handleSalvar(true)}
                  disabled={salvando || !form.titulo.trim()}
                  className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-[#10244D] px-4 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {salvando ? "Salvando..." : "Salvar e submeter para aprovação"}
                </button>
              )}
              <button
                onClick={() => handleSalvar(false)}
                disabled={salvando || !form.titulo.trim()}
                className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/20 px-4 py-3 rounded-full hover:bg-foreground/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
