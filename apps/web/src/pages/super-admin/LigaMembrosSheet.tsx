import { useState, useEffect } from "react";
import type { Liga } from "@link-leagues/types";
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
import { X, UserPlus } from "lucide-react";

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
      carregarMembros();
      setBusca("");
      setResultados([]);
      setUsuarioSelecionado(null);
      setCargoNovo("");
    }
  }, [open, liga]);

  useEffect(() => {
    if (busca.length < 2) { setResultados([]); return; }
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
      <SheetContent side="right" className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0">
        <SheetHeader className="p-6 pb-4 border-b border-brand-gray">
          <SheetTitle className="font-display font-bold text-navy">
            Membros — {liga?.nome}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Gerencie os membros desta liga
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Adicionar membro */}
          <div className="space-y-3">
            <Label className="text-navy font-semibold">Adicionar membro</Label>

            <div className="relative">
              <Input
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  if (usuarioSelecionado) setUsuarioSelecionado(null);
                }}
                placeholder="Buscar por e-mail..."
              />
              {resultados.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-brand-gray rounded-xl shadow-md z-10 overflow-hidden">
                  {resultados.map((u) => (
                    <button
                      key={u.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted text-sm flex items-center gap-3 border-b border-brand-gray last:border-0"
                      onClick={() => selecionarUsuario(u)}
                    >
                      <div className="h-7 w-7 rounded-full bg-navy text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {u.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-navy">{u.nome}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {usuarioSelecionado && (
              <Input
                value={cargoNovo}
                onChange={(e) => setCargoNovo(e.target.value)}
                placeholder="Cargo (ex: Diretor, Membro...)"
              />
            )}

            <Button
              className="w-full bg-navy hover:bg-navy/90 text-white font-semibold flex items-center gap-2"
              onClick={adicionarMembro}
              disabled={!usuarioSelecionado || salvando}
            >
              <UserPlus className="h-4 w-4" />
              {salvando ? "Adicionando..." : "Adicionar membro"}
            </Button>
          </div>

          {/* Lista de membros */}
          <div className="space-y-2">
            <Label className="text-navy font-semibold">
              Membros atuais{membros.length > 0 && ` (${membros.length})`}
            </Label>

            {carregando ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
            ) : membros.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum membro nesta liga ainda.
              </p>
            ) : (
              <div className="space-y-1">
                {membros.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-brand-gray bg-white hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-navy text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {m.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy truncate">{m.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                        {m.cargo && (
                          <span className="text-[10px] font-bold text-link-blue uppercase tracking-wider">
                            {m.cargo}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removerMembro(m.usuario_id)}
                      className="flex-shrink-0 ml-2 p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
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
