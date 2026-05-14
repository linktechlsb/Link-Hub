import { type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface AtalhoCardProps {
  label: string;
  Icon: LucideIcon;
  onClick: () => void;
}

export function AtalhoCard({ label, Icon, onClick }: AtalhoCardProps) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card className="shadow-sm hover:border-navy/30 hover:bg-navy/5 transition-colors cursor-pointer h-full">
        <CardContent className="pt-5 pb-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-background border border-[#191919] flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-navy" />
          </div>
          <span className="font-semibold text-sm text-navy">{label}</span>
        </CardContent>
      </Card>
    </button>
  );
}
