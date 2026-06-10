import { X } from "lucide-react";
import { useState, useEffect } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { UserAvatar } from "@/components/ui/user-avatar";
import { supabase } from "@/lib/supabase";

import type { Liga } from "@link-leagues/types";

interface MembroResumo {
  id: string;
  usuario_id: string;
  nome: string;
  email: string;
  cargo: string | null;
}

interface UsuarioBusca {
  id: string;
  nome: string;
  email: string;
}

interface LigaMembrosSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liga: Liga | null;
  onSalvo: () => void;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function LigaMembrosSheet({ open, onOpenChange, liga, onSalvo }: LigaMembrosSheetProps) {
  const [membros, setMembros] = useState<MembroResumo[]>([]);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<UsuarioBusca[]>([]);
  const [cargoNovo, setCargoNovo] = useState("");
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<UsuarioBusca | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open && liga) {
      void carregarMembros();
      setBusca("");
      setResultados([]);
      setUsuarioSelecionado(null);
      setCargoNovo("");
    }
  }, [open, liga]);

  useEffect(() => {
    if (busca.length < 2) {
      setResultados([]);
      return;
    }
    const timer = setTimeout(async () => {
      const token = await getToken();
      const res = await fetch(`/api/usuarios/busca?email=${encodeURIComponent(busca)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setResultados(await res.json());
    }, 300);
    return () => clearTimeout(timer);
  }, [busca]);

  async function carregarMembros() {
    if (!liga) return;
    setCarregando(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/ligas/${liga.id}/membros`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setMembros(await res.json());
    } finally {
      setCarregando(false);
    }
  }

  async function removerMembro(usuarioId: string) {
    if (!liga) return;
    const token = await getToken();
    await fetch(`/api/ligas/${liga.id}/membros/${usuarioId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setMembros((prev) => prev.filter((m) => m.usuario_id !== usuarioId));
    onSalvo();
  }

  function selecionarUsuario(u: UsuarioBusca) {
    setUsuarioSelecionado(u);
    setBusca(u.email);
    setResultados([]);
  }

  async function adicionarMembro() {
    if (!liga || !usuarioSelecionado) return;
    setSalvando(true);
    try {
      const token = await getToken();
      await fetch(`/api/ligas/${liga.id}/membros`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          usuario_id: usuarioSelecionado.id,
          cargo: cargoNovo.trim() || null,
        }),
      });
      setBusca("");
      setUsuarioSelecionado(null);
      setCargoNovo("");
      await carregarMembros();
      onSalvo();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0 bg-background"
      >
        <div className="flex-shrink-0">
          <div className="h-px bg-foreground/20" />
          <div className="px-8 pt-8 pb-6">
            <p className="text-xs text-foreground/40">Membros</p>
            <h2 className="font-display font-bold text-2xl text-foreground mt-1">
              {liga?.nome ?? "—"}
            </h2>
          </div>
          <div className="h-px bg-border" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
          {/* Adicionar membro */}
          <div>
            <p className="text-xs text-foreground/50 mb-3">Adicionar membro</p>

            <div className="relative">
              <input
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  if (usuarioSelecionado) setUsuarioSelecionado(null);
                }}
                placeholder="Buscar por e-mail..."
                className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none"
              />
              {resultados.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 bg-background border border-border rounded overflow-hidden">
                  {resultados.map((u) => (
                    <button
                      key={u.id}
                      className="w-full text-left px-4 py-3 hover:bg-muted border-b border-border last:border-0 flex items-center gap-3 transition-colors"
                      onClick={() => selecionarUsuario(u)}
                    >
                      <UserAvatar nome={u.nome} className="size-7 rounded" />
                      <div>
                        <p className="font-medium text-sm text-foreground">{u.nome}</p>
                        <p className="text-xs text-foreground/50">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {usuarioSelecionado && (
              <input
                value={cargoNovo}
                onChange={(e) => setCargoNovo(e.target.value)}
                placeholder="Cargo (ex: Diretor, Membro...)"
                className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none mt-3"
              />
            )}

            <button
              onClick={() => void adicionarMembro()}
              disabled={!usuarioSelecionado || salvando}
              className="w-full rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed mt-3"
            >
              {salvando ? "Adicionando..." : "Adicionar membro"}
            </button>
          </div>

          {/* Lista de membros */}
          <div>
            <p className="text-xs text-foreground/50 mb-3">
              Membros atuais{membros.length > 0 && ` (${membros.length})`}
            </p>

            {carregando ? (
              <p className="text-sm text-foreground/40">Carregando...</p>
            ) : membros.length === 0 ? (
              <p className="text-sm text-foreground/40">Nenhum membro nesta liga ainda.</p>
            ) : (
              <div className="border-t border-border">
                {membros.map((m) => (
                  <div
                    key={m.id}
                    className="border-b border-border py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar nome={m.nome} className="size-8 rounded" />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{m.nome}</p>
                        <p className="text-xs text-foreground/50 truncate">{m.email}</p>
                        {m.cargo && <span className="text-xs text-foreground/40">{m.cargo}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => void removerMembro(m.usuario_id)}
                      className="flex-shrink-0 text-foreground/30 hover:text-red-500 transition-colors"
                      title="Remover membro"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
