import { useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

type Props = {
  open: boolean;
  projetoId: string;
  onClose: () => void;
  onCriado: () => void;
};

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function CriarMilestoneDialog({ open, projetoId, onClose, onCriado }: Props) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSalvando(true);
    try {
      const token = await getToken();
      await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          projeto_id: projetoId,
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          prazo: prazo || undefined,
        }),
      });
      setTitulo("");
      setDescricao("");
      setPrazo("");
      onCriado();
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
            Novo Milestone
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
              placeholder="Ex: Fase 1 — Pesquisa"
              className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
            />
          </div>

          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o que será entregue nesse milestone..."
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
              {salvando ? "Criando..." : "Criar milestone"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
