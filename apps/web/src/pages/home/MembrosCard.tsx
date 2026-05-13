import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { cn } from "@/lib/utils";

interface Membro {
  id: string;
  nome: string;
  email: string;
  avatar_url?: string | null;
  cargo?: string;
  role?: string;
}

interface MembrosCardProps {
  ligaId: string | null;
}

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const CARGO_LABEL: Record<string, string> = {
  diretor: "Diretor",
  membro: "Membro",
  lider: "Líder",
  staff: "Staff",
};

export function MembrosCard({ ligaId }: MembrosCardProps) {
  const { data: membrosData, carregando: loading } = useCachedFetch<Membro[]>(
    ligaId ? `/api/ligas/${ligaId}/membros` : null,
  );

  const membros = membrosData ?? [];

  return (
    <Card className="shadow-sm flex flex-col h-full">
      <CardContent className="pt-5 pb-3 flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-sm text-navy">Membros</p>
          {membros.length > 0 && (
            <span className="text-xs text-muted-foreground font-medium">
              {membros.length} total
            </span>
          )}
        </div>

        {!ligaId ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center">
              Selecione uma liga para ver os membros
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-3 flex-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-28 mb-1.5" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : membros.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Nenhum membro encontrado</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0 pr-1 -mr-1">
            {membros.map((m, i) => (
              <div
                key={m.id}
                className={cn(
                  "flex items-center gap-3 py-2 px-1",
                  i < membros.length - 1 && "border-b border-border",
                )}
              >
                {m.avatar_url ? (
                  <img
                    src={m.avatar_url}
                    alt={m.nome}
                    className="h-9 w-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-navy">{iniciais(m.nome)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{m.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {m.role ? (CARGO_LABEL[m.role] ?? m.role) : "Membro"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
