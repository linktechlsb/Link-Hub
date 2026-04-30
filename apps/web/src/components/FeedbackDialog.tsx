import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TipoFeedback = "sugestao" | "feature" | "correcao";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [tipo, setTipo] = useState<TipoFeedback | "">("");
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  function resetForm() {
    setTipo("");
    setTitulo("");
    setMensagem("");
  }

  function handleClose(value: boolean) {
    if (!value) resetForm();
    onOpenChange(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo || !titulo.trim() || !mensagem.trim()) return;

    setEnviando(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/feedbacks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ titulo: titulo.trim(), tipo, mensagem: mensagem.trim() }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Erro ao enviar feedback.");
      }

      toast.success("Feedback enviado! Obrigado pela contribuição.");
      handleClose(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar feedback.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-navy">Enviar Feedback</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <Label htmlFor="feedback-tipo">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoFeedback)}>
              <SelectTrigger id="feedback-tipo">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sugestao">Sugestão</SelectItem>
                <SelectItem value="feature">Nova Feature</SelectItem>
                <SelectItem value="correcao">Correção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feedback-titulo">Título</Label>
            <Input
              id="feedback-titulo"
              placeholder="Descreva brevemente"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feedback-mensagem">Mensagem</Label>
            <Textarea
              id="feedback-mensagem"
              placeholder="Detalhe sua sugestão, feature ou correção..."
              rows={4}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={enviando || !tipo || !titulo.trim() || !mensagem.trim()}
            >
              {enviando ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
