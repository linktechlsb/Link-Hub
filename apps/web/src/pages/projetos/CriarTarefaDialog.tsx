import { useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

type MembroSimples = { id: string; nome: string };

type Props = {
  open: boolean;
  milestoneId: string;
  membros: MembroSimples[];
  onClose: () => void;
  onCriada: () => void;
};

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function CriarTarefaDialog({ open, milestoneId, membros, onClose, onCriada }: Props) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [prazo, setPrazo] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSalvando(true);
    try {
      const token = await getToken();
      await fetch(`/api/milestones/${milestoneId}/tarefas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          responsavel_id: responsavelId && responsavelId !== "__none__" ? responsavelId : undefined,
          prazo: prazo || undefined,
        }),
      });
      setTitulo("");
      setDescricao("");
      setResponsavelId("");
      setPrazo("");
      onCriada();
      onClose();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-[18px] tracking-[-0.02em] text-navy">
            Nova Tarefa
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
              Título *
            </label>
            <input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Levantamento bibliográfico"
              className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
            />
          </div>

          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
              Responsável
            </label>
            <Select
              value={responsavelId || "__none__"}
              onValueChange={(v) => setResponsavelId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className="w-full font-plex-sans text-[13px]">
                <SelectValue placeholder="Nenhum responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="font-plex-sans text-[13px]">
                  Nenhum responsável
                </SelectItem>
                {membros.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="font-plex-sans text-[13px]">
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o que deve ser feito..."
              rows={3}
              className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 resize-none rounded"
            />
          </div>

          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
              Prazo
            </label>
            <input
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 focus:outline-none focus:border-foreground/30 rounded"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/20 px-4 py-3 rounded-full hover:bg-foreground/[0.06] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || !titulo.trim()}
              className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {salvando ? "Criando..." : "Criar tarefa"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
