import { useState } from "react";

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormSheet } from "@/components/ui/form-sheet";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

const LABEL_CLASS = "font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40";
const INPUT_CLASS =
  "border-border bg-muted/50 text-[13px] text-foreground placeholder:text-foreground/20";
const TEXTAREA_CLASS =
  "w-full resize-none rounded border border-border bg-muted/50 px-3 py-2.5 text-[13px] text-foreground placeholder:text-foreground/20 focus:border-foreground/30 focus:outline-none";

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

  async function handleSubmit() {
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
    <FormSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      eyebrow="Novo"
      title="Novo Milestone"
      footer={
        <>
          <button
            onClick={handleSubmit}
            disabled={salvando || !titulo.trim()}
            className="w-full rounded-full bg-[#10244D] px-4 py-3 font-plex-mono text-[11px] uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {salvando ? "Criando..." : "Criar milestone"}
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-full border border-foreground/20 px-4 py-3 font-plex-mono text-[11px] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-foreground/[0.06]"
          >
            Cancelar
          </button>
        </>
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="milestone-titulo" className={LABEL_CLASS}>
            Título *
          </FieldLabel>
          <Input
            id="milestone-titulo"
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Fase 1 — Pesquisa"
            className={INPUT_CLASS}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="milestone-descricao" className={LABEL_CLASS}>
            Descrição
          </FieldLabel>
          <textarea
            id="milestone-descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva o que será entregue nesse milestone..."
            rows={3}
            className={TEXTAREA_CLASS}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="milestone-prazo" className={LABEL_CLASS}>
            Prazo
          </FieldLabel>
          <Input
            id="milestone-prazo"
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
      </FieldGroup>
    </FormSheet>
  );
}
