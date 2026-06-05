import { type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface AtalhoCardProps {
  label: string;
  Icon: LucideIcon;
  onClick: () => void;
}

export function AtalhoCard({ label, Icon, onClick }: AtalhoCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"
    >
      <Card className="amber-glow shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] dark:bg-white/[0.025] dark:border-white/[0.06] hover:border-navy/30 dark:hover:border-brand-yellow/20 transition-colors cursor-pointer h-full">
        <CardContent className="pt-5 pb-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-navy dark:text-brand-yellow" />
          </div>
          <span className="font-semibold text-sm text-navy dark:text-foreground">{label}</span>
        </CardContent>
      </Card>
    </button>
  );
}
