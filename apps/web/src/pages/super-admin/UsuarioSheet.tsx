import { useState, useEffect } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";

import type { UserRole } from "@link-leagues/types";

interface UsuarioResumo {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  liga_id?: string;
  liga_nome?: string;
}

interface LigaResumo {
  id: string;
  nome: string;
}

interface UsuarioSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario?: UsuarioResumo;
  ligas: LigaResumo[];
  onSalvo: () => void;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: "membro", label: "Membro" },
  { value: "diretor", label: "Diretor" },
  { value: "professor", label: "Professor" },
  { value: "staff", label: "Staff" },
];

export function UsuarioSheet({ open, onOpenChange, usuario, ligas, onSalvo }: UsuarioSheetProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("membro");
  const [ligaId, setLigaId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (open) {
      setNome(usuario?.nome ?? "");
      setEmail(usuario?.email ?? "");
      setRole(usuario?.role ?? "membro");
      setLigaId(usuario?.liga_id ?? "");
      setErro("");
    }
  }, [open, usuario]);

  async function handleSalvar() {
    if (!nome.trim() || (!usuario && !email.trim())) return;
    setSalvando(true);
    setErro("");
    try {
      const token = await getToken();

      if (usuario) {
        const res = await fetch(`/api/usuarios/${usuario.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ nome: nome.trim(), role }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Erro ao atualizar usuário.");
        }
      } else {
        const res = await fetch("/api/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            nome: nome.trim(),
            email: email.trim(),
            role,
            liga_id: ligaId || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Erro ao criar usuário.");
        }
      }

      onSalvo();
      onOpenChange(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setSalvando(false);
    }
  }

  const isNovo = !usuario;
  const podeSalvar = nome.trim().length > 0 && (!!usuario || email.trim().length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0 bg-white"
      >
        <div className="flex-shrink-0">
          <div className="h-px bg-navy/90" />
          <div className="px-8 pt-8 pb-6">
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50">
              {isNovo ? "Novo" : "Editar"}
            </p>
            <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mt-1">
              {isNovo ? "Criar usuário" : usuario.nome}
            </h2>
          </div>
          <div className="h-px bg-navy/15" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          <div>
            <label
              htmlFor="u-nome"
              className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
            >
              Nome completo
            </label>
            <input
              id="u-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João da Silva"
              className="w-full border border-navy/20 px-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60"
            />
          </div>

          <div>
            <label
              htmlFor="u-email"
              className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
            >
              Email estudantil
            </label>
            <input
              id="u-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao.silva@facul.edu.br"
              disabled={!!usuario}
              className="w-full border border-navy/20 px-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {isNovo && (
              <p className="font-plex-sans text-[11px] text-navy/40 mt-1.5">
                O usuário receberá um acesso para criar sua senha.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="u-role"
              className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
            >
              Role
            </label>
            <select
              id="u-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full border border-navy/20 px-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {isNovo && (
            <div>
              <label
                htmlFor="u-liga"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
              >
                Liga{" "}
                <span className="normal-case font-plex-sans text-[11px] text-navy/40">
                  (opcional)
                </span>
              </label>
              <select
                id="u-liga"
                value={ligaId}
                onChange={(e) => setLigaId(e.target.value)}
                className="w-full border border-navy/20 px-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60"
              >
                <option value="">— Sem liga —</option>
                {ligas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {erro && <p className="font-plex-sans text-[12px] text-red-600">{erro}</p>}
        </div>

        <div className="flex-shrink-0">
          <div className="h-px bg-navy/15" />
          <div className="px-8 py-6">
            <button
              onClick={() => void handleSalvar()}
              disabled={salvando || !podeSalvar}
              className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {salvando ? "Salvando..." : isNovo ? "Criar usuário" : "Salvar alterações"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
