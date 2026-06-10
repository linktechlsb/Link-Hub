import { MoreHorizontal, Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { supabase } from "@/lib/supabase";

import { LigaSheet } from "./LigaSheet";

import type { Liga, UserRole } from "@link-leagues/types";

/** Encurta para "Primeiro Último" quando há nomes do meio. */
function primeiroUltimoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length <= 2) return nome;
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

/** Diretores principais da liga, no máximo 2. */
function nomesDiretores(liga: Liga): string[] {
  return (liga.diretores ?? []).map((d) => primeiroUltimoNome(d.nome)).slice(0, 2);
}

export function LigasPage() {
  const navigate = useNavigate();
  const { data: ligasData, refetch: refetchLigas } = useCachedFetch<Liga[]>("/api/ligas");
  const ligas = ligasData ?? [];
  const carregando = ligasData === null;
  const [role, setRole] = useState<UserRole | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ligaParaEditar, setLigaParaEditar] = useState<Liga | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) return;
      setUserEmail(session.user.email ?? null);

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id, role")
        .eq("email", session.user.email)
        .single();

      setRole((usuario?.role as UserRole) ?? "membro");
      setUserId(usuario?.id ?? null);
    });
  }, []);

  function abrirEditar(liga: Liga) {
    setLigaParaEditar(liga);
    setSheetOpen(true);
  }

  function abrirAdicionar() {
    setLigaParaEditar(undefined);
    setSheetOpen(true);
  }

  const minhaLiga = ligas.find(
    (l) => l.lider_email === userEmail || (userId && l.diretores?.some((d) => d.id === userId)),
  );

  function podeEditar(liga: Liga): boolean {
    return role === "staff" || (role === "diretor" && minhaLiga?.id === liga.id);
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Ligas</h1>
          <p className="mt-1 text-sm text-foreground/50">Todas as ligas acadêmicas da Link</p>
        </div>
        {role === "staff" && (
          <button
            onClick={abrirAdicionar}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted dark:border-white dark:bg-white dark:text-navy dark:hover:bg-white/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar liga
          </button>
        )}
      </div>

      {/* Galeria */}
      {carregando ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col">
              <Skeleton className="aspect-[16/10] w-full rounded-2xl bg-foreground/5" />
              <Skeleton className="mt-3 h-5 w-40 bg-foreground/5" />
              <Skeleton className="mt-2 h-3 w-52 bg-foreground/5" />
            </div>
          ))}
        </div>
      ) : ligas.length === 0 ? (
        <p className="text-sm text-foreground/50">Nenhuma liga cadastrada.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-8">
          {ligas.map((liga) => {
            const ehMinha = minhaLiga?.id === liga.id;
            const diretores = nomesDiretores(liga);
            const subtitle = diretores.join(", ");
            return (
              <div key={liga.id} className="group flex flex-col">
                {/* Foto / capa */}
                <button
                  onClick={() => navigate(`/ligas/${liga.id}`)}
                  className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-border bg-muted transition-colors hover:border-foreground/20"
                >
                  {liga.imagem_url ? (
                    <img
                      src={liga.imagem_url}
                      alt={liga.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Users className="size-8 text-foreground/15" />
                    </div>
                  )}

                  {podeEditar(liga) && (
                    <span
                      className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                      role="presentation"
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="flex size-7 items-center justify-center rounded-full bg-background/80 text-foreground/60 backdrop-blur transition-colors hover:text-foreground"
                            aria-label="Opções da liga"
                          >
                            <MoreHorizontal size={15} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[140px]">
                          <DropdownMenuItem
                            className="cursor-pointer text-[12px]"
                            onClick={() => navigate(`/ligas/${liga.id}`)}
                          >
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-[12px]"
                            onClick={() => abrirEditar(liga)}
                          >
                            Editar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                  )}
                </button>

                {/* Nome + meta */}
                <button
                  onClick={() => navigate(`/ligas/${liga.id}`)}
                  className="mt-3 flex flex-col items-start text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-display text-base font-bold text-foreground">
                      {liga.nome}
                    </span>
                    {ehMinha && (
                      <span className="rounded-full bg-brand-yellow/20 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:text-brand-yellow">
                        Minha
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 text-sm text-foreground/50">{subtitle || "—"}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <LigaSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        liga={ligaParaEditar}
        onSalvo={refetchLigas}
        role={role ?? undefined}
      />
    </div>
  );
}
