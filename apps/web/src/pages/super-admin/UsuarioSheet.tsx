import { useState, useEffect } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
          body: JSON.stringify({ nome: nome.trim(), role, liga_id: ligaId || null }),
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
      <SheetContent side="right" className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0">
        <div className="flex-shrink-0">
          <div className="h-px bg-foreground/20" />
          <div className="px-8 pt-8 pb-6">
            <p className="text-xs text-foreground/40">{isNovo ? "Novo" : "Editar"}</p>
            <h2 className="font-display font-bold text-2xl text-foreground mt-1">
              {isNovo ? "Criar usuário" : usuario.nome}
            </h2>
          </div>
          <div className="h-px bg-border" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          <div>
            <label htmlFor="u-nome" className="text-xs font-medium text-foreground/60 mb-3 block">
              Nome completo
            </label>
            <input
              id="u-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João da Silva"
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="u-email" className="text-xs font-medium text-foreground/60 mb-3 block">
              Email estudantil
            </label>
            <input
              id="u-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao.silva@facul.edu.br"
              disabled={!!usuario}
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {isNovo && (
              <p className="text-xs text-foreground/40 mt-1.5">
                O usuário receberá um acesso para criar sua senha.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="u-role" className="text-xs font-medium text-foreground/60 mb-3 block">
              Role
            </label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger id="u-role" className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="u-liga" className="text-xs font-medium text-foreground/60 mb-3 block">
              Liga <span className="text-xs text-foreground/30">(opcional)</span>
            </label>
            <Select
              value={ligaId || "__none__"}
              onValueChange={(v) => setLigaId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger id="u-liga" className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sem liga —</SelectItem>
                {ligas.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {erro && <p className="text-sm text-red-500">{erro}</p>}
        </div>

        <div className="flex-shrink-0">
          <div className="h-px bg-border" />
          <div className="px-8 py-6 flex flex-col gap-3">
            <button
              onClick={() => void handleSalvar()}
              disabled={salvando || !podeSalvar}
              className="w-full rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {salvando ? "Salvando..." : isNovo ? "Criar usuário" : "Salvar alterações"}
            </button>
            <button
              onClick={() => onOpenChange(false)}
              disabled={salvando}
              className="w-full rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
