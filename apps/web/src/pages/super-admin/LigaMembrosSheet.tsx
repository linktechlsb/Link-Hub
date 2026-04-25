import { X } from "lucide-react";
import { useState, useEffect } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
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
        className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0 bg-white"
      >
        <div className="flex-shrink-0">
          <div className="h-px bg-navy/90" />
          <div className="px-8 pt-8 pb-6">
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50">
              Membros
            </p>
            <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mt-1">
              {liga?.nome ?? "—"}
            </h2>
          </div>
          <div className="h-px bg-navy/15" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
          {/* Adicionar membro */}
          <div>
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
              Adicionar membro
            </p>

            <div className="relative">
              <input
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  if (usuarioSelecionado) setUsuarioSelecionado(null);
                }}
                placeholder="Buscar por e-mail..."
                className="w-full border border-navy/20 px-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60"
              />
              {resultados.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 bg-white border border-navy/15 overflow-hidden">
                  {resultados.map((u) => (
                    <button
                      key={u.id}
                      className="w-full text-left px-4 py-3 hover:bg-navy/[0.03] border-b border-navy/10 last:border-0 flex items-center gap-3 transition-colors"
                      onClick={() => selecionarUsuario(u)}
                    >
                      <div className="h-7 w-7 bg-navy flex items-center justify-center flex-shrink-0">
                        <span className="font-plex-mono text-[10px] text-white">
                          {u.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-plex-sans font-medium text-[13px] text-navy">{u.nome}</p>
                        <p className="font-plex-mono text-[10px] text-navy/50">{u.email}</p>
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
                className="w-full border border-navy/20 px-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60 mt-3"
              />
            )}

            <button
              onClick={() => void adicionarMembro()}
              disabled={!usuarioSelecionado || salvando}
              className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-3"
            >
              {salvando ? "Adicionando..." : "Adicionar membro"}
            </button>
          </div>

          {/* Lista de membros */}
          <div>
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
              Membros atuais{membros.length > 0 && ` (${membros.length})`}
            </p>

            {carregando ? (
              <p className="font-plex-sans text-[13px] text-navy/50">Carregando...</p>
            ) : membros.length === 0 ? (
              <p className="font-plex-sans text-[13px] text-navy/50">
                Nenhum membro nesta liga ainda.
              </p>
            ) : (
              <div className="border-t border-navy/15">
                {membros.map((m) => (
                  <div
                    key={m.id}
                    className="border-b border-navy/10 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 bg-navy flex items-center justify-center flex-shrink-0">
                        <span className="font-plex-mono text-[10px] text-white">
                          {m.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-plex-sans font-semibold text-[13px] text-navy truncate">
                          {m.nome}
                        </p>
                        <p className="font-plex-mono text-[10px] text-navy/50 truncate">
                          {m.email}
                        </p>
                        {m.cargo && (
                          <span className="font-plex-mono text-[9px] uppercase tracking-[0.14em] text-navy/60">
                            {m.cargo}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => void removerMembro(m.usuario_id)}
                      className="flex-shrink-0 text-navy/30 hover:text-red-500 transition-colors"
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
