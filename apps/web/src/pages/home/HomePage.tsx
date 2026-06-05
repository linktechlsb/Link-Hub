import { ShieldCheck, User, UserCog } from "lucide-react";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";

import { HomeView } from "./HomeView";

import type { Liga, RankingLiga } from "@link-leagues/types";

const roleBadgeConfig: Record<string, { label: string; Icon: React.ElementType }> = {
  membro: { label: "Membro", Icon: User },
  estudante: { label: "Membro", Icon: User },
  professor: { label: "Membro", Icon: User },
  diretor: { label: "Diretor", Icon: UserCog },
  staff: { label: "Staff", Icon: ShieldCheck },
};

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
            <Skeleton className="h-8 w-52 mb-2.5" />
            <Skeleton className="h-2.5 w-44" />
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display font-bold text-2xl tracking-[-0.03em] text-navy dark:text-foreground">
                Olá, {nomeUsuario}
              </h1>
              {role &&
                roleBadgeConfig[role] &&
                (() => {
                  const { label, Icon } = roleBadgeConfig[role];
                  return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-brand-gray bg-brand-gray/40 text-[11px] font-medium text-muted-foreground dark:border-white/10 dark:bg-white/5">
                      <Icon size={12} strokeWidth={2} />
                      {label}
                    </span>
                  );
                })()}
            </div>
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/25 mt-1.5">
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
