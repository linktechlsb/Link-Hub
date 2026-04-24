import { SectionHeader, KpiRow, RankingList, type RankingV1Item } from "./primitives";

const METRICAS = [
  { label: "Meu score", valor: "72", unidade: "pts", trend: "↑ +5pts" },
  { label: "Minha frequência", valor: "87", unidade: "%", trend: "↑ +2%" },
  { label: "Projetos", valor: "2", unidade: "", trend: "Estável" },
  { label: "Próxima reunião", valor: "18/04", unidade: "", trend: "19:00" },
];

const RANKING: RankingV1Item[] = [
  { id: "r1", nome: "Liga Tech", score: 840, destaque: true },
  { id: "r2", nome: "Link Finance", score: 710 },
  { id: "r3", nome: "Marketing", score: 620 },
  { id: "r4", nome: "RH", score: 480 },
];

export function HomeMembroViewV1() {
  return (
    <div className="space-y-12">
      <section>
        <SectionHeader numero="01" eyebrow="Meu desempenho" titulo="Performance pessoal" />
        <KpiRow items={METRICAS} />
      </section>

      <section>
        <SectionHeader numero="02" eyebrow="Ranking geral" titulo="Onde sua liga está" />
        <RankingList items={RANKING} />
      </section>
    </div>
  );
}
