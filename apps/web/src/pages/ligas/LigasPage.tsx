import { MoreHorizontal } from "lucide-react";
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
import { KpiRow, SectionHeader } from "@/pages/home/v1/primitives";

import { LigaSheet } from "./LigaSheet";

import type { Liga, UserRole } from "@link-leagues/types";

function primeiroUltimoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length <= 2) return nome;
  return `${partes[0]} ${partes[partes.length - 1]}`;
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

  function abrirEditar(liga?: Liga) {
    const alvo =
      liga ??
      ligas.find(
        (l) => l.lider_email === userEmail || (userId && l.diretores?.some((d) => d.id === userId)),
      );
    setLigaParaEditar(alvo);
    setSheetOpen(true);
  }

  function abrirAdicionar() {
    setLigaParaEditar(undefined);
    setSheetOpen(true);
  }

  const totalProjetosAtivos = ligas.reduce((acc, l) => acc + (l.projetos_ativos ?? 0), 0);
  const totalMembros = ligas.reduce((acc, l) => acc + (l.total_membros ?? 0), 0);
  const minhaLiga = ligas.find(
    (l) => l.lider_email === userEmail || (userId && l.diretores?.some((d) => d.id === userId)),
  );

  const acaoBotao =
    role === "staff" ? (
      <button
        onClick={abrirAdicionar}
        className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-foreground hover:text-background transition-colors"
      >
        + Adicionar
      </button>
    ) : null;

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-10">
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">Ligas</h1>
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
          Página geral das ligas
        </p>
      </div>

      <div className="space-y-12">
        <section>
          <SectionHeader
            numero="01"
            eyebrow="Resumo"
            titulo="Panorama das Ligas"
            tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue dark:text-white"
          />
          <KpiRow
            centered
            items={[
              { label: "Ligas ativas", valor: String(ligas.length) },
              { label: "Projetos totais", valor: String(totalProjetosAtivos) },
              { label: "Membros totais", valor: String(totalMembros) },
            ]}
          />
        </section>

        <div>
          <SectionHeader
            numero="02"
            eyebrow="Diretório"
            titulo="Todas as Ligas"
            acao={acaoBotao}
            tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue dark:text-white"
          />

          {carregando ? (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-foreground/[0.08]">
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Nome
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Diretores
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Membros
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Projetos
                  </th>
                  <th className="py-3 px-4 w-10" />
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-foreground/[0.06]">
                    <td className="py-4 px-4">
                      <Skeleton className="h-4 w-40 mb-1.5" />
                      <Skeleton className="h-3 w-56" />
                    </td>
                    <td className="py-4 px-4">
                      <Skeleton className="h-5 w-28 rounded-full" />
                    </td>
                    <td className="py-4 px-4">
                      <Skeleton className="h-4 w-6" />
                    </td>
                    <td className="py-4 px-4">
                      <Skeleton className="h-4 w-6" />
                    </td>
                    <td className="py-4 px-4 w-10">
                      <Skeleton className="h-6 w-6 rounded" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : ligas.length === 0 ? (
            <p className="font-plex-sans text-[13px] text-foreground/50">
              Nenhuma liga cadastrada.
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-foreground/[0.08]">
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Nome
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Diretores
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Membros
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Projetos
                  </th>
                  <th className="py-3 px-4 w-10" />
                </tr>
              </thead>
              <tbody>
                {ligas.map((liga, idx) => {
                  const ehMinha = minhaLiga?.id === liga.id;
                  const diretores =
                    liga.diretores && liga.diretores.length > 0
                      ? liga.diretores.map((d) => primeiroUltimoNome(d.nome))
                      : [];
                  const isLast = idx === ligas.length - 1;
                  return (
                    <tr
                      key={liga.id}
                      onClick={() => navigate(`/ligas/${liga.id}`)}
                      className={`cursor-pointer hover:bg-foreground/[0.03] transition-colors ${!isLast ? "border-b border-foreground/[0.06]" : ""}`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-plex-sans text-[13px] text-foreground font-semibold">
                            {liga.nome}
                          </span>
                          {ehMinha && (
                            <span className="font-plex-mono text-[8px] uppercase tracking-[0.2em] text-foreground/50 border border-foreground/20 px-1.5 py-0.5 rounded-sm">
                              Minha
                            </span>
                          )}
                        </div>
                        {liga.descricao && (
                          <p className="font-plex-sans text-[11px] text-foreground/40 mt-0.5 leading-snug">
                            {liga.descricao}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {diretores.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {diretores.map((nome) => (
                              <span
                                key={nome}
                                className="inline-flex items-center gap-1 font-plex-mono text-[10px] text-foreground/70 bg-foreground/[0.07] border border-foreground/[0.08] px-2 py-0.5 rounded-full"
                              >
                                {nome}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="font-plex-mono text-[12px] text-foreground/25">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                        {liga.total_membros ?? 0}
                      </td>
                      <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                        {liga.projetos_ativos ?? 0}
                      </td>
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-foreground/[0.08] text-foreground/40 hover:text-foreground/70 transition-colors">
                              <MoreHorizontal size={14} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[140px]">
                            <DropdownMenuItem
                              className="text-[12px] cursor-pointer"
                              onClick={() => navigate(`/ligas/${liga.id}`)}
                            >
                              Ver detalhes
                            </DropdownMenuItem>
                            {(role === "staff" || (role === "diretor" && ehMinha)) && (
                              <DropdownMenuItem
                                className="text-[12px] cursor-pointer"
                                onClick={() => abrirEditar(liga)}
                              >
                                Editar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
