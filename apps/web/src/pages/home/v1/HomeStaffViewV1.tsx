import { useNavigate } from "react-router-dom";

import { AlertList, EditorialTable, KpiRow, SectionHeader, type AlertV1Item } from "./primitives";

const METRICAS = [
  { label: "Ligas ativas", valor: "4", trend: "↑ +1 este mês" },
  { label: "Membros", valor: "96", trend: "↑ +5 este mês" },
  { label: "Projetos ativos", valor: "8", trend: "Estável" },
  { label: "Engajamento", valor: "78", unidade: "%", trend: "↑ +3%" },
];

const ENGAJAMENTO = [
  { label: "Média presença", valor: "71", unidade: "%" },
  { label: "Reuniões no mês", valor: "14" },
  { label: "Eventos ativos", valor: "3" },
  { label: "Receita total", valor: "R$ 8.700" },
];

const DESTAQUES = [
  { id: "1", label: "Score", titulo: "Liga de Marketing", sub: "+12pts essa semana" },
  { id: "2", label: "Projeto", titulo: "Análise de Mercado", sub: "Concluído ontem" },
  { id: "3", label: "Ranking", titulo: "Liga de Finanças", sub: "Lidera a temporada" },
];

const ALERTAS: AlertV1Item[] = [
  {
    id: "s1",
    titulo: "Liga RH",
    descricao: "Engajamento em 32% — abaixo do mínimo",
    tipo: "urgente",
  },
  {
    id: "s3",
    titulo: "Liga Marketing",
    descricao: "Sem reunião registrada há 2 semanas",
    tipo: "atencao",
  },
];

const PRESENCA = [
  { id: "p1", nome: "Liga Tech", presenca: 94 },
  { id: "p2", nome: "Link Finance", presenca: 87 },
  { id: "p3", nome: "Marketing", presenca: 72 },
  { id: "p4", nome: "RH", presenca: 32 },
];

interface HomeStaffViewV1Props {
  pendentes: {
    projetos: { id: string; titulo: string; liga?: { nome: string } }[];
    eventos: { id: string; titulo: string; liga?: { nome: string } }[];
  };
}

export function HomeStaffViewV1({ pendentes }: HomeStaffViewV1Props) {
  const navigate = useNavigate();

  const alertasCompletos: AlertV1Item[] = [
    ...ALERTAS,
    ...(pendentes.projetos.length > 0
      ? [
          {
            id: "pend-proj",
            titulo: `${pendentes.projetos.length} projeto${pendentes.projetos.length > 1 ? "s" : ""} aguardando aprovação`,
            descricao: "Clique para revisar e aprovar",
            tipo: "atencao" as const,
          },
        ]
      : []),
    ...(pendentes.eventos.length > 0
      ? [
          {
            id: "pend-ev",
            titulo: `${pendentes.eventos.length} evento${pendentes.eventos.length > 1 ? "s" : ""} aguardando aprovação`,
            descricao: "Clique para revisar e aprovar",
            tipo: "atencao" as const,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-12">
      <section>
        <SectionHeader numero="01" eyebrow="Destaques da semana" titulo="Três movimentos a notar" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-b border-navy/15">
          {DESTAQUES.map((d, i) => (
            <div
              key={d.id}
              className={`py-5 px-4 ${i < DESTAQUES.length - 1 ? "md:border-r border-navy/15" : ""}`}
            >
              <div className="font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/60">
                {d.label}
              </div>
              <div className="font-plex-sans font-bold text-[18px] text-navy tracking-[-0.02em] mt-2">
                {d.titulo}
              </div>
              <div className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/50 mt-2">
                {d.sub}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader numero="02" eyebrow="Métricas globais" titulo="Estado das ligas" />
        <KpiRow items={METRICAS} />
      </section>

      {alertasCompletos.length > 0 && (
        <section>
          <SectionHeader
            numero="03"
            eyebrow="Alertas de atenção"
            titulo="Ação necessária"
            acao={
              <button
                onClick={() => navigate("/super-admin")}
                className="font-plex-mono text-[10px] uppercase tracking-[0.2em] text-navy border-b border-navy pb-0.5"
              >
                Ver todos →
              </button>
            }
          />
          <AlertList items={alertasCompletos} onClick={() => navigate("/super-admin")} />
        </section>
      )}

      <section>
        <SectionHeader numero="04" eyebrow="Ranking de presença" titulo="Comparativo por liga" />
        <EditorialTable
          columns={["#", "Liga", "Presença", "Barra"]}
          rows={PRESENCA.map((r, i) => {
            const baixa = r.presenca < 50;
            const media = r.presenca < 70;
            return [
              <span
                key="i"
                className={`font-plex-mono text-[11px] tracking-[0.14em] ${baixa ? "text-navy" : "text-navy/60"}`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>,
              <span
                key="n"
                className={`font-plex-sans ${baixa ? "font-bold text-navy" : "font-medium text-navy/80"}`}
              >
                {r.nome}
              </span>,
              <span
                key="p"
                className={`font-plex-sans font-bold text-[16px] tracking-[-0.02em] ${
                  baixa ? "text-navy" : media ? "text-navy/80" : "text-navy"
                }`}
              >
                {r.presenca}%
              </span>,
              <div key="bar" className="relative h-px bg-navy/10 w-32">
                <div
                  className={`absolute left-0 top-0 h-px ${baixa ? "bg-navy" : "bg-navy/60"}`}
                  style={{ width: `${r.presenca}%` }}
                />
              </div>,
            ];
          })}
        />
      </section>

      <section>
        <SectionHeader
          numero="05"
          eyebrow="Engajamento global"
          titulo="Indicadores de participação"
        />
        <KpiRow items={ENGAJAMENTO} />
      </section>
    </div>
  );
}
