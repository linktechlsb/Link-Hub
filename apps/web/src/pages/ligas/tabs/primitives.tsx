import { DashboardCard } from "@/pages/home/components/DashboardCard";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Primitivas padronizadas das abas da liga, no design da Home/Ligas
 * (tokens semânticos, font-display, DashboardCard). Use estas em vez das
 * primitivas antigas de `home/v1` (navy/plex-mono).
 */

interface TabSectionProps {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
}

/** Seção com título discreto (igual aos painéis da Home) e ação opcional. */
export function TabSection({ titulo, acao, children }: TabSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs text-foreground/40">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export interface StatItem {
  label: string;
  value: string;
  unidade?: string;
  icon?: LucideIcon;
}

const COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

/** Faixa de KPIs divididos por linhas verticais — espelha o KpiStrip da Home. */
export function StatStrip({ items }: { items: StatItem[] }) {
  const cols = COLS[Math.min(items.length, 4)] ?? "grid-cols-4";
  return (
    <DashboardCard>
      <div className={`grid ${cols} divide-x divide-border`}>
        {items.map(({ icon: Icon, label, value, unidade }) => (
          <div key={label} className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2 text-foreground/50">
              {Icon && <Icon className="h-4 w-4" />}
              <span className="text-xs font-medium">{label}</span>
            </div>
            <span className="font-display text-3xl font-bold leading-none text-foreground">
              {value}
              {unidade && (
                <span className="ml-1 text-base font-medium text-foreground/40">{unidade}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
