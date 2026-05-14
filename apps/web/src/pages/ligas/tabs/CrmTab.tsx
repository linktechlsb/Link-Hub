import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { SectionHeader } from "@/pages/home/v1/primitives";

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
  const [sheetAberto, setSheetAberto] = useState(false);
  const [contatoEditando, setContatoEditando] = useState<CrmContato | null>(null);
  const [confirmandoDeletar, setConfirmandoDeletar] = useState<string | null>(null);

  const [formNome, setFormNome] = useState("");
  const [formEmprego, setFormEmprego] = useState("");
  const [formEmpresa, setFormEmpresa] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formLinkedin, setFormLinkedin] = useState("");
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
    return (
      <p className="font-plex-sans text-[13px] text-navy/50 dark:text-white/40">
        Carregando contatos...
      </p>
    );
  }

  const contadorAcao = (
    <div className="flex items-center gap-4">
      <span className="font-plex-mono text-[11px] tracking-[0.14em] text-navy/60 dark:text-white/40">
        {contatos.length}
      </span>
      {podeEditar && (
        <button
          onClick={abrirCriar}
          className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors"
        >
          + Novo contato
        </button>
      )}
    </div>
  );

  return (
    <div>
      <SectionHeader numero="06" eyebrow="Relacionamentos" titulo="Contatos" acao={contadorAcao} />

      {contatos.length === 0 ? (
        <p className="font-plex-sans text-[13px] text-navy/50 dark:text-white/40">
          Nenhum contato cadastrado.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-foreground/[0.08]">
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Nome
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Emprego
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Empresa
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Telefone
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                E-mail
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                LinkedIn
              </th>
              {podeEditar && <th className="py-3 px-4 w-16" />}
            </tr>
          </thead>
          <tbody>
            {contatos.map((c, idx) => {
              const isLast = idx === contatos.length - 1;
              return (
                <tr
                  key={c.id}
                  className={`hover:bg-foreground/[0.03] transition-colors ${!isLast ? "border-b border-foreground/[0.06]" : ""}`}
                >
                  <td className="py-4 px-4">
                    <span className="font-plex-sans text-[13px] text-foreground font-semibold">
                      {c.nome}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                    {c.emprego ?? "—"}
                  </td>
                  <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                    {c.empresa ?? "—"}
                  </td>
                  <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                    {c.telefone ?? "—"}
                  </td>
                  <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                    {c.email ?? "—"}
                  </td>
                  <td className="py-4 px-4">
                    {c.linkedin ? (
                      <a
                        href={c.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-plex-mono text-[13px] text-foreground/60 underline underline-offset-2 hover:text-foreground transition-colors"
                      >
                        Abrir
                      </a>
                    ) : (
                      <span className="font-plex-mono text-[13px] text-foreground/60">—</span>
                    )}
                  </td>
                  {podeEditar && (
                    <td className="py-4 px-4">
                      {confirmandoDeletar === c.id ? (
                        <span className="flex items-center gap-2">
                          <button
                            onClick={() => deletar(c.id)}
                            className="font-plex-mono text-[10px] uppercase tracking-[0.12em] text-red-500 hover:text-red-700 transition-colors"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setConfirmandoDeletar(null)}
                            className="font-plex-mono text-[10px] uppercase tracking-[0.12em] text-foreground/40 hover:text-foreground transition-colors"
                          >
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <span className="flex items-center gap-3">
                          <button
                            onClick={() => abrirEditar(c)}
                            className="text-foreground/30 hover:text-foreground transition-colors"
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmandoDeletar(c.id)}
                            className="text-foreground/30 hover:text-red-500 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Sheet open={sheetAberto} onOpenChange={setSheetAberto}>
        <SheetContent
          side="right"
          className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0 bg-white dark:bg-[#030303]"
        >
          <div className="flex-shrink-0">
            <div className="h-px bg-navy/90 dark:bg-white/20" />
            <div className="px-8 pt-8 pb-6">
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 dark:text-white/40">
                {contatoEditando ? "Editar" : "Novo"}
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy dark:text-white mt-1">
                {contatoEditando ? "Editar contato" : "Novo contato"}
              </h2>
            </div>
            <div className="h-px bg-navy/15 dark:bg-white/10" />
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
            <div>
              <label
                htmlFor="crm-nome"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-3 block"
              >
                Nome *
              </label>
              <input
                id="crm-nome"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Nome completo"
                className="w-full font-plex-sans text-[13px] text-navy dark:text-white border border-navy/20 dark:border-white/15 rounded px-3 py-2.5 bg-white dark:bg-white/5 placeholder:text-navy/30 dark:placeholder:text-white/25 focus:outline-none focus:border-navy/60 dark:focus:border-white/40"
              />
            </div>

            <div>
              <label
                htmlFor="crm-emprego"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-3 block"
              >
                Cargo / Emprego
              </label>
              <input
                id="crm-emprego"
                value={formEmprego}
                onChange={(e) => setFormEmprego(e.target.value)}
                placeholder="Ex: Gerente de Parcerias"
                className="w-full font-plex-sans text-[13px] text-navy dark:text-white border border-navy/20 dark:border-white/15 rounded px-3 py-2.5 bg-white dark:bg-white/5 placeholder:text-navy/30 dark:placeholder:text-white/25 focus:outline-none focus:border-navy/60 dark:focus:border-white/40"
              />
            </div>

            <div>
              <label
                htmlFor="crm-empresa"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-3 block"
              >
                Empresa
              </label>
              <input
                id="crm-empresa"
                value={formEmpresa}
                onChange={(e) => setFormEmpresa(e.target.value)}
                placeholder="Nome da empresa"
                className="w-full font-plex-sans text-[13px] text-navy dark:text-white border border-navy/20 dark:border-white/15 rounded px-3 py-2.5 bg-white dark:bg-white/5 placeholder:text-navy/30 dark:placeholder:text-white/25 focus:outline-none focus:border-navy/60 dark:focus:border-white/40"
              />
            </div>

            <div>
              <label
                htmlFor="crm-telefone"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-3 block"
              >
                Telefone
              </label>
              <input
                id="crm-telefone"
                value={formTelefone}
                onChange={(e) => setFormTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full font-plex-sans text-[13px] text-navy dark:text-white border border-navy/20 dark:border-white/15 rounded px-3 py-2.5 bg-white dark:bg-white/5 placeholder:text-navy/30 dark:placeholder:text-white/25 focus:outline-none focus:border-navy/60 dark:focus:border-white/40"
              />
            </div>

            <div>
              <label
                htmlFor="crm-email"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-3 block"
              >
                E-mail
              </label>
              <input
                id="crm-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@empresa.com"
                className="w-full font-plex-sans text-[13px] text-navy dark:text-white border border-navy/20 dark:border-white/15 rounded px-3 py-2.5 bg-white dark:bg-white/5 placeholder:text-navy/30 dark:placeholder:text-white/25 focus:outline-none focus:border-navy/60 dark:focus:border-white/40"
              />
            </div>

            <div>
              <label
                htmlFor="crm-linkedin"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 dark:text-white/50 mb-3 block"
              >
                LinkedIn
              </label>
              <input
                id="crm-linkedin"
                type="url"
                value={formLinkedin}
                onChange={(e) => setFormLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/usuario"
                className="w-full font-plex-sans text-[13px] text-navy dark:text-white border border-navy/20 dark:border-white/15 rounded px-3 py-2.5 bg-white dark:bg-white/5 placeholder:text-navy/30 dark:placeholder:text-white/25 focus:outline-none focus:border-navy/60 dark:focus:border-white/40"
              />
            </div>
          </div>

          <div className="flex-shrink-0">
            <div className="h-px bg-navy/15 dark:bg-white/10" />
            <div className="px-8 py-6">
              <button
                onClick={salvar}
                disabled={!formNome.trim() || salvando}
                className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy dark:bg-white dark:text-navy px-4 py-3 rounded hover:bg-navy/90 dark:hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {salvando ? "Salvando..." : contatoEditando ? "Salvar contato" : "Criar contato"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
