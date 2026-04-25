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
  const { ligas, minhaLiga, nomeUsuario, loadingUser, pendentes, role } = useHomeData();

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const dataFormatada = hoje.replace(/\./g, "").toUpperCase();

  return (
    <div className="font-plex-sans bg-white min-h-full">
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
                <h1 className="font-plex-sans text-[22px] font-semibold text-navy tracking-[-0.02em]">
                  Olá, {nomeUsuario}
                </h1>
                <p className="font-plex-mono text-[10px] uppercase tracking-[0.08em] text-navy/60 mt-1">
                  {dataFormatada}
                </p>
              </>
            )}
          </div>
          {role && !loadingUser && (
            <span className="font-plex-mono text-[9px] uppercase tracking-[0.2em] text-navy border border-navy px-2.5 py-1.5">
              {ROLE_LABELS[role] ?? role}
            </span>
          )}
        </header>

        {ligas.length > 0 && (
          <div className="mt-6">
            <EditorialHero ligas={ligas} />
          </div>
        )}

        {minhaLiga && (
          <div className="mt-6">
            <MinhaLigaStrip liga={minhaLiga} />
          </div>
        )}

        <div>
          {role === "staff" && <HomeStaffViewV1 pendentes={pendentes} />}
          {role === "diretor" && <HomeDiretorViewV1 />}
          {role === "professor" && <HomeProfessorViewV1 />}
          {role === "membro" && <HomeMembroViewV1 />}
        </div>
      </div>
    </div>
  );
}
