import { HomeCalendarPanel } from "./components/HomeCalendarPanel";
import { HomeTasksPanel } from "./components/HomeTasksPanel";
import { KpiStrip } from "./components/KpiStrip";
import { MilestonesPanel } from "./components/MilestonesPanel";
import { PendenciasPanel } from "./components/PendenciasPanel";
import { RankingPanel } from "./components/RankingPanel";
import { useHomeKpis } from "./components/useHomeKpis";

import type { HomeData } from "./v1/useHomeData";

/**
 * Layout do dashboard da Home (dark mode).
 *  1. Faixa de 4 KPIs
 *  2. Mini calendário do mês + mini tabela de tarefas (por papel)
 *  3. Ranking das ligas + coluna de Pendências e Próximos marcos
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
        <RankingPanel data={data} />
        <div className="flex flex-col gap-4">
          <PendenciasPanel />
          <MilestonesPanel />
        </div>
      </div>
    </div>
  );
}
