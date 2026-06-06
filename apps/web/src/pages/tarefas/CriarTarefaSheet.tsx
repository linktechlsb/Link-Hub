import { useEffect, useState } from "react";
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

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

type ProjetoOpt = { id: string; nome: string; liga_id: string };
type MilestoneOpt = { id: string; titulo: string };
type MembroOpt = { usuario_id: string; nome: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvo: () => void;
  ligaId?: string;
}

export function CriarTarefaSheet({ open, onOpenChange, onSalvo, ligaId }: Props) {
  const [projetos, setProjetos] = useState<ProjetoOpt[]>([]);
  const [milestones, setMilestones] = useState<MilestoneOpt[]>([]);
  const [membros, setMembros] = useState<MembroOpt[]>([]);

  const [projetoId, setProjetoId] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [prazo, setPrazo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

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
    setMilestoneId("");
    setMilestones([]);
    if (!projetoId) return;
    void (async () => {
      const token = await getToken();
      const res = await fetch(`/api/milestones?projeto_id=${projetoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { id: string; titulo: string }[];
        setMilestones(data);
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
    setResponsavelId("");
    setPrazo("");
    setDescricao("");
    setMilestones([]);
  }

  async function handleSalvar() {
    if (!milestoneId || !titulo.trim()) {
      toast.error("Selecione um milestone e informe o título.");
      return;
    }
    setSalvando(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/tarefas", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          milestone_id: milestoneId,
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          responsavel_id: responsavelId && responsavelId !== "_none" ? responsavelId : undefined,
          prazo: prazo || undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Erro ao criar tarefa.");
      }
      toast.success("Tarefa criada!");
      onSalvo();
      onOpenChange(false);
      resetar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar tarefa.");
    } finally {
      setSalvando(false);
    }
  }

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
        className="w-[420px] sm:w-[480px] flex flex-col gap-0 p-0 bg-white dark:bg-[#030303]"
      >
        {/* Header */}
        <div className="flex-shrink-0">
          <div className="h-px bg-navy/90 dark:bg-white/20" />
          <div className="px-8 pt-8 pb-6">
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 dark:text-white/40">
              Tarefas
            </p>
            <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy dark:text-white">
              Nova Tarefa
            </h2>
          </div>
          <div className="h-px bg-navy/15 dark:bg-white/10" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Projeto */}
          <div className="space-y-2">
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.16em] text-navy/50 dark:text-white/40">
              Projeto
            </label>
            <Select value={projetoId} onValueChange={setProjetoId}>
              <SelectTrigger className="w-full font-plex-sans text-[13px]">
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

          {/* Milestone */}
          <div className="space-y-2">
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.16em] text-navy/50 dark:text-white/40">
              Milestone
            </label>
            <Select value={milestoneId} onValueChange={setMilestoneId} disabled={!projetoId}>
              <SelectTrigger className="w-full font-plex-sans text-[13px]">
                <SelectValue
                  placeholder={projetoId ? "Selecionar milestone" : "Selecione um projeto primeiro"}
                />
              </SelectTrigger>
              <SelectContent>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="font-plex-sans text-[13px]">
                    {m.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.16em] text-navy/50 dark:text-white/40">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nome da tarefa"
              className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2 bg-white dark:bg-transparent dark:text-white focus:outline-none focus:border-navy/60"
            />
          </div>

          {/* Responsável */}
          <div className="space-y-2">
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.16em] text-navy/50 dark:text-white/40">
              Responsável
            </label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger className="w-full font-plex-sans text-[13px]">
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none" className="font-plex-sans text-[13px]">
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

          {/* Prazo */}
          <div className="space-y-2">
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.16em] text-navy/50 dark:text-white/40">
              Prazo
            </label>
            <input
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2 bg-white dark:bg-transparent dark:text-white focus:outline-none focus:border-navy/60"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.16em] text-navy/50 dark:text-white/40">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Detalhes opcionais..."
              className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2 bg-white dark:bg-transparent dark:text-white focus:outline-none focus:border-navy/60 resize-none"
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
              className="w-full bg-navy text-white font-plex-mono text-[11px] uppercase tracking-[0.14em] py-3 hover:bg-navy/90 transition-colors disabled:opacity-50"
            >
              {salvando ? "Criando..." : "Criar tarefa"}
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="w-full font-plex-mono text-[11px] uppercase tracking-[0.14em] text-navy/50 hover:text-navy transition-colors py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
