interface SectionLabelProps {
  children: React.ReactNode;
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="h-1 w-1 rounded-full bg-brand-yellow shrink-0" />
      <p className="text-[10px] font-semibold text-foreground/40 dark:text-white/30 uppercase tracking-[0.14em]">
        {children}
      </p>
    </div>
  );
}
