import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface TabItem {
  id: string;
  label: string;
}

interface AnimatedTabsProps {
  tabs: (string | TabItem)[];
  activeTab: string;
  onChange: (tab: string) => void;
  wrapperClassName?: string;
  innerClassName?: string;
  tabClassName?: string;
  activeTabClassName?: string;
  inactiveTabClassName?: string;
  indicatorClassName?: string;
}

export function AnimatedTabs({
  tabs,
  activeTab,
  onChange,
  wrapperClassName,
  innerClassName,
  tabClassName,
  activeTabClassName = "text-navy",
  inactiveTabClassName = "text-navy/40 hover:text-navy",
  indicatorClassName = "bg-navy",
}: AnimatedTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const normalized = tabs.map((t) =>
    typeof t === "string" ? { id: t, label: t } : t,
  );

  useEffect(() => {
    const idx = normalized.findIndex((t) => t.id === activeTab);
    const btn = tabRefs.current[idx];
    const container = containerRef.current;
    if (!btn || !container) return;
    const cr = container.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setIndicator({ left: br.left - cr.left, width: br.width, ready: true });
  }, [activeTab, tabs]);

  return (
    <div className={cn("border-b border-navy/15", wrapperClassName)}>
      <div ref={containerRef} className={cn("flex relative", innerClassName)}>
        {normalized.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => { tabRefs.current[i] = el; }}
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-5 py-3 font-plex-mono text-[10px] uppercase tracking-[0.14em] transition-colors whitespace-nowrap",
              activeTab === tab.id ? activeTabClassName : inactiveTabClassName,
              tabClassName,
            )}
          >
            {tab.label}
          </button>
        ))}
        <div
          className={cn(
            "absolute bottom-0 h-0.5",
            indicator.ready ? "transition-all duration-200 ease-out" : "transition-none",
            indicatorClassName,
          )}
          style={{ left: indicator.left, width: indicator.width }}
        />
      </div>
    </div>
  );
}
