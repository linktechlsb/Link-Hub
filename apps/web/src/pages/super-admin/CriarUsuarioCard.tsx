import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

import type { UserRole } from "@link-leagues/types";

interface LigaResumo {
  id: string;
  nome: string;
}

interface CriarUsuarioCardProps {
  ligas: LigaResumo[];
  onSalvo: () => void;
  onFechar: () => void;
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

export function CriarUsuarioCard({ ligas, onSalvo, onFechar }: CriarUsuarioCardProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("membro");
  const [ligaId, setLigaId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const podeSalvar = nome.trim().length > 0 && email.trim().length > 0;

  async function handleSalvar() {
    if (!podeSalvar) return;
    setSalvando(true);
    setErro("");
    try {
      const token = await getToken();
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
      onSalvo();
      onFechar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden flex flex-col">
      <div className="px-6 pt-6 pb-4 border-b border-foreground/[0.08]">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40">
          Novo
        </p>
        <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-foreground mt-1">
          Adicionar usuário
        </h2>
      </div>

      <div className="px-6 py-5 space-y-6">
        <div>
          <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
            Nome completo
          </label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: João da Silva"
            className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
          />
        </div>

        <div>
          <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
            Email estudantil
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="joao.silva@facul.edu.br"
            className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
          />
          <p className="font-plex-sans text-[11px] text-foreground/40 mt-1.5">
            O usuário receberá um acesso para criar sua senha.
          </p>
        </div>

        <div>
          <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
            Role
          </label>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger className="w-full font-plex-sans text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value} className="font-plex-sans text-[13px]">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-2 block">
            Liga{" "}
            <span className="normal-case font-plex-sans text-[11px] text-foreground/30">
              (opcional)
            </span>
          </label>
          <Select
            value={ligaId || "__none__"}
            onValueChange={(v) => setLigaId(v === "__none__" ? "" : v)}
          >
            <SelectTrigger className="w-full font-plex-sans text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="font-plex-sans text-[13px]">
                — Sem liga —
              </SelectItem>
              {ligas.map((l) => (
                <SelectItem key={l.id} value={l.id} className="font-plex-sans text-[13px]">
                  {l.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {erro && <p className="font-plex-sans text-[12px] text-red-500">{erro}</p>}
      </div>

      <div className="border-t border-foreground/[0.08] px-6 py-4 flex flex-col gap-2">
        <button
          onClick={() => void handleSalvar()}
          disabled={salvando || !podeSalvar}
          className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-[#10244D] px-4 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {salvando ? "Salvando..." : "Criar usuário"}
        </button>
        <button
          onClick={onFechar}
          disabled={salvando}
          className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/20 px-4 py-3 rounded-full hover:bg-foreground/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
