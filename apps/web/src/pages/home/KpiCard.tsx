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
      <Card className="shadow-sm">
        <CardContent className="pt-5 pb-4">
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-28 mt-2" />
        </CardContent>
      </Card>
    );
  }

  const trendClass =
    trendType === "up"
      ? "text-green-600"
      : trendType === "down"
        ? "text-red-500"
        : "text-amber-500";

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5 pb-4">
        {icon && (
          <div className="h-8 w-8 rounded-lg bg-slate-50 border border-border flex items-center justify-center mb-3">
            {icon}
          </div>
        )}
        <div className="text-3xl font-bold text-navy leading-none">{value}</div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide mt-2">{label}</div>
        {trend && <div className={cn("text-xs mt-1.5 font-medium", trendClass)}>{trend}</div>}
      </CardContent>
    </Card>
  );
}
