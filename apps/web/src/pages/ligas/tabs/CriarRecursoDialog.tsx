import { useState } from "react";

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormSheet } from "@/components/ui/form-sheet";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

import type { TipoRecurso } from "@link-leagues/types";

const LABEL_CLASS = "font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40";
const INPUT_CLASS =
  "border-border bg-muted/50 text-[13px] text-foreground placeholder:text-foreground/20";

const TIPOS: { value: TipoRecurso; label: string }[] = [
  { value: "link", label: "Link" },
  { value: "documento", label: "Documento" },
  { value: "video", label: "Vídeo" },
  { value: "curso", label: "Curso" },
];

const ICONES_SUGERIDOS = [
  { value: "link", label: "Link" },
  { value: "file-text", label: "Documento" },
  { value: "video", label: "Vídeo" },
  { value: "book-open", label: "Livro" },
  { value: "globe", label: "Web" },
  { value: "folder", label: "Pasta" },
];

const CORES_SUGERIDAS = [
  "#10284E",
  "#546484",
  "#FEC641",
  "#6366f1",
  "#10b981",
  "#f43f5e",
  "#f97316",
  "#0ea5e9",
];

type Props = {
  open: boolean;
  ligaId: string;
  onClose: () => void;
  onCriado: () => void;
};

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function CriarRecursoDialog({ open, ligaId, onClose, onCriado }: Props) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoRecurso>("link");
  const [url, setUrl] = useState("");
  const [icone, setIcone] = useState("link");
  const [cor, setCor] = useState(CORES_SUGERIDAS[0]!);
  const [publico, setPublico] = useState(false);
  const [salvando, setSalvando] = useState(false);

  function resetar() {
    setTitulo("");
    setTipo("link");
    setUrl("");
    setIcone("link");
    setCor(CORES_SUGERIDAS[0]!);
    setPublico(false);
  }

  async function handleSubmit() {
    if (!titulo.trim() || !url.trim()) return;
    setSalvando(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/recursos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          liga_id: ligaId,
          titulo: titulo.trim(),
          tipo,
          url: url.trim(),
          icone,
          cor,
          publico,
        }),
      });
      if (res.ok) {
        resetar();
        onCriado();
        onClose();
      }
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
      title="Novo Recurso"
      footer={
        <>
          <button
            onClick={handleSubmit}
            disabled={salvando || !titulo.trim() || !url.trim()}
            className="w-full rounded-full bg-[#10244D] px-4 py-3 font-plex-mono text-[11px] uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {salvando ? "Criando..." : "Criar recurso"}
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
          <FieldLabel htmlFor="recurso-titulo" className={LABEL_CLASS}>
            Título *
          </FieldLabel>
          <Input
            id="recurso-titulo"
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Guia de Onboarding"
            className={INPUT_CLASS}
          />
        </Field>

        <Field>
          <FieldLabel className={LABEL_CLASS}>Tipo *</FieldLabel>
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoRecurso)}>
            <SelectTrigger className={INPUT_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="recurso-url" className={LABEL_CLASS}>
            URL *
          </FieldLabel>
          <Input
            id="recurso-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className={INPUT_CLASS}
          />
        </Field>

        <Field>
          <FieldLabel className={LABEL_CLASS}>Ícone</FieldLabel>
          <Select value={icone} onValueChange={setIcone}>
            <SelectTrigger className={INPUT_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ICONES_SUGERIDOS.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel className={LABEL_CLASS}>Cor</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {CORES_SUGERIDAS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                className="size-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: cor === c ? c : "transparent",
                  outline: cor === c ? `2px solid ${c}` : "none",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>
        </Field>

        <Field>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={publico}
              onChange={(e) => setPublico(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[#10244D]"
            />
            <span className={LABEL_CLASS + " mb-0"}>Recurso público</span>
          </label>
        </Field>
      </FieldGroup>
    </FormSheet>
  );
}
