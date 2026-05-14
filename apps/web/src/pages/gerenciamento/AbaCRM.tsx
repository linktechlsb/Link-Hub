import {
  Loader2,
  Plus,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Linkedin,
  MoreHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { SectionHeader } from "@/pages/home/v1/primitives";

import type { CrmContato, CreateCrmContatoInput, UpdateCrmContatoInput } from "@link-leagues/types";

interface Props {
  ligaId: string | null;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function AbaCRM({ ligaId }: Props) {
  const [contatos, setContatos] = useState<CrmContato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modoSheet, setModoSheet] = useState<"adicionar" | "editar" | null>(null);
  const [contatoSelecionado, setContatoSelecionado] = useState<CrmContato | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [contatoDeletando, setContatoDeletando] = useState<CrmContato | null>(null);
  const [deletando, setDeletando] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    emprego: "",
    empresa: "",
    linkedin: "",
  });

  useEffect(() => {
    if (ligaId) {
      carregarContatos();
    }
  }, [ligaId]);

  async function carregarContatos() {
    if (!ligaId) return;
    try {
      setCarregando(true);
      const token = await getToken();
      const res = await fetch(`http://localhost:3001/api/crm?liga_id=${ligaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Falha ao carregar contatos");
      const dados = await res.json();
      setContatos(dados);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar contatos");
    } finally {
      setCarregando(false);
    }
  }

  function abrirFormularioNovo() {
    setContatoSelecionado(null);
    setFormData({ nome: "", email: "", telefone: "", emprego: "", empresa: "", linkedin: "" });
    setModoSheet("adicionar");
  }

  function abrirFormularioEdicao(contato: CrmContato) {
    setContatoSelecionado(contato);
    setFormData({
      nome: contato.nome,
      email: contato.email ?? "",
      telefone: contato.telefone ?? "",
      emprego: contato.emprego ?? "",
      empresa: contato.empresa ?? "",
      linkedin: contato.linkedin ?? "",
    });
    setModoSheet("editar");
  }

  async function salvarContato() {
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!ligaId) {
      toast.error("Liga não encontrada");
      return;
    }

    try {
      setSalvando(true);
      const token = await getToken();

      if (modoSheet === "adicionar") {
        const payload: CreateCrmContatoInput = {
          liga_id: ligaId,
          nome: formData.nome,
          email: formData.email || undefined,
          telefone: formData.telefone || undefined,
          emprego: formData.emprego || undefined,
          empresa: formData.empresa || undefined,
          linkedin: formData.linkedin || undefined,
        };

        const res = await fetch("http://localhost:3001/api/crm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Falha ao criar contato");
        const novoContato = await res.json();
        setContatos([...contatos, novoContato]);
        toast.success("Contato criado com sucesso");
      } else if (modoSheet === "editar" && contatoSelecionado) {
        const payload: UpdateCrmContatoInput = {
          nome: formData.nome,
          email: formData.email || undefined,
          telefone: formData.telefone || undefined,
          emprego: formData.emprego || undefined,
          empresa: formData.empresa || undefined,
          linkedin: formData.linkedin || undefined,
        };

        const res = await fetch(`http://localhost:3001/api/crm/${contatoSelecionado.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Falha ao atualizar contato");
        const contatoAtualizado = await res.json();
        setContatos(contatos.map((c) => (c.id === contatoSelecionado.id ? contatoAtualizado : c)));
        toast.success("Contato atualizado com sucesso");
      }

      setModoSheet(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar contato");
    } finally {
      setSalvando(false);
    }
  }

  function abrirDialogoDeletar(contato: CrmContato) {
    setContatoDeletando(contato);
  }

  async function confirmarDeletar() {
    if (!contatoDeletando) return;

    try {
      setDeletando(true);
      const token = await getToken();
      const res = await fetch(`http://localhost:3001/api/crm/${contatoDeletando.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Falha ao deletar contato");
      setContatos(contatos.filter((c) => c.id !== contatoDeletando.id));
      setContatoDeletando(null);
      toast.success("Contato removido com sucesso");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover contato");
    } finally {
      setDeletando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-navy/40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        titulo="Contatos da Liga"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue dark:text-white"
        acao={
          <button
            onClick={abrirFormularioNovo}
            className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors"
          >
            + Novo Contato
          </button>
        }
      />

      {contatos.length === 0 ? (
        <div className="border border-dashed border-navy/20 py-16 text-center">
          <p className="font-plex-sans text-[13px] text-navy/40">
            Nenhum contato adicionado ainda.
          </p>
          <button
            onClick={abrirFormularioNovo}
            className="mt-3 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy transition-colors"
          >
            Criar primeiro contato
          </button>
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-foreground/[0.08]">
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Nome
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Empresa / Cargo
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Contato
              </th>
              <th className="py-3 px-4 w-10" />
            </tr>
          </thead>
          <tbody>
            {contatos.map((contato) => (
              <tr
                key={contato.id}
                className="border-b border-foreground/[0.06] hover:bg-foreground/[0.02] transition-colors"
              >
                <td className="py-4 px-4">
                  <span className="font-plex-sans font-semibold text-[13px] text-foreground">
                    {contato.nome}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="space-y-0.5">
                    {contato.empresa && (
                      <div className="flex items-center gap-1.5 font-plex-sans text-[12px] text-foreground/60">
                        <Building2 className="h-3 w-3 shrink-0" />
                        {contato.empresa}
                      </div>
                    )}
                    {contato.emprego && (
                      <div className="flex items-center gap-1.5 font-plex-sans text-[12px] text-foreground/60">
                        <Briefcase className="h-3 w-3 shrink-0" />
                        {contato.emprego}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="space-y-0.5">
                    {contato.email && (
                      <a
                        href={`mailto:${contato.email}`}
                        className="flex items-center gap-1.5 font-plex-mono text-[11px] text-foreground/60 hover:text-navy transition-colors"
                      >
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[160px]">{contato.email}</span>
                      </a>
                    )}
                    {contato.telefone && (
                      <a
                        href={`tel:${contato.telefone}`}
                        className="flex items-center gap-1.5 font-plex-mono text-[11px] text-foreground/60 hover:text-navy transition-colors"
                      >
                        <Phone className="h-3 w-3 shrink-0" />
                        {contato.telefone}
                      </a>
                    )}
                    {contato.linkedin && (
                      <a
                        href={contato.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 font-plex-mono text-[11px] text-foreground/60 hover:text-navy transition-colors"
                      >
                        <Linkedin className="h-3 w-3 shrink-0" />
                        LinkedIn
                      </a>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-foreground/[0.08] text-foreground/40 hover:text-foreground/70 transition-colors">
                        <MoreHorizontal size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px]">
                      <DropdownMenuItem
                        className="text-[12px] cursor-pointer"
                        onClick={() => abrirFormularioEdicao(contato)}
                      >
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-[12px] cursor-pointer text-red-500 focus:text-red-600"
                        onClick={() => abrirDialogoDeletar(contato)}
                      >
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Sheet add/edit — mantém lógica existente, atualiza apenas o estilo */}
      <Sheet open={modoSheet !== null} onOpenChange={(aberto) => !aberto && setModoSheet(null)}>
        <SheetContent side="right" className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0">
          <div className="flex-shrink-0">
            <div className="h-px bg-foreground/20" />
            <div className="px-8 pt-8 pb-6">
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40">
                Contatos
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-foreground mt-1">
                {modoSheet === "adicionar" ? "Novo Contato" : "Editar Contato"}
              </h2>
            </div>
            <div className="h-px bg-foreground/[0.08]" />
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {[
              {
                label: "Nome *",
                placeholder: "Nome do contato",
                field: "nome" as const,
                type: "text",
              },
              {
                label: "Email",
                placeholder: "email@exemplo.com",
                field: "email" as const,
                type: "email",
              },
              {
                label: "Telefone",
                placeholder: "(11) 9999-9999",
                field: "telefone" as const,
                type: "text",
              },
              {
                label: "Empresa",
                placeholder: "Nome da empresa",
                field: "empresa" as const,
                type: "text",
              },
              {
                label: "Cargo",
                placeholder: "Cargo do contato",
                field: "emprego" as const,
                type: "text",
              },
              {
                label: "LinkedIn",
                placeholder: "https://linkedin.com/in/...",
                field: "linkedin" as const,
                type: "url",
              },
            ].map(({ label, placeholder, field, type }) => (
              <div key={field}>
                <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                  {label}
                </label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={formData[field]}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
                />
              </div>
            ))}
          </div>

          <div className="flex-shrink-0">
            <div className="h-px bg-foreground/[0.08]" />
            <div className="px-8 py-6 flex flex-col gap-3">
              <button
                onClick={salvarContato}
                disabled={salvando || !formData.nome.trim()}
                className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-[#10244D] px-4 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Salvar
              </button>
              <button
                onClick={() => setModoSheet(null)}
                disabled={salvando}
                className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/20 px-4 py-3 rounded-full hover:bg-foreground/[0.06] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog de confirmação de remoção */}
      <Dialog
        open={!!contatoDeletando}
        onOpenChange={(aberto) => !aberto && setContatoDeletando(null)}
      >
        <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4">
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1">
              Contatos
            </p>
            <DialogTitle className="font-display font-bold text-[18px] tracking-[-0.02em] text-foreground">
              Remover contato
            </DialogTitle>
            {contatoDeletando && (
              <DialogDescription className="font-plex-sans text-[13px] text-foreground/60 mt-1">
                Tem certeza que deseja remover{" "}
                <span className="font-semibold text-foreground">{contatoDeletando.nome}</span>? Esta
                ação não pode ser desfeita.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="h-px bg-foreground/[0.08]" />
          <div className="px-6 py-4 flex items-center gap-2">
            <button
              onClick={() => setContatoDeletando(null)}
              disabled={deletando}
              className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/20 px-4 py-3 rounded-full hover:bg-foreground/[0.06] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarDeletar}
              disabled={deletando}
              className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-red-500 hover:bg-red-600 px-4 py-3 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deletando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Remover
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
