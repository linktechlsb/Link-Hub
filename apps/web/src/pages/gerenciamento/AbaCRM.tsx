import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Linkedin,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";

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
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">Contatos CRM</h2>
        <Button onClick={abrirFormularioNovo} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Contato
        </Button>
      </div>

      {contatos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-brand-gray bg-gray-50 py-16">
          <p className="text-sm text-muted-foreground">Nenhum contato adicionado ainda</p>
          <Button onClick={abrirFormularioNovo} variant="link" className="mt-2 text-navy">
            Criar primeiro contato
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contatos.map((contato) => (
            <div
              key={contato.id}
              className="rounded-lg border border-brand-gray bg-white p-4 hover:shadow-md transition-shadow"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-navy">{contato.nome}</h3>
                  {contato.empresa && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Building2 className="h-3 w-3" />
                      {contato.empresa}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => abrirFormularioEdicao(contato)}
                  className="text-muted-foreground hover:text-navy"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                {contato.email && (
                  <a
                    href={`mailto:${contato.email}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-navy"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{contato.email}</span>
                  </a>
                )}
                {contato.telefone && (
                  <a
                    href={`tel:${contato.telefone}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-navy"
                  >
                    <Phone className="h-4 w-4" />
                    {contato.telefone}
                  </a>
                )}
                {contato.emprego && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    {contato.emprego}
                  </div>
                )}
                {contato.linkedin && (
                  <a
                    href={contato.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-navy"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </a>
                )}
              </div>

              <button
                onClick={() => abrirDialogoDeletar(contato)}
                className="mt-3 w-full rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 flex items-center justify-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      <Sheet open={modoSheet !== null} onOpenChange={(aberto) => !aberto && setModoSheet(null)}>
        <SheetContent className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle className="text-navy">
              {modoSheet === "adicionar" ? "Novo Contato" : "Editar Contato"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-6">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">
                Nome <span className="text-red-600">*</span>
              </label>
              <Input
                placeholder="Nome do contato"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-1">Email</label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-1">Telefone</label>
              <Input
                placeholder="(11) 9999-9999"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-1">Empresa</label>
              <Input
                placeholder="Nome da empresa"
                value={formData.empresa}
                onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-1">Cargo/Emprego</label>
              <Input
                placeholder="Cargo do contato"
                value={formData.emprego}
                onChange={(e) => setFormData({ ...formData, emprego: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-1">LinkedIn</label>
              <Input
                placeholder="https://linkedin.com/in/..."
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setModoSheet(null)}
              disabled={salvando}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button onClick={salvarContato} disabled={salvando} className="flex-1 gap-2">
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!contatoDeletando}
        onOpenChange={(aberto) => !aberto && setContatoDeletando(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Remover Contato</DialogTitle>
            <DialogDescription>
              Você está prestes a remover este contato permanentemente. Esta ação não pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>

          {contatoDeletando && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-brand-gray bg-gray-50 p-4">
                <h3 className="font-semibold text-navy mb-2">{contatoDeletando.nome}</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {contatoDeletando.empresa && (
                    <p className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {contatoDeletando.empresa}
                    </p>
                  )}
                  {contatoDeletando.emprego && (
                    <p className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {contatoDeletando.emprego}
                    </p>
                  )}
                  {contatoDeletando.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {contatoDeletando.email}
                    </p>
                  )}
                  {contatoDeletando.telefone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {contatoDeletando.telefone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setContatoDeletando(null)}
              disabled={deletando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarDeletar}
              disabled={deletando}
              className="gap-2"
            >
              {deletando && <Loader2 className="h-4 w-4 animate-spin" />}
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
