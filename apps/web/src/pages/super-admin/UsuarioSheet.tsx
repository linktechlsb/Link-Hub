import { useState, useEffect } from "react";
import type { UserRole } from "@link-leagues/types";
import { supabase } from "@/lib/supabase";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ nome: nome.trim(), role }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Erro ao atualizar usuário.");
        }
      } else {
        const res = await fetch("/api/usuarios", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
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

  const titulo = usuario ? "Editar usuário" : "Novo usuário";
  const podeSalvar = nome.trim().length > 0 && (!!usuario || email.trim().length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0">
        <SheetHeader className="p-6 pb-4 border-b border-brand-gray">
          <SheetTitle className="font-display font-bold text-navy">{titulo}</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {usuario ? "Atualize os dados do usuário" : "Preencha os dados para criar um novo usuário"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-navy font-semibold">
              Nome completo
            </Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João da Silva"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-navy font-semibold">
              Email estudantil
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao.silva@facul.edu.br"
              disabled={!!usuario}
              className={usuario ? "opacity-60 cursor-not-allowed bg-muted" : ""}
            />
            {!usuario && (
              <p className="text-xs text-muted-foreground">
                O usuário receberá um acesso para criar sua senha.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-navy font-semibold">
              Role
            </Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full text-sm border border-brand-gray rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 bg-white text-navy"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {!usuario && (
            <div className="space-y-2">
              <Label htmlFor="liga" className="text-navy font-semibold">
                Liga <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <select
                id="liga"
                value={ligaId}
                onChange={(e) => setLigaId(e.target.value)}
                className="w-full text-sm border border-brand-gray rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 bg-white text-navy"
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

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {erro}
            </p>
          )}
        </div>

        <div className="p-6 border-t border-brand-gray">
          <Button
            className="w-full bg-navy hover:bg-navy/90 text-white font-semibold"
            onClick={handleSalvar}
            disabled={salvando || !podeSalvar}
          >
            {salvando ? "Salvando..." : usuario ? "Salvar alterações" : "Criar usuário"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
