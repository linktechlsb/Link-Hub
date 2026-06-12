import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

import { DEFAULT_ICONE, TAREFA_ICONES } from "./icones";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

type ProjetoOpt = { id: string; nome: string; liga_id: string };
type MilestoneOpt = { id: string; titulo: string };
type MembroOpt = { usuario_id: string; nome: string };

export type TarefaEdicao = {
  id: string;
  titulo: string;
  descricao?: string;
  projeto_id: string;
  milestone_id: string;
  responsaveis?: string[];
  prazo?: string;
  icone?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvo: () => void;
  ligaId?: string;
  tarefa?: TarefaEdicao | null;
}

const LABEL_CLASS =
  "font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-2 block";
const INPUT_CLASS =
  "w-full font-plex-sans text-[13px] text-navy dark:text-white border border-navy/20 dark:border-white/15 rounded px-3 py-2.5 bg-white dark:bg-white/5 placeholder:text-navy/30 dark:placeholder:text-white/25 focus:outline-none focus:border-navy/60 dark:focus:border-white/40";
const SELECT_TRIGGER_CLASS =
  "w-full font-plex-sans text-[13px] text-navy dark:text-white border-navy/20 dark:border-white/15 rounded bg-white dark:bg-white/5 focus:ring-0 focus:border-navy/60 dark:focus:border-white/40";

export function CriarTarefaSheet({ open, onOpenChange, onSalvo, ligaId, tarefa }: Props) {
  const editando = !!tarefa;

  const [projetos, setProjetos] = useState<ProjetoOpt[]>([]);
  const [milestones, setMilestones] = useState<MilestoneOpt[]>([]);
  const [membros, setMembros] = useState<MembroOpt[]>([]);

  const [projetoId, setProjetoId] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [responsaveis, setResponsaveis] = useState<string[]>([]);
  const [prazo, setPrazo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [icone, setIcone] = useState(DEFAULT_ICONE);
  const [salvando, setSalvando] = useState(false);

  // Milestone a pré-selecionar após o carregamento (modo edição)
  const prefillMilestoneRef = useRef("");

  // Inicializa os campos ao abrir: prefill no modo edição, limpo ao criar
  useEffect(() => {
    if (!open) return;
    if (tarefa) {
      setProjetoId(tarefa.projeto_id);
      setTitulo(tarefa.titulo);
      setDescricao(tarefa.descricao ?? "");
      setResponsaveis(tarefa.responsaveis ?? []);
      setPrazo(tarefa.prazo ? tarefa.prazo.slice(0, 10) : "");
      setIcone(tarefa.icone ?? DEFAULT_ICONE);
      prefillMilestoneRef.current = tarefa.milestone_id;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tarefa?.id]);

  // Carregar projetos ao abrir
  useEffect(() => {
    if (!open) return;
    void (async () => {
      const token = await getToken();
      const res = await fetch("/api/projetos", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = (await res.json()) as { id: string; titulo: string; liga_id: string }[];
        setProjetos(data.map((p) => ({ id: p.id, nome: p.titulo, liga_id: p.liga_id })));
      }
    })();
  }, [open]);

  // Carregar milestones ao selecionar projeto
  useEffect(() => {
    setMilestones([]);
    if (!prefillMilestoneRef.current) setMilestoneId("");
    if (!projetoId) return;
    void (async () => {
      const token = await getToken();
      const res = await fetch(`/api/milestones?projeto_id=${projetoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { id: string; titulo: string }[];
        setMilestones(data);
        if (prefillMilestoneRef.current) {
          setMilestoneId(prefillMilestoneRef.current);
          prefillMilestoneRef.current = "";
        }
      }
    })();
  }, [projetoId]);

  // Carregar membros da liga
  useEffect(() => {
    const liga = ligaId ?? projetos.find((p) => p.id === projetoId)?.liga_id;
    if (!liga) return;
    void (async () => {
      const token = await getToken();
      const res = await fetch(`/api/ligas/${liga}/membros`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { usuario_id: string; nome: string }[];
        setMembros(data);
      }
    })();
  }, [projetoId, ligaId, projetos]);

  function resetar() {
    setProjetoId("");
    setMilestoneId("");
    setTitulo("");
    setResponsaveis([]);
    setPrazo("");
    setDescricao("");
    setIcone(DEFAULT_ICONE);
    setMilestones([]);
    prefillMilestoneRef.current = "";
  }

  function adicionarResponsavel(usuarioId: string) {
    setResponsaveis((prev) => (prev.includes(usuarioId) ? prev : [...prev, usuarioId]));
  }

  function removerResponsavel(usuarioId: string) {
    setResponsaveis((prev) => prev.filter((id) => id !== usuarioId));
  }

  async function handleSalvar() {
    if (!projetoId || !titulo.trim()) {
      toast.error("Selecione um projeto e informe o título.");
      return;
    }
    setSalvando(true);
    try {
      const token = await getToken();
      const corpo = {
        projeto_id: projetoId,
        milestone_id: milestoneId || null,
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        responsaveis,
        prazo: prazo.trim() ? prazo : null,
        icone,
      };
      const res = await fetch(editando ? `/api/tarefas/${tarefa!.id}` : "/api/tarefas", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(corpo),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Erro ao salvar tarefa.");
      }
      toast.success(editando ? "Tarefa atualizada!" : "Tarefa criada!");
      onSalvo();
      onOpenChange(false);
      resetar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar tarefa.");
    } finally {
      setSalvando(false);
    }
  }

  const membrosDisponiveis = membros.filter((m) => !responsaveis.includes(m.usuario_id));

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) resetar();
        onOpenChange(v);
      }}
    >
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0 bg-background"
      >
        {/* Header */}
        <div className="flex-shrink-0">
          <div className="h-px bg-navy/90 dark:bg-white/20" />
          <div className="px-8 pt-8 pb-6">
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 dark:text-white/40">
              {editando ? "Editar" : "Novo"}
            </p>
            <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy dark:text-white mt-1">
              {editando ? "Editar tarefa" : "Adicionar tarefa"}
            </h2>
          </div>
          <div className="h-px bg-navy/15 dark:bg-white/10" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Projeto */}
          <div>
            <label className={LABEL_CLASS}>
              Projeto <span className="text-red-500">*</span>
            </label>
            <Select value={projetoId} onValueChange={setProjetoId}>
              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder="Selecionar projeto" />
              </SelectTrigger>
              <SelectContent>
                {projetos.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="font-plex-sans text-[13px]">
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Milestone (opcional) */}
          <div>
            <label className={LABEL_CLASS}>Milestone (opcional)</label>
            <Select
              value={milestoneId || "__none__"}
              onValueChange={(v) => setMilestoneId(v === "__none__" ? "" : v)}
              disabled={!projetoId}
            >
              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                <SelectValue
                  placeholder={projetoId ? "Sem milestone" : "Selecione um projeto primeiro"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="font-plex-sans text-[13px]">
                  Sem milestone
                </SelectItem>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="font-plex-sans text-[13px]">
                    {m.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título */}
          <div>
            <label className={LABEL_CLASS}>
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nome da tarefa"
              className={INPUT_CLASS}
            />
          </div>

          {/* Ícone */}
          <div>
            <label className={LABEL_CLASS}>Ícone</label>
            <div className="grid grid-cols-8 gap-1.5">
              {Object.entries(TAREFA_ICONES).map(([nome, Icon]) => (
                <button
                  key={nome}
                  type="button"
                  onClick={() => setIcone(nome)}
                  aria-label={nome}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded border transition-colors",
                    icone === nome
                      ? "border-navy bg-navy text-white dark:border-white dark:bg-white dark:text-navy"
                      : "border-navy/15 text-navy/60 hover:border-navy/40 hover:text-navy dark:border-white/15 dark:text-white/50 dark:hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Responsáveis (múltiplos) */}
          <div>
            <label className={LABEL_CLASS}>Responsáveis</label>
            <Select value="" onValueChange={adicionarResponsavel} disabled={!projetoId && !ligaId}>
              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder="Adicionar responsável..." />
              </SelectTrigger>
              <SelectContent>
                {membrosDisponiveis.length === 0 ? (
                  <div className="px-2 py-1.5 font-plex-sans text-[13px] text-navy/40 dark:text-white/30">
                    {membros.length === 0 ? "Nenhum membro na liga" : "Todos já adicionados"}
                  </div>
                ) : (
                  membrosDisponiveis.map((m) => (
                    <SelectItem
                      key={m.usuario_id}
                      value={m.usuario_id}
                      className="font-plex-sans text-[13px]"
                    >
                      {m.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {responsaveis.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {responsaveis.map((id) => {
                  const m = membros.find((x) => x.usuario_id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-2 border border-navy dark:border-white/30 rounded px-2.5 py-1 font-plex-sans text-[12px] text-navy dark:text-white"
                    >
                      {m?.nome ?? "Carregando..."}
                      <button
                        type="button"
                        onClick={() => removerResponsavel(id)}
                        aria-label={`Remover ${m?.nome ?? "responsável"}`}
                        className="font-plex-mono text-[10px] text-navy/50 dark:text-white/40 hover:text-navy dark:hover:text-white transition-colors"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Prazo */}
          <div>
            <label className={LABEL_CLASS}>Prazo</label>
            <input
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className={LABEL_CLASS}>Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Detalhes opcionais..."
              className={cn(INPUT_CLASS, "resize-none")}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0">
          <div className="h-px bg-foreground/[0.08]" />
          <div className="px-8 py-6 flex flex-col gap-3">
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-[#10244D] px-4 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed dark:bg-white dark:text-[#10244D]"
            >
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar tarefa"}
            </button>
            <button
              onClick={() => onOpenChange(false)}
              disabled={salvando}
              className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/20 px-4 py-3 rounded-full hover:bg-foreground/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
