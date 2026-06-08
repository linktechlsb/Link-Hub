import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

/**
 * Sheet de formulário padrão do app, no design dos sheets da aplicação
 * (LigaSheet): filete superior navy, eyebrow em plex-mono, título em
 * font-display, corpo rolável e rodapé com divisor. Use para todos os painéis
 * laterais de formulário (criar/editar). Coloque os campos (idealmente em
 * <FieldGroup>) em `children` e os botões de ação em `footer`.
 */
interface FormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rótulo curto acima do título (ex.: "Novo", "Editar"). */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  side?: "right" | "left" | "top" | "bottom";
  /** Classe extra no SheetContent (ex.: largura custom). */
  className?: string;
}

export function FormSheet({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  children,
  footer,
  side = "right",
  className,
}: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "flex w-[400px] flex-col gap-0 bg-white p-0 dark:bg-[#030303] sm:w-[480px]",
          className,
        )}
      >
        <div className="h-px shrink-0 bg-navy/90 dark:bg-white/20" />
        <SheetHeader className="space-y-1 px-8 pb-6 pt-8 text-left">
          {eyebrow && (
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 dark:text-white/40">
              {eyebrow}
            </p>
          )}
          <SheetTitle className="font-display text-[22px] font-bold tracking-[-0.02em] text-navy dark:text-white">
            {title}
          </SheetTitle>
          {description && (
            <SheetDescription className="font-plex-sans text-[13px] text-foreground/50">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="h-px shrink-0 bg-navy/15 dark:bg-white/10" />

        <div className="flex-1 overflow-y-auto px-8 py-6">{children}</div>

        <div className="h-px shrink-0 bg-foreground/[0.08]" />
        <SheetFooter className="flex-col gap-3 px-8 py-6 sm:flex-col sm:space-x-0">
          {footer}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
