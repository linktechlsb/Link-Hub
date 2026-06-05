import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  trend?: string;
  trendType?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  loading?: boolean;
}

export function KpiCard({
  label,
  value,
  trend,
  trendType = "up",
  icon,
  loading = false,
}: KpiCardProps) {
  if (loading) {
    return (
      <Card className="shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] dark:bg-white/[0.025] dark:border-white/[0.06]">
        <CardContent className="pt-5 pb-4">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-3 w-28 mt-2.5" />
        </CardContent>
      </Card>
    );
  }

  const trendClass =
    trendType === "up"
      ? "text-green-500"
      : trendType === "down"
        ? "text-red-500"
        : "text-amber-500";

  return (
    <Card className="shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] dark:bg-white/[0.025] dark:border-white/[0.06] animate-fade-in-up">
      <CardContent className="pt-5 pb-4">
        {icon && (
          <div className="h-8 w-8 rounded-lg bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center mb-3 text-brand-yellow">
            {icon}
          </div>
        )}
        <div className="text-4xl font-bold text-foreground leading-none tracking-tight">
          {value}
        </div>
        <div className="text-[11px] text-muted-foreground/80 uppercase tracking-wider mt-2.5">
          {label}
        </div>
        {trend && <div className={cn("text-xs mt-1.5 font-medium", trendClass)}>{trend}</div>}
      </CardContent>
    </Card>
  );
}
