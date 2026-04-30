import { useState, useRef, useEffect } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";

import type { Liga } from "@link-leagues/types";

interface DiretorBusca {
  id: string;
  nome: string;
  email: string;
}

interface Professor {
  id: string;
  nome: string;
  email: string;
}

interface LigaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liga?: Liga;
  onSalvo: () => void;
  role?: string;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function LigaSheet({ open, onOpenChange, liga, onSalvo, role }: LigaSheetProps) {
  const isDiretor = role === "diretor";
  const [nome, setNome] = useState(liga?.nome ?? "");
  const [diretores, setDiretores] = useState<DiretorBusca[]>([]);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<DiretorBusca[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(liga?.imagem_url ?? null);
  const [salvando, setSalvando] = useState(false);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [professorId, setProfessorId] = useState<string>(liga?.professor_id ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setNome(liga?.nome ?? "");
      setDiretores((liga?.diretores ?? []).map((d) => ({ id: d.id, nome: d.nome, email: "" })));
      setImagePreview(liga?.imagem_url ?? null);
      setImageFile(null);
      setBusca("");
      setResultados([]);
      setProfessorId(liga?.professor_id ?? "");
    }
  }, [open, liga]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const token = await getToken();
      const res = await fetch("/api/usuarios/professores", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProfessores(await res.json());
    })();
  }, [open]);

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

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function adicionarDiretor(usuario: DiretorBusca) {
    if (diretores.some((d) => d.id === usuario.id)) return;
    setDiretores((prev) => [...prev, usuario]);
    setBusca("");
    setResultados([]);
  }

  function removerDiretor(id: string) {
    setDiretores((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleSalvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      const token = await getToken();
      const body = {
        nome: nome.trim(),
        diretores: diretores.map((d) => d.id),
        professor_id: professorId || null,
      };

      let ligaId: string;

      if (liga) {
        const res = await fetch(`/api/ligas/${liga.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Erro ao atualizar liga.");
        ligaId = liga.id;
      } else {
        const res = await fetch("/api/ligas", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Erro ao criar liga.");
        const novaLiga = await res.json();
        ligaId = novaLiga.id;
      }

      if (imageFile) {
        const formData = new FormData();
        formData.append("imagem", imageFile);
        await fetch(`/api/ligas/${ligaId}/imagem`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      onSalvo();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSalvando(false);
    }
  }

  const titulo = liga ? "Editar liga" : "Adicionar liga";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0 bg-white"
      >
        {/* Header */}
        <div className="flex-shrink-0">
          <div className="h-px bg-navy/90" />
          <div className="px-8 pt-8 pb-6">
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50">
              {liga ? "Editar" : "Novo"}
            </p>
            <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mt-1">
              {titulo}
            </h2>
          </div>
          <div className="h-px bg-navy/15" />
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
          {/* Imagem */}
          <div>
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
              Imagem da liga
            </p>
            <div
              className="border border-navy/20 p-5 text-center cursor-pointer hover:border-navy/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="h-24 w-full object-cover" />
              ) : (
                <>
                  <p className="font-plex-sans text-[13px] text-navy/50">
                    Clique para fazer upload
                  </p>
                  <p className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/30 mt-1">
                    PNG · JPG · Até 2MB
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

          {/* Nome */}
          <div>
            <label
              htmlFor="nome"
              className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
            >
              Nome da liga
            </label>
            <input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Liga de Tecnologia"
              className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white placeholder:text-navy/30 focus:outline-none focus:border-navy/60"
            />
          </div>

          {/* Diretores — visível apenas para staff */}
          {!isDiretor && (
            <div>
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
                Diretores
              </p>
              <div className="relative">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por e-mail..."
                  className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white placeholder:text-navy/30 focus:outline-none focus:border-navy/60"
                />
                {resultados.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-px bg-white border border-navy/20 z-10">
                    {resultados.map((u) => (
                      <button
                        key={u.id}
                        className="w-full text-left px-4 py-3 hover:bg-navy/[0.03] flex items-center gap-3 border-b border-navy/10 last:border-0 transition-colors"
                        onClick={() => adicionarDiretor(u)}
                      >
                        <div className="h-6 w-6 bg-navy text-white flex items-center justify-center font-plex-mono text-[9px] font-bold flex-shrink-0">
                          {u.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-plex-sans text-[13px] font-medium text-navy">
                            {u.nome}
                          </p>
                          <p className="font-plex-mono text-[10px] text-navy/50">{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {diretores.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {diretores.map((d) => (
                    <span
                      key={d.id}
                      className="inline-flex items-center gap-2 border border-navy px-2.5 py-1 font-plex-sans text-[12px] text-navy"
                    >
                      {d.nome}
                      <button
                        onClick={() => removerDiretor(d.id)}
                        className="font-plex-mono text-[10px] text-navy/50 hover:text-navy transition-colors"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Professor responsável — visível apenas para staff */}
          {!isDiretor && (
            <div>
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
                Professor responsável
              </p>
              <select
                value={professorId}
                onChange={(e) => setProfessorId(e.target.value)}
                className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white focus:outline-none focus:border-navy/60"
              >
                <option value="">Nenhum</option>
                {professores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({p.email})
                  </option>
                ))}
              </select>
              <p className="font-plex-mono text-[10px] tracking-[0.08em] text-navy/40 mt-2">
                Somente o professor atribuído pode aprovar projetos desta liga.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0">
          <div className="h-px bg-navy/15" />
          <div className="px-8 py-6">
            <button
              onClick={handleSalvar}
              disabled={salvando || !nome.trim()}
              className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {salvando ? "Salvando..." : "Salvar liga"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
