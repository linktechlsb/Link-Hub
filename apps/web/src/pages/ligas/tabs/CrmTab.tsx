import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { EditorialTable, SectionHeader } from "@/pages/home/v1/primitives";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { CrmContato, CreateCrmContatoInput, UpdateCrmContatoInput } from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

interface Props {
  ligaId: string;
  podeEditar: boolean;
}

export function CrmTab({ ligaId, podeEditar }: Props) {
  const [contatos, setContatos] = useState<CrmContato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [contatoEditando, setContatoEditando] = useState<CrmContato | null>(null);
  const [confirmandoDeletar, setConfirmandoDeletar] = useState<string | null>(null);

  const [formNome, setFormNome] = useState("");
  const [formEmprego, setFormEmprego] = useState("");
  const [formEmpresa, setFormEmpresa] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const token = await getToken();
    const res = await fetch(`/api/crm?liga_id=${ligaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setContatos(await res.json());
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, [ligaId]);

  function abrirCriar() {
    setContatoEditando(null);
    setFormNome("");
    setFormEmprego("");
    setFormEmpresa("");
    setFormTelefone("");
    setFormEmail("");
    setModalAberto(true);
  }

  function abrirEditar(contato: CrmContato) {
    setContatoEditando(contato);
    setFormNome(contato.nome);
    setFormEmprego(contato.emprego ?? "");
    setFormEmpresa(contato.empresa ?? "");
    setFormTelefone(contato.telefone ?? "");
    setFormEmail(contato.email ?? "");
    setModalAberto(true);
  }

  async function salvar() {
    if (!formNome.trim()) return;
    setSalvando(true);
    const token = await getToken();

    if (contatoEditando) {
      const body: UpdateCrmContatoInput = {
        nome: formNome.trim(),
        emprego: formEmprego.trim() || undefined,
        empresa: formEmpresa.trim() || undefined,
        telefone: formTelefone.trim() || undefined,
        email: formEmail.trim() || undefined,
      };
      await fetch(`/api/crm/${contatoEditando.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      const body: CreateCrmContatoInput = {
        liga_id: ligaId,
        nome: formNome.trim(),
        emprego: formEmprego.trim() || undefined,
        empresa: formEmpresa.trim() || undefined,
        telefone: formTelefone.trim() || undefined,
        email: formEmail.trim() || undefined,
      };
      await fetch("/api/crm", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setModalAberto(false);
    setSalvando(false);
    carregar();
  }

  async function deletar(id: string) {
    const token = await getToken();
    await fetch(`/api/crm/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setConfirmandoDeletar(null);
    carregar();
  }

  if (carregando) {
    return <p className="font-plex-sans text-[13px] text-navy/50">Carregando contatos...</p>;
  }

  const contadorAcao = (
    <div className="flex items-center gap-4">
      <span className="font-plex-mono text-[11px] tracking-[0.14em] text-navy/60">
        {contatos.length}
      </span>
      {podeEditar && (
        <button
          onClick={abrirCriar}
          className="font-plex-mono text-[11px] tracking-[0.14em] uppercase bg-navy text-white px-3 py-1.5 hover:bg-navy/80 transition-colors"
        >
          + Novo contato
        </button>
      )}
    </div>
  );

  const colunas = podeEditar
    ? ["Nome", "Emprego", "Empresa", "Telefone", "E-mail", ""]
    : ["Nome", "Emprego", "Empresa", "Telefone", "E-mail"];

  return (
    <div>
      <SectionHeader numero="06" eyebrow="Relacionamentos" titulo="CRM" acao={contadorAcao} />

      {contatos.length === 0 ? (
        <p className="font-plex-sans text-[13px] text-navy/50">Nenhum contato cadastrado.</p>
      ) : (
        <EditorialTable
          columns={colunas}
          rows={contatos.map((c) => {
            const cells = [
              <span key="nome" className="font-medium">{c.nome}</span>,
              c.emprego ?? "—",
              c.empresa ?? "—",
              c.telefone ?? "—",
              c.email ?? "—",
            ];

            if (podeEditar) {
              cells.push(
                confirmandoDeletar === c.id ? (
                  <span key="acoes" className="flex items-center gap-2">
                    <button
                      onClick={() => deletar(c.id)}
                      className="font-plex-mono text-[10px] uppercase tracking-[0.12em] text-red-600 hover:text-red-800 transition-colors"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setConfirmandoDeletar(null)}
                      className="font-plex-mono text-[10px] uppercase tracking-[0.12em] text-navy/50 hover:text-navy transition-colors"
                    >
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <span key="acoes" className="flex items-center gap-3">
                    <button
                      onClick={() => abrirEditar(c)}
                      className="text-navy/40 hover:text-navy transition-colors"
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setConfirmandoDeletar(c.id)}
                      className="text-navy/40 hover:text-red-600 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                ),
              );
            }

            return cells;
          })}
        />
      )}

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-plex-sans font-bold text-navy text-[18px]">
              {contatoEditando ? "Editar contato" : "Novo contato"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/60">
                Nome *
              </Label>
              <Input
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Nome completo"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/60">
                Cargo / Emprego
              </Label>
              <Input
                value={formEmprego}
                onChange={(e) => setFormEmprego(e.target.value)}
                placeholder="Ex: Gerente de Parcerias"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/60">
                Empresa
              </Label>
              <Input
                value={formEmpresa}
                onChange={(e) => setFormEmpresa(e.target.value)}
                placeholder="Nome da empresa"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/60">
                Telefone
              </Label>
              <Input
                value={formTelefone}
                onChange={(e) => setFormTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/60">
                E-mail
              </Label>
              <Input
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@empresa.com"
                type="email"
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModalAberto(false)}
                className="font-plex-mono text-[11px] uppercase tracking-[0.14em] text-navy/60 hover:text-navy transition-colors px-4 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={!formNome.trim() || salvando}
                className="font-plex-mono text-[11px] uppercase tracking-[0.14em] bg-navy text-white px-4 py-2 hover:bg-navy/80 transition-colors disabled:opacity-40"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
