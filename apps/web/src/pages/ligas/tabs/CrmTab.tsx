import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";

import { TabSection } from "./primitives";

import type { CrmContato, CreateCrmContatoInput, UpdateCrmContatoInput } from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const LABEL_CLASS = "mb-2 block text-[10px] uppercase tracking-wide text-foreground/50";
const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none";

interface Props {
  ligaId: string;
  podeEditar: boolean;
}

export function CrmTab({ ligaId, podeEditar }: Props) {
  const [contatos, setContatos] = useState<CrmContato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sheetAberto, setSheetAberto] = useState(false);
  const [contatoEditando, setContatoEditando] = useState<CrmContato | null>(null);
  const [confirmandoDeletar, setConfirmandoDeletar] = useState<string | null>(null);

  const [formNome, setFormNome] = useState("");
  const [formEmprego, setFormEmprego] = useState("");
  const [formEmpresa, setFormEmpresa] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formLinkedin, setFormLinkedin] = useState("");
  const [formPublico, setFormPublico] = useState(false);
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
    setFormLinkedin("");
    setFormPublico(false);
    setSheetAberto(true);
  }

  function abrirEditar(contato: CrmContato) {
    setContatoEditando(contato);
    setFormNome(contato.nome);
    setFormEmprego(contato.emprego ?? "");
    setFormEmpresa(contato.empresa ?? "");
    setFormTelefone(contato.telefone ?? "");
    setFormEmail(contato.email ?? "");
    setFormLinkedin(contato.linkedin ?? "");
    setFormPublico(contato.publico);
    setSheetAberto(true);
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
        linkedin: formLinkedin.trim() || undefined,
        publico: formPublico,
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
        linkedin: formLinkedin.trim() || undefined,
        publico: formPublico,
      };
      await fetch("/api/crm", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setSheetAberto(false);
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
    return <p className="text-sm text-foreground/50">Carregando contatos...</p>;
  }

  const contadorAcao = (
    <div className="flex items-center gap-3">
      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/60">
        {contatos.length}
      </span>
      {podeEditar && (
        <button
          onClick={abrirCriar}
          className="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted dark:border-transparent dark:bg-white dark:text-neutral-900 dark:hover:bg-white/90"
        >
          + Novo contato
        </button>
      )}
    </div>
  );

  return (
    <TabSection titulo="Contatos" acao={contadorAcao}>
      {contatos.length === 0 ? (
        <p className="text-sm text-foreground/50">Nenhum contato cadastrado.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              {["Nome", "Emprego", "Empresa", "Telefone", "E-mail", "LinkedIn"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-foreground/40"
                >
                  {h}
                </th>
              ))}
              {podeEditar && <th className="w-16 px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {contatos.map((c) => (
              <tr
                key={c.id}
                className="border-b border-border transition-colors last:border-0 hover:bg-foreground/[0.03]"
              >
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{c.nome}</span>
                    {c.publico && (
                      <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-300">
                        Público
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground/60">{c.emprego ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-foreground/60">{c.empresa ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-foreground/60">{c.telefone ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-foreground/60">{c.email ?? "—"}</td>
                <td className="px-4 py-3">
                  {c.linkedin ? (
                    <a
                      href={c.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-foreground/60 underline underline-offset-2 transition-colors hover:text-foreground"
                    >
                      Abrir
                    </a>
                  ) : (
                    <span className="text-sm text-foreground/60">—</span>
                  )}
                </td>
                {podeEditar && (
                  <td className="px-4 py-3">
                    {confirmandoDeletar === c.id ? (
                      <span className="flex items-center gap-2">
                        <button
                          onClick={() => deletar(c.id)}
                          className="text-[10px] uppercase tracking-wide text-red-500 transition-colors hover:text-red-700"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmandoDeletar(null)}
                          className="text-[10px] uppercase tracking-wide text-foreground/40 transition-colors hover:text-foreground"
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        <button
                          onClick={() => abrirEditar(c)}
                          className="text-foreground/30 transition-colors hover:text-foreground"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setConfirmandoDeletar(c.id)}
                          className="text-foreground/30 transition-colors hover:text-red-500"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Sheet open={sheetAberto} onOpenChange={setSheetAberto}>
        <SheetContent
          side="right"
          className="flex w-[400px] flex-col gap-0 bg-background p-0 sm:w-[480px]"
        >
          <div className="flex-shrink-0 border-b border-border px-8 pb-6 pt-8">
            <p className="text-[10px] uppercase tracking-wide text-foreground/40">
              {contatoEditando ? "Editar" : "Novo"}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-foreground">
              {contatoEditando ? "Editar contato" : "Novo contato"}
            </h2>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-8 py-6">
            <div>
              <label htmlFor="crm-nome" className={LABEL_CLASS}>
                Nome *
              </label>
              <input
                id="crm-nome"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Nome completo"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="crm-emprego" className={LABEL_CLASS}>
                Cargo / Emprego
              </label>
              <input
                id="crm-emprego"
                value={formEmprego}
                onChange={(e) => setFormEmprego(e.target.value)}
                placeholder="Ex: Gerente de Parcerias"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="crm-empresa" className={LABEL_CLASS}>
                Empresa
              </label>
              <input
                id="crm-empresa"
                value={formEmpresa}
                onChange={(e) => setFormEmpresa(e.target.value)}
                placeholder="Nome da empresa"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="crm-telefone" className={LABEL_CLASS}>
                Telefone
              </label>
              <input
                id="crm-telefone"
                value={formTelefone}
                onChange={(e) => setFormTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="crm-email" className={LABEL_CLASS}>
                E-mail
              </label>
              <input
                id="crm-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@empresa.com"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="crm-linkedin" className={LABEL_CLASS}>
                LinkedIn
              </label>
              <input
                id="crm-linkedin"
                type="url"
                value={formLinkedin}
                onChange={(e) => setFormLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/usuario"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Visibilidade</label>
              <Select
                value={formPublico ? "publico" : "privado"}
                onValueChange={(v) => setFormPublico(v === "publico")}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="privado">Privado · só membros da liga</SelectItem>
                  <SelectItem value="publico">Público · visível para todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-shrink-0 border-t border-border px-8 py-6">
            <button
              onClick={salvar}
              disabled={!formNome.trim() || salvando}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {salvando ? "Salvando..." : contatoEditando ? "Salvar contato" : "Criar contato"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </TabSection>
  );
}
