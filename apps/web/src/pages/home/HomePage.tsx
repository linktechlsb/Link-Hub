import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";

import { HomeView } from "./HomeView";

import type { Liga, RankingLiga } from "@link-leagues/types";

export function HomePage() {
  const { role, usuarioId } = useUser();
  const { data: ligasData, carregando: ligasLoading } = useCachedFetch<Liga[]>("/api/ligas");
  const { data: minhaLigaData, carregando: minhaLigaLoading } = useCachedFetch<Liga>(
    role !== null && role !== "staff" ? "/api/ligas/minha" : null,
  );
  const { data: rankingData, carregando: rankingLoading } =
    useCachedFetch<RankingLiga[]>("/api/ranking");

  const ligas = ligasData ?? [];
  const minhaLiga = minhaLigaData ?? null;
  const ranking = rankingData ?? [];
  const [nomeUsuario, setNomeUsuario] = useState<string>("");
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const email = sessionData.session?.user.email ?? "";
        if (email) {
          const { data: usuario } = await supabase
            .from("usuarios")
            .select("nome")
            .eq("email", email)
            .single();
          if (usuario?.nome) setNomeUsuario(usuario.nome as string);
          else setNomeUsuario(email.split("@")[0] ?? "Usuário");
        }
      } catch {
        // Falha silenciosa
      } finally {
        setLoadingUser(false);
      }
    }
    void carregar();
  }, []);

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const dataFormatada = hoje.charAt(0).toUpperCase() + hoje.slice(1);

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        {loadingUser ? (
          <>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-3 w-64" />
          </>
        ) : (
          <>
            <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
              Olá, {nomeUsuario}
            </h1>
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
              {dataFormatada}
            </p>
          </>
        )}
      </div>

      <HomeView
        role={role}
        ligas={ligas}
        ranking={ranking}
        minhaLiga={minhaLiga}
        usuarioId={usuarioId}
        loading={ligasLoading || rankingLoading || minhaLigaLoading}
      />
    </div>
  );
}
