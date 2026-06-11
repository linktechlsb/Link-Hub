import { Skeleton } from "@/components/ui/skeleton";
import { DashboardCard } from "@/pages/home/components/DashboardCard";

/** Skeleton de tabela de projetos — espelha o layout das tabelas das views. */
export function TabelaProjetosSkeleton({ linhas = 5 }: { linhas?: number }) {
  return (
    <DashboardCard className="overflow-hidden p-4">
      <div className="space-y-3">
        {Array.from({ length: linhas }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full bg-foreground/5" />
        ))}
      </div>
    </DashboardCard>
  );
}

/** Skeleton da página de detalhe do projeto (cabeçalho + milestones). */
export function ProjetoDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Skeleton className="mb-8 h-4 w-20 bg-foreground/5" />

      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32 bg-foreground/5" />
            <Skeleton className="h-8 w-64 bg-foreground/5" />
            <Skeleton className="h-4 w-96 max-w-full bg-foreground/5" />
          </div>
          <Skeleton className="h-4 w-20 bg-foreground/5" />
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full bg-foreground/5" />
        ))}
      </div>
    </div>
  );
}
