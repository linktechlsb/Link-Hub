interface SectionLabelProps {
  children: React.ReactNode;
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <p className="text-xs font-bold text-link-blue dark:text-white uppercase tracking-wider mb-3">
      {children}
    </p>
  );
}
