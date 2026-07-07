import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

export interface KpiItem {
  label: string;
  valor: string;
  unidade?: string;
  trend?: string;
  trendType?: "up" | "down" | "neutral";
  icon?: ReactNode;
}

interface SectionHeaderProps {
  numero?: string;
  eyebrow?: string;
  titulo: string;
  acao?: ReactNode;
  tituloClassName?: string;
}

export function SectionHeader({ titulo, acao, tituloClassName }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <p
        className={
          tituloClassName ??
          "text-xs font-bold text-link-blue dark:text-white uppercase tracking-wider"
        }
      >
        {titulo}
      </p>
      {acao}
    </div>
  );
}

interface KpiRowProps {
  items: KpiItem[];
  cols?: 2 | 3 | 4;
  borderBottom?: boolean;
  centered?: boolean;
}

export function KpiRow({ items, cols }: KpiRowProps) {
  const resolvedCols = cols ?? (items.length <= 2 ? 2 : items.length === 3 ? 3 : 4);
  const gridClass =
    resolvedCols === 2
      ? "grid-cols-2"
      : resolvedCols === 3
        ? "grid-cols-1 md:grid-cols-3"
        : "grid-cols-2 md:grid-cols-4";

  return (
    <div className={`grid ${gridClass} gap-3`}>
      {items.map((m) => {
        const trendClass =
          m.trendType === "up"
            ? "text-green-500 bg-green-500/10 border-green-500/20"
            : m.trendType === "down"
              ? "text-red-400 bg-red-500/10 border-red-500/20"
              : "text-amber-400 bg-amber-500/10 border-amber-500/20";

        return (
          <Card key={m.label} className="">
            <CardContent className="pt-5 pb-4">
              {m.icon && (
                <div className="h-8 w-8 rounded-lg bg-background border border-border flex items-center justify-center mb-3">
                  {m.icon}
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="text-3xl font-bold text-foreground leading-none">
                  {m.valor}
                  {m.unidade && (
                    <span className="text-base font-medium text-muted-foreground ml-1">
                      {m.unidade}
                    </span>
                  )}
                </div>
                {m.trend && (
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] shrink-0 mt-0.5", trendClass)}
                  >
                    {m.trend}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-2">
                {m.label}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
