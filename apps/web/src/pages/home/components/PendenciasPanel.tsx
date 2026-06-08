import { AlertTriangle, CalendarClock, CheckSquare, FileCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

import { DashboardCard } from "./DashboardCard";

import type { Pendencia, TipoPendencia } from "@link-leagues/types";
import type { LucideIcon } from "lucide-react";

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Apresentação por tipo: ícone, cor e destino. */
const TIPO_INFO: Record<
  TipoPendencia,
  { icon: LucideIcon; rotulo: string; className: string; rota: (id: string) => string }
> = {
  projeto_aprovacao: {
    icon: FileCheck,
    rotulo: "Aprovar",
    className: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    rota: (id) => `/projetos/${id}`,
  },
  projeto_atrasado: {
    icon: AlertTriangle,
    rotulo: "Atrasado",
    className: "bg-red-500/10 text-red-600 dark:text-red-300",
    rota: (id) => `/projetos/${id}`,
  },
  evento_aprovacao: {
    icon: CalendarClock,
    rotulo: "Evento",
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
    rota: () => `/calendario`,
  },
  tarefa: {
    icon: CheckSquare,
    rotulo: "Tarefa",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    rota: () => `/tarefas`,
  },
};

function formatPrazo(prazo?: string | null): string | null {
  if (!prazo) return null;
  const d = new Date(prazo.includes("T") ? prazo : `${prazo}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function PendenciasPanel() {
  const [itens, setItens] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      const token = await getToken();
      if (!token) {
        if (!cancelado) setLoading(false);
        return;
      }
      const res = await fetch(`/api/pendencias`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && !cancelado) setItens(await res.json());
      if (!cancelado) setLoading(false);
    }
    void carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <DashboardCard className="flex h-[260px] flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-xs text-foreground/40">Pendências</h3>
        {!loading && itens.length > 0 && (
          <span className="rounded-full bg-brand-yellow/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-brand-yellow">
            {itens.length}
          </span>
        )}
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
            </div>
          ))}
        </div>
      ) : itens.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1">
          <CheckSquare className="size-5 text-foreground/20" />
          <p className="text-center text-xs text-foreground/40">Tudo em dia por aqui.</p>
        </div>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col overflow-auto">
          {itens.map((item) => {
            const info = TIPO_INFO[item.tipo];
            const Icon = info.icon;
            const prazo = formatPrazo(item.prazo);
            return (
              <li key={`${item.tipo}-${item.id}`} className="border-b border-border last:border-0">
                <Link
                  to={info.rota(item.id)}
                  className="flex items-center gap-3 py-2.5 transition-colors hover:opacity-80"
                >
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md",
                      info.className,
                    )}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{item.titulo}</p>
                    <p className="truncate text-[10px] text-foreground/40">
                      {info.rotulo}
                      {item.contexto ? ` · ${item.contexto}` : ""}
                    </p>
                  </div>
                  {prazo && (
                    <span className="shrink-0 text-[11px] font-medium tabular-nums text-foreground/50">
                      {prazo}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}
