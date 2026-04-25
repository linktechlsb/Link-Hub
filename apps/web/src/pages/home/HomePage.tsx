import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";

import { HomeDiretorView } from "./HomeDiretorView";
import { HomeMembroView } from "./HomeMembroView";
import { HomeProfessorView } from "./HomeProfessorView";
import { HomeStaffView } from "./HomeStaffView";
import { LigasCarousel } from "./LigasCarousel";
import { MinhaLigaCard } from "./MinhaLigaCard";

import type { Liga } from "@link-leagues/types";

const ROLE_LABELS: Record<string, string> = {
  staff: "Staff",
  diretor: "Diretor",
  professor: "Professor",
  membro: "Membro",
  estudante: "Estudante",
};

export function HomePage() {
  const { role } = useUser();
  const { data: ligasData } = useCachedFetch<Liga[]>("/api/ligas");
  const { data: minhaLigaData } = useCachedFetch<Liga>("/api/ligas/minha");
  const { data: pendentesData } = useCachedFetch<{
    projetos: { id: string; titulo: string; liga?: { nome: string } }[];
    eventos: { id: string; titulo: string; liga?: { nome: string } }[];
  }>(role === "staff" ? "/api/pendentes" : null);
  const ligas = ligasData ?? [];
  const minhaLiga = minhaLigaData ?? null;
  const pendentes = pendentesData ?? { projetos: [], eventos: [] };
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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {loadingUser ? (
            <>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </>
          ) : (
            <>
              <h1 className="font-display font-bold text-2xl text-navy">Olá, {nomeUsuario}</h1>
              <p className="text-muted-foreground text-sm mt-1">{dataFormatada}</p>
            </>
          )}
        </div>
        {role && !loadingUser && (
          <Badge
            variant="outline"
            className="border-navy/30 text-navy bg-navy/5 font-semibold mt-1"
          >
            {ROLE_LABELS[role] ?? role}
          </Badge>
        )}
      </div>

      {/* Carrossel de ligas */}
      {ligas.length > 0 && <LigasCarousel ligas={ligas} />}

      {/* Minha Liga */}
      {minhaLiga && (
        <div>
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-2">
            Minha Liga
          </p>
          <MinhaLigaCard liga={minhaLiga} />
        </div>
      )}

      {/* View por papel */}
      {role === "staff" && <HomeStaffView pendentes={pendentes} />}
      {role === "diretor" && <HomeDiretorView />}
      {role === "professor" && <HomeProfessorView />}
      {role === "membro" && <HomeMembroView />}
    </div>
  );
}
