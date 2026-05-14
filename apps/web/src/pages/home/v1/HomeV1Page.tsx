import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { EditorialHero } from "./EditorialHero";
import { HomeDiretorViewV1 } from "./HomeDiretorViewV1";
import { HomeMembroViewV1 } from "./HomeMembroViewV1";
import { HomeProfessorViewV1 } from "./HomeProfessorViewV1";
import { HomeStaffViewV1 } from "./HomeStaffViewV1";
import { MinhaLigaStrip } from "./MinhaLigaStrip";
import { useHomeData } from "./useHomeData";

const ROLE_LABELS: Record<string, string> = {
  staff: "Staff",
  diretor: "Diretor",
  professor: "Professor",
  membro: "Membro",
  estudante: "Estudante",
};

export function HomeV1Page() {
  const { ligas, minhaLiga, ranking, nomeUsuario, loadingUser, pendentes, role, usuarioId } =
    useHomeData();

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const dataFormatada = hoje.replace(/\./g, "").toUpperCase();

  return (
    <div className="font-plex-sans bg-background min-h-full">
      <div className="max-w-5xl mx-auto px-8 py-10">
        <header className="flex items-end justify-between">
          <div>
            {loadingUser ? (
              <>
                <Skeleton className="h-7 w-48 mb-2" />
                <Skeleton className="h-3 w-32" />
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-foreground">Olá, {nomeUsuario}</h1>
                <p className="text-xs text-muted-foreground mt-1">{dataFormatada}</p>
              </>
            )}
          </div>
          {role && !loadingUser && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {ROLE_LABELS[role] ?? role}
            </Badge>
          )}
        </header>

        {ligas.length > 0 && (
          <div className="mt-6">
            <EditorialHero ligas={ligas} ranking={ranking} />
          </div>
        )}

        {minhaLiga && (
          <div className="mt-6">
            <MinhaLigaStrip liga={minhaLiga} />
          </div>
        )}

        <div className="mt-6">
          {role === "staff" && (
            <HomeStaffViewV1 pendentes={pendentes} ligas={ligas} ranking={ranking} />
          )}
          {role === "diretor" && minhaLiga && (
            <HomeDiretorViewV1 minhaLiga={minhaLiga} ligas={ligas} ranking={ranking} />
          )}
          {role === "professor" && minhaLiga && (
            <HomeProfessorViewV1 minhaLiga={minhaLiga} ranking={ranking} />
          )}
          {role === "membro" && minhaLiga && (
            <HomeMembroViewV1 minhaLiga={minhaLiga} ranking={ranking} usuarioId={usuarioId} />
          )}
        </div>
      </div>
    </div>
  );
}
