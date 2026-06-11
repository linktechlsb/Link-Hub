import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/ui/user-avatar";

export interface MembroAvatar {
  nome: string;
  avatar_url?: string | null;
}

/**
 * Stack de avatares dos membros da liga (baseado no @reui/c-avatar-24):
 * sobrepostos, com hover que espalha e tooltip com o nome. Mostra "+N" quando
 * há mais membros do que `max`.
 */
export function LigaMembrosAvatars({
  membros,
  max = 5,
}: {
  membros: MembroAvatar[];
  max?: number;
}) {
  if (membros.length === 0) return null;

  const visiveis = membros.slice(0, max);
  const restante = membros.length - visiveis.length;

  return (
    <TooltipProvider>
      <div className="group/avatars flex items-center">
        {visiveis.map((membro, index) => (
          <div
            key={index}
            style={
              {
                "--index": index,
                zIndex: visiveis.length - index,
              } as React.CSSProperties
            }
            className="group/avatar-item translate-x-[calc(var(--index)*-8px)] transition-all duration-300 ease-in-out will-change-transform group-hover/avatars:translate-x-[calc(var(--index)*6px)]"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <UserAvatar
                  nome={membro.nome}
                  src={membro.avatar_url}
                  className="size-9 origin-center ring-2 ring-background transition-transform duration-300 ease-in-out group-hover/avatar-item:scale-110"
                />
              </TooltipTrigger>
              <TooltipContent sideOffset={10}>{membro.nome}</TooltipContent>
            </Tooltip>
          </div>
        ))}

        {restante > 0 && (
          <div
            style={{ "--index": visiveis.length } as React.CSSProperties}
            className="translate-x-[calc(var(--index)*-8px)] transition-all duration-300 ease-in-out group-hover/avatars:translate-x-[calc(var(--index)*6px)]"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground/60 ring-2 ring-background">
              +{restante}
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
