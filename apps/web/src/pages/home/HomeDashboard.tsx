import { ChartPanel } from "./components/ChartPanel";
import { HomeCalendarPanel } from "./components/HomeCalendarPanel";
import { HomeTasksPanel } from "./components/HomeTasksPanel";
import { KpiStrip } from "./components/KpiStrip";
import { useHomeKpis } from "./components/useHomeKpis";

import type { HomeData } from "./v1/useHomeData";

/**
 * Layout do dashboard da Home (dark mode).
 *  1. Faixa de 4 KPIs
 *  2. Mini calendário do mês + mini tabela de tarefas (por papel)
 *  3. Dois painéis de gráfico (skeleton — fora de escopo)
 */
export function HomeDashboard({ data }: { data: HomeData }) {
  const kpis = useHomeKpis(data);

  return (
    <div className="flex flex-col gap-4">
      <KpiStrip items={kpis.items} loading={kpis.loading} />

      <div className="grid grid-cols-2 gap-4">
        <HomeCalendarPanel />
        <HomeTasksPanel data={data} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ChartPanel chartClassName="h-40" />
        <ChartPanel chartClassName="h-40" />
      </div>
    </div>
  );
}
