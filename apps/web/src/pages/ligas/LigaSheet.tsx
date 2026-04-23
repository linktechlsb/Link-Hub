import { useState, useRef, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function LigaSheet({ open, onOpenChange, liga, onSalvo }: LigaSheetProps) {
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
      <SheetContent side="right" className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0">
        <SheetHeader className="p-6 pb-4 border-b border-brand-gray">
          <SheetTitle className="font-display font-bold text-navy">{titulo}</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Preencha as informações da liga
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Imagem */}
          <div className="space-y-2">
            <Label className="text-navy font-semibold">Imagem da liga</Label>
            <div
              className="border-2 border-dashed border-brand-gray rounded-xl p-6 text-center cursor-pointer hover:border-link-blue transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-24 w-full object-cover rounded-lg"
                />
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Clique para fazer upload</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG até 2MB</p>
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
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-navy font-semibold">
              Nome da liga
            </Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Liga de Tecnologia"
            />
          </div>

          {/* Diretores */}
          <div className="space-y-2">
            <Label className="text-navy font-semibold">Diretores</Label>
            <div className="relative">
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por e-mail..."
              />
              {resultados.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-brand-gray rounded-xl shadow-md z-10 overflow-hidden">
                  {resultados.map((u) => (
                    <button
                      key={u.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted text-sm flex items-center gap-3 border-b border-brand-gray last:border-0"
                      onClick={() => adicionarDiretor(u)}
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

            {diretores.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {diretores.map((d) => (
                  <span
                    key={d.id}
                    className="inline-flex items-center gap-1.5 bg-navy text-white text-xs rounded-full px-3 py-1"
                  >
                    {d.nome}
                    <button
                      onClick={() => removerDiretor(d.id)}
                      className="opacity-70 hover:opacity-100"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Professor responsável */}
          <div className="space-y-2">
            <Label className="text-navy font-semibold">Professor responsável</Label>
            <select
              value={professorId}
              onChange={(e) => setProfessorId(e.target.value)}
              className="w-full text-sm border border-brand-gray rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
            >
              <option value="">Nenhum</option>
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.email})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Somente o professor atribuído pode aprovar projetos desta liga.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-brand-gray">
          <Button
            className="w-full bg-navy hover:bg-navy/90 text-white font-semibold"
            onClick={handleSalvar}
            disabled={salvando || !nome.trim()}
          >
            {salvando ? "Salvando..." : "Salvar liga"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
