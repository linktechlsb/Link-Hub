import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";

type CategoriaAPI = { id: string; nome: string; descricao?: string; liga_id?: string | null };

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

interface CategoriasSheetProps {
  open: boolean;
  onClose: () => void;
  ligaId: string;
}

export function CategoriasSheet({ open, onClose, ligaId }: CategoriasSheetProps) {
  const [categorias, setCategorias] = useState<CategoriaAPI[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [editando, setEditando] = useState<CategoriaAPI | null>(null);
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/categorias-projeto?liga_id=${ligaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as CategoriaAPI[];
      setCategorias(Array.isArray(data) ? data : []);
    } catch {
      setCategorias([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (open) void carregar();
  }, [open, ligaId]);

  function abrirCriar() {
    setEditando(null);
    setNome("");
    setDescricao("");
    setCriando(true);
  }

  function abrirEditar(c: CategoriaAPI) {
    if (!c.liga_id) return; // categorias base não são editáveis aqui
    setCriando(false);
    setNome(c.nome);
    setDescricao(c.descricao ?? "");
    setEditando(c);
  }

  function cancelar() {
    setCriando(false);
    setEditando(null);
    setNome("");
    setDescricao("");
  }

  async function salvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      const token = await getToken();
      if (editando) {
        const res = await fetch(`/api/categorias-projeto/${editando.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ nome: nome.trim(), descricao: descricao.trim() || undefined }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(err.error ?? "Erro ao atualizar categoria.");
          return;
        }
        toast.success("Categoria atualizada.");
      } else {
        const res = await fetch("/api/categorias-projeto", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            nome: nome.trim(),
            descricao: descricao.trim() || undefined,
            liga_id: ligaId,
          }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(err.error ?? "Erro ao criar categoria.");
          return;
        }
        toast.success("Categoria criada.");
      }
      cancelar();
      void carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function remover(c: CategoriaAPI) {
    if (!c.liga_id) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/categorias-projeto/${c.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Erro ao remover categoria.");
        return;
      }
      toast.success("Categoria removida.");
      void carregar();
    } catch {
      toast.error("Erro ao remover categoria.");
    }
  }

  const categoriasBase = categorias.filter((c) => !c.liga_id);
  const categoriasDaLiga = categorias.filter((c) => c.liga_id);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent className="w-full sm:max-w-md p-0 gap-0 flex flex-col">
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-foreground/[0.08]">
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40">
            Projetos
          </p>
          <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-foreground mt-1">
            Categorias
          </h2>
          <p className="text-[13px] text-foreground/50 mt-1">
            Gerencie as categorias de projeto da sua liga.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {carregando ? (
            <p className="font-plex-sans text-[13px] text-foreground/40">Carregando...</p>
          ) : (
            <>
              {categoriasBase.length > 0 && (
                <div>
                  <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/30 mb-3">
                    Categorias Base
                  </p>
                  <ul className="space-y-1">
                    {categoriasBase.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center gap-2 px-3 py-2.5 rounded bg-muted/50"
                      >
                        <span className="font-plex-sans text-[13px] text-foreground flex-1">
                          {c.nome}
                        </span>
                        {c.descricao && (
                          <span className="font-plex-sans text-[11px] text-foreground/40 truncate max-w-[160px]">
                            {c.descricao}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/30">
                    Categorias da Liga
                  </p>
                  {!criando && !editando && (
                    <button
                      onClick={abrirCriar}
                      className="flex items-center gap-1 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/50 hover:text-foreground transition-colors"
                    >
                      <Plus size={12} />
                      Nova
                    </button>
                  )}
                </div>

                {(criando || editando) && (
                  <div className="border border-border rounded p-4 space-y-3 mb-4 bg-muted/30">
                    <div>
                      <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5 block">
                        Nome *
                      </label>
                      <input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Nome da categoria"
                        autoFocus
                        className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2 bg-background placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
                      />
                    </div>
                    <div>
                      <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5 block">
                        Descrição
                      </label>
                      <input
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        placeholder="Descrição opcional..."
                        className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2 bg-background placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void salvar()}
                        disabled={salvando || !nome.trim()}
                        className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-white bg-[#10244D] px-4 py-2 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {salvando ? "Salvando..." : editando ? "Salvar" : "Criar"}
                      </button>
                      <button
                        onClick={cancelar}
                        disabled={salvando}
                        className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground border border-foreground/20 px-4 py-2 rounded-full hover:bg-foreground/[0.06] transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {categoriasDaLiga.length === 0 && !criando ? (
                  <p className="font-plex-sans text-[13px] text-foreground/40">
                    Nenhuma categoria customizada ainda.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {categoriasDaLiga.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center gap-2 px-3 py-2.5 rounded bg-muted/50 group"
                      >
                        <span className="font-plex-sans text-[13px] text-foreground flex-1">
                          {c.nome}
                        </span>
                        {c.descricao && (
                          <span className="font-plex-sans text-[11px] text-foreground/40 truncate max-w-[120px]">
                            {c.descricao}
                          </span>
                        )}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => abrirEditar(c)}
                            className="p-1 text-foreground/40 hover:text-foreground transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => void remover(c)}
                            className="p-1 text-foreground/40 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-foreground/[0.08] px-6 py-4">
          <button
            onClick={onClose}
            className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/20 px-4 py-3 rounded-full hover:bg-foreground/[0.06] transition-colors"
          >
            Fechar
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
