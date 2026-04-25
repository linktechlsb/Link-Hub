import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

  function abrirEditar() {
    const minha = ligas.find(
      (l) => l.lider_email === userEmail || (userId && l.diretores?.some((d) => d.id === userId)),
    );
    setLigaParaEditar(minha);
    setSheetOpen(true);
  }

  function abrirAdicionar() {
    setLigaParaEditar(undefined);
    setSheetOpen(true);
  }

  const totalProjetosAtivos = ligas.reduce((acc, l) => acc + (l.projetos_ativos ?? 0), 0);
  const minhaLiga = ligas.find(
    (l) => l.lider_email === userEmail || (userId && l.diretores?.some((d) => d.id === userId)),
  );

  const acaoBotao =
    role === "staff" ? (
      <button
        onClick={abrirAdicionar}
        className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy border border-navy px-3 py-1.5 hover:bg-navy hover:text-white transition-colors"
      >
        + Adicionar
      </button>
    ) : role === "diretor" ? (
      <button
        onClick={abrirEditar}
        className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy border border-navy px-3 py-1.5 hover:bg-navy hover:text-white transition-colors"
      >
        Editar
      </button>
    ) : null;

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-6">
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">Ligas</h1>
        <p className="font-plex-mono text-[11px] tracking-[0.18em] uppercase text-navy/50 mt-1">
          Ligas acadêmicas · Link School of Business
        </p>
      </div>

      <div className="space-y-12">
        <section>
          <SectionHeader numero="01" eyebrow="Resumo" titulo="Panorama das Ligas" />
          <KpiRow
            items={[
              { label: "Ligas ativas", valor: String(ligas.length) },
              { label: "Projetos em andamento", valor: String(totalProjetosAtivos) },
            ]}
          />
        </section>

        <div>
          <SectionHeader numero="02" eyebrow="Diretório" titulo="Todas as Ligas" acao={acaoBotao} />

          {carregando ? (
            <p className="font-plex-sans text-[13px] text-navy/50">Carregando ligas...</p>
          ) : ligas.length === 0 ? (
            <p className="font-plex-sans text-[13px] text-navy/50">Nenhuma liga cadastrada.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-t border-b border-navy">
                  <th className="text-left py-3 px-2 font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/60 font-medium">
                    Liga
                  </th>
                  <th className="text-left py-3 px-2 font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/60 font-medium">
                    Diretores
                  </th>
                  <th className="text-right py-3 px-2 font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/60 font-medium">
                    Projetos
                  </th>
                </tr>
              </thead>
              <tbody>
                {ligas.map((liga) => {
                  const ehMinha = minhaLiga?.id === liga.id;
                  const diretor =
                    liga.diretores && liga.diretores.length > 0
                      ? liga.diretores.map((d) => primeiroUltimoNome(d.nome)).join(", ")
                      : "—";
                  return (
                    <tr
                      key={liga.id}
                      onClick={() => navigate(`/ligas/${liga.id}`)}
                      className="border-b border-navy/10 cursor-pointer hover:bg-navy/[0.02] transition-colors"
                    >
                      <td className="py-4 px-2">
                        <span
                          className={`font-plex-sans text-[13px] text-navy ${ehMinha ? "font-bold" : ""}`}
                        >
                          {liga.nome}
                        </span>
                        {ehMinha && (
                          <span className="ml-3 font-plex-mono text-[8px] uppercase tracking-[0.2em] text-navy border border-navy px-1.5 py-0.5">
                            Minha
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-2 font-plex-sans text-[13px] text-navy/70">
                        {diretor}
                      </td>
                      <td className="py-4 px-2 text-right font-plex-mono text-[13px] text-navy/70">
                        {liga.projetos_ativos ?? 0}
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
