import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

type LigaAPI = { id: string; nome: string };
type ProfessorAPI = { id: string; nome: string; email: string } | null;
type MembroAPI = { id: string; usuario_id: string; nome: string; cargo?: string; role?: string };

type Form = {
  titulo: string;
  descricao: string;
  prazo: string;
  liga_id: string;
  responsavel_id: string;
  impacto: string;
  professor_id: string;
  empresa_parceira: string;
  tipo_projeto: string;
};

const FORM_VAZIO: Form = {
  titulo: "",
  descricao: "",
  prazo: "",
  liga_id: "",
  responsavel_id: "",
  impacto: "",
  professor_id: "",
  empresa_parceira: "",
  tipo_projeto: "",
};

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

interface CriarProjetoDialogProps {
  open: boolean;
  onClose: () => void;
  ligaId?: string;
  ligas?: LigaAPI[];
  onCriado: () => void;
}

export function CriarProjetoDialog({
  open,
  onClose,
  ligaId,
  ligas,
  onCriado,
}: CriarProjetoDialogProps) {
  const isStaff = !ligaId;
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [professorDaLiga, setProfessorDaLiga] = useState<ProfessorAPI>(null);
  const [membrosLiga, setMembrosLiga] = useState<MembroAPI[]>([]);

  const ligaEfetiva = ligaId ?? form.liga_id;

  useEffect(() => {
    if (open) {
      setForm(ligaId ? { ...FORM_VAZIO, liga_id: ligaId } : FORM_VAZIO);
      setProfessorDaLiga(null);
      setMembrosLiga([]);
    }
  }, [open, ligaId]);

  useEffect(() => {
    if (!ligaEfetiva) {
      setProfessorDaLiga(null);
      setMembrosLiga([]);
      return;
    }
    getToken().then((token) => {
      fetch(`/api/ligas/${ligaEfetiva}/professor`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data: ProfessorAPI) => {
          setProfessorDaLiga(data);
          setForm((f) => ({ ...f, professor_id: data?.id ?? "" }));
        })
        .catch(() => setProfessorDaLiga(null));

      fetch(`/api/ligas/${ligaEfetiva}/membros`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data: MembroAPI[]) => setMembrosLiga(Array.isArray(data) ? data : []))
        .catch(() => setMembrosLiga([]));
    });
  }, [ligaEfetiva]);

  async function handleCriar(submeter = false) {
    if (!form.titulo.trim() || !ligaEfetiva) return;
    setSalvando(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          titulo: form.titulo.trim(),
          descricao: form.descricao.trim() || undefined,
          prazo: form.prazo || undefined,
          liga_id: ligaEfetiva,
          responsavel_id:
            form.responsavel_id && form.responsavel_id !== "__none__"
              ? form.responsavel_id
              : undefined,
          impacto: form.impacto.trim() || undefined,
          professor_id:
            form.professor_id && form.professor_id !== "__none__" ? form.professor_id : undefined,
          empresa_parceira: form.empresa_parceira.trim() || undefined,
          tipo_projeto: form.tipo_projeto || undefined,
          ...(submeter ? { status: "em_aprovacao" } : {}),
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Erro ao criar projeto.");
        return;
      }
      toast.success("Projeto criado.");
      onCriado();
      onClose();
    } finally {
      setSalvando(false);
    }
  }

  const canSubmit = !!form.titulo.trim() && !!ligaEfetiva && (!isStaff || !!form.responsavel_id);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-foreground/[0.08]">
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40">
            Novo
          </p>
          <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-foreground mt-1">
            Adicionar projeto
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
              Título *
            </label>
            <input
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="Nome do projeto"
              autoFocus
              className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
            />
          </div>

          {isStaff && (
            <div>
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
                Liga *
              </label>
              <Select
                value={form.liga_id || "__none__"}
                onValueChange={(v) => {
                  const newId = v === "__none__" ? "" : v;
                  setForm((f) => ({ ...f, liga_id: newId, responsavel_id: "", professor_id: "" }));
                }}
              >
                <SelectTrigger className="w-full font-plex-sans text-[13px]">
                  <SelectValue placeholder="Selecionar liga..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecionar liga...</SelectItem>
                  {(ligas ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id} className="font-plex-sans text-[13px]">
                      {l.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
              Responsável{isStaff ? " *" : ""}
            </label>
            <Select
              value={form.responsavel_id || "__none__"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, responsavel_id: v === "__none__" ? "" : v }))
              }
              disabled={isStaff && !form.liga_id}
            >
              <SelectTrigger className="w-full font-plex-sans text-[13px]">
                <SelectValue
                  placeholder={
                    isStaff && !form.liga_id
                      ? "Selecione uma liga primeiro"
                      : "Selecionar responsável..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="font-plex-sans text-[13px]">
                  {isStaff && !form.liga_id ? "Selecione uma liga primeiro" : "Nenhum"}
                </SelectItem>
                {membrosLiga.map((m) => (
                  <SelectItem
                    key={m.usuario_id}
                    value={m.usuario_id}
                    className="font-plex-sans text-[13px]"
                  >
                    {m.nome}
                    {m.role ? ` — ${m.role}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
              Tipo de Projeto
            </label>
            <Select
              value={form.tipo_projeto || "__none__"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, tipo_projeto: v === "__none__" ? "" : v }))
              }
            >
              <SelectTrigger className="w-full font-plex-sans text-[13px]">
                <SelectValue placeholder="Selecionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="font-plex-sans text-[13px]">
                  Selecionar tipo...
                </SelectItem>
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
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
              Professor Mentor Alocado
            </label>
            <Select
              value={form.professor_id || "__none__"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, professor_id: v === "__none__" ? "" : v }))
              }
              disabled={!ligaEfetiva || !professorDaLiga}
            >
              <SelectTrigger className="w-full font-plex-sans text-[13px]">
                <SelectValue
                  placeholder={
                    !ligaEfetiva
                      ? "Selecione uma liga primeiro"
                      : professorDaLiga
                        ? "Nenhum"
                        : "Nenhum professor na liga"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="font-plex-sans text-[13px]">
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
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
              Descrição
            </label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Descreva o projeto..."
              rows={3}
              className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 resize-none rounded"
            />
          </div>

          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
              Impacto Projetado/Realizado
            </label>
            <textarea
              value={form.impacto}
              onChange={(e) => setForm((f) => ({ ...f, impacto: e.target.value }))}
              placeholder="Descreva o impacto esperado ou realizado..."
              rows={3}
              className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 resize-none rounded"
            />
          </div>

          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
              Empresa Parceira Envolvida
            </label>
            <input
              value={form.empresa_parceira}
              onChange={(e) => setForm((f) => ({ ...f, empresa_parceira: e.target.value }))}
              placeholder="Ex: Empresa XYZ"
              className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
            />
          </div>

          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
              Prazo
            </label>
            <input
              type="date"
              value={form.prazo}
              onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
              className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 focus:outline-none focus:border-foreground/30 rounded"
            />
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-foreground/[0.08] px-6 py-4 flex flex-col gap-2">
          {!isStaff && (
            <button
              onClick={() => void handleCriar(true)}
              disabled={salvando || !canSubmit}
              className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-[#10244D] px-4 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {salvando ? "Salvando..." : "Salvar e submeter para aprovação"}
            </button>
          )}
          <button
            onClick={() => void handleCriar(false)}
            disabled={salvando || !canSubmit}
            className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-[#10244D] px-4 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {salvando ? "Salvando..." : isStaff ? "Criar projeto" : "Salvar rascunho"}
          </button>
          <button
            onClick={onClose}
            disabled={salvando}
            className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/20 px-4 py-3 rounded-full hover:bg-foreground/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
