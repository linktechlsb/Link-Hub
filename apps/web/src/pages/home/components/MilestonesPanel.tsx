import { ArrowUpRight, Flag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

import { DashboardCard } from "./DashboardCard";

import type { MilestoneProximo } from "@link-leagues/types";

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Dias até o prazo (negativo = atrasado). */
function diasAte(prazo?: string): number | null {
  if (!prazo) return null;
  const d = new Date(prazo.includes("T") ? prazo : `${prazo}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoje.getTime()) / 86_400_000);
}

function rotuloPrazo(dias: number | null): string {
  if (dias == null) return "—";
  if (dias < 0) return `${Math.abs(dias)}d atrás`;
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  return `em ${dias}d`;
}

export function MilestonesPanel() {
  const [milestones, setMilestones] = useState<MilestoneProximo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      const token = await getToken();
      if (!token) {
        if (!cancelado) setLoading(false);
        return;
      }
      const res = await fetch(`/api/milestones/proximos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && !cancelado) setMilestones(await res.json());
      if (!cancelado) setLoading(false);
    }
    void carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <DashboardCard className="flex h-[260px] flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs text-foreground/40">Próximos marcos</h3>
        <Link
          to="/projetos"
          className="flex items-center gap-1 text-[11px] text-foreground/40 transition-colors hover:text-foreground"
        >
          Ver projetos <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-border py-2.5 last:border-0"
            >
              <Skeleton className="size-7 rounded-md bg-foreground/5" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3 bg-foreground/5" />
                <Skeleton className="h-2.5 w-1/3 bg-foreground/5" />
              </div>
              <Skeleton className="h-4 w-10 bg-foreground/5" />
            </div>
          ))}
        </div>
      ) : milestones.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-xs text-foreground/40">Nenhum marco a vencer.</p>
        </div>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col overflow-auto">
          {milestones.map((m) => {
            const dias = diasAte(m.prazo);
            const atrasado = dias != null && dias < 0;
            return (
              <li key={m.id} className="border-b border-border last:border-0">
                <Link
                  to={`/projetos/${m.projeto.id}`}
                  className="flex items-center gap-3 py-2.5 transition-colors hover:opacity-80"
                >
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md",
                      atrasado
                        ? "bg-red-500/10 text-red-600 dark:text-red-300"
                        : "bg-foreground/[0.06] text-foreground/60",
                    )}
                  >
                    <Flag className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{m.titulo}</p>
                    <p className="truncate text-[10px] text-foreground/40">
                      {m.projeto.titulo} · {m.liga.nome}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-[11px] font-medium tabular-nums",
                      atrasado ? "text-red-600 dark:text-red-300" : "text-foreground/50",
                    )}
                  >
                    {rotuloPrazo(dias)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}
