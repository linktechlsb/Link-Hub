import { CalendarDays, Clock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { cn } from "@/lib/utils";

import type { Evento } from "@link-leagues/types";

interface EventosFuturosCardProps {
  ligaId: string | null;
  isStaff?: boolean;
}

function parseDateLocal(iso: string): Date {
  const parts = iso.slice(0, 10).split("-");
  const [y, m, d] = [Number(parts[0]), Number(parts[1]), Number(parts[2])];
  return new Date(y, m - 1, d);
}

function formatarData(iso: string): string {
  const data = parseDateLocal(iso);
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (same(data, hoje)) return "Hoje";
  if (same(data, amanha)) return "Amanhã";

  return data.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function diasAte(iso: string): number {
  const data = parseDateLocal(iso);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  data.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)));
}

export function EventosFuturosCard({ ligaId, isStaff = false }: EventosFuturosCardProps) {
  const hojeIso = new Date().toISOString().slice(0, 10);

  const fimSemanaIso = (() => {
    const hoje = new Date();
    const diasAteDomingo = hoje.getDay() === 0 ? 0 : 7 - hoje.getDay();
    const domingo = new Date(hoje);
    domingo.setDate(hoje.getDate() + diasAteDomingo);
    return domingo.toISOString().slice(0, 10);
  })();

  const url = isStaff
    ? `/api/eventos?inicio=${hojeIso}&fim=${fimSemanaIso}`
    : ligaId
      ? `/api/eventos?inicio=${hojeIso}&liga_id=${ligaId}`
      : null;

  const { data: eventosData, carregando: loading } = useCachedFetch<Evento[]>(url);
  const eventos = isStaff ? (eventosData ?? []) : (eventosData ?? []).slice(0, 5);

  return (
    <Card className="shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] dark:bg-white/[0.025] dark:border-white/[0.06]">
      <CardContent className="pt-5 pb-3 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-sm text-navy dark:text-foreground">Próximos Eventos</p>
            {isStaff && (
              <p className="text-[10px] text-muted-foreground/50 mt-0.5 uppercase tracking-wider">
                Esta semana
              </p>
            )}
          </div>
          {eventos.length > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground/60 border border-border dark:border-white/[0.06] rounded-full px-2 py-0.5">
              {eventos.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-36 mb-1.5" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : eventos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-6">
            <div className="text-center">
              <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground/60">Nenhum evento programado</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {eventos.map((e, i) => {
              const dias = diasAte(e.data);
              const dataLabel = formatarData(e.data);
              const isUrgente = dias === 0;
              const isProximo = dias <= 2;

              return (
                <div
                  key={e.id}
                  className={cn(
                    "flex items-start gap-3 py-3",
                    i < eventos.length - 1 && "border-b border-border dark:border-white/[0.04]",
                  )}
                >
                  {/* Date badge premium */}
                  <div
                    className={cn(
                      "h-12 w-12 rounded-xl flex flex-col items-center justify-center shrink-0 border",
                      isUrgente
                        ? "bg-brand-yellow/15 border-brand-yellow/40"
                        : "bg-foreground/[0.03] border-border dark:border-white/[0.06]",
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-bold leading-none",
                        isUrgente ? "text-brand-yellow" : "text-foreground/80",
                      )}
                    >
                      {parseDateLocal(e.data).getDate().toString().padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] uppercase tracking-wide leading-none mt-0.5",
                        isUrgente ? "text-brand-yellow/70" : "text-muted-foreground/50",
                      )}
                    >
                      {parseDateLocal(e.data)
                        .toLocaleDateString("pt-BR", { month: "short" })
                        .replace(".", "")}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate leading-tight">
                        {e.titulo}
                      </p>
                      {isUrgente && (
                        <span className="text-[9px] font-bold bg-brand-yellow/20 text-brand-yellow px-1.5 py-0.5 rounded-md uppercase tracking-wide shrink-0">
                          Hoje
                        </span>
                      )}
                    </div>
                    {e.liga && (
                      <p className="text-[10px] font-medium text-link-blue/80 dark:text-white/40 truncate mt-0.5">
                        {e.liga.sigla ?? e.liga.nome}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isUrgente
                            ? "text-brand-yellow/80"
                            : isProximo
                              ? "text-foreground/60"
                              : "text-muted-foreground/50",
                        )}
                      >
                        {dataLabel}
                      </span>
                      {e.hora_inicio && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                          <Clock className="h-2.5 w-2.5" />
                          {e.hora_inicio.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
