import { MoreHorizontal, type LucideIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Ação de uma linha de tabela. Segue o padrão do bloco reui `c-dropdown-menu-12`:
 * ícone à esquerda + rótulo, com itens destrutivos em vermelho e separados por uma
 * linha. `variant: "destructive"` é renderizado via classes (o primitive atual não
 * expõe a prop `variant`).
 */
export type RowAction = {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
  /** Tom custom para ações que não são destrutivas (ex.: Concluir em emerald). */
  className?: string;
};

interface RowActionsMenuProps {
  actions: RowAction[];
  align?: "start" | "end";
  ariaLabel?: string;
  triggerClassName?: string;
}

/**
 * Menu de ações de linha de tabela padronizado. Trigger discreto de ícone
 * (`MoreHorizontal`) + menu com ícones, mantendo a convenção visual das tabelas.
 * Insere um separador automaticamente antes do primeiro item destrutivo.
 */
export function RowActionsMenu({
  actions,
  align = "end",
  ariaLabel = "Ações",
  triggerClassName,
}: RowActionsMenuProps) {
  if (actions.length === 0) return null;

  const firstDestructiveIndex = actions.findIndex((a) => a.variant === "destructive");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={ariaLabel}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-muted hover:text-foreground",
            triggerClassName,
          )}
        >
          <MoreHorizontal size={15} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[160px]">
        {actions.map((action, index) => {
          const Icon = action.icon;
          const isDestructive = action.variant === "destructive";
          return (
            <div key={action.label} className="contents">
              {index === firstDestructiveIndex && firstDestructiveIndex > 0 && (
                <DropdownMenuSeparator />
              )}
              <DropdownMenuItem
                disabled={action.disabled}
                onClick={action.onSelect}
                className={cn(
                  "cursor-pointer gap-2 text-[12px]",
                  isDestructive && "text-destructive focus:text-destructive",
                  action.className,
                )}
              >
                {Icon && <Icon className="size-3.5 shrink-0" />}
                {action.label}
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
