import { useNavigate } from "react-router-dom";

import { useCachedFetch } from "@/hooks/use-cached-fetch";

import { AlertList, EditorialTable, KpiRow, SectionHeader, type AlertV1Item } from "./primitives";

import type { Evento, Liga, RankingLiga } from "@link-leagues/types";

interface HomeStaffViewV1Props {
  pendentes: {
    projetos: { id: string; titulo: string; liga?: { nome: string } }[];
    eventos: { id: string; titulo: string; liga?: { nome: string } }[];
  };
  ligas: Liga[];
  ranking: RankingLiga[];
}

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function inicioMesIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function fimMesIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function HomeStaffViewV1({ pendentes, ligas, ranking }: HomeStaffViewV1Props) {
  const navigate = useNavigate();

  const { data: eventosMesData } = useCachedFetch<Evento[]>(
    `/api/eventos?inicio=${inicioMesIso()}&fim=${fimMesIso()}`,
  );
  const { data: eventosFuturosData } = useCachedFetch<Evento[]>(
    `/api/eventos?inicio=${new Date().toISOString().slice(0, 10)}`,
  );

  const eventosMes = eventosMesData ?? [];
  const eventosFuturos = eventosFuturosData ?? [];

  const totalMembros = ligas.reduce((acc, l) => acc + (l.total_membros ?? 0), 0);
  const totalProjetos = ranking.reduce((acc, r) => acc + (r.projetos_em_andamento ?? 0), 0);
  const totalReceita = ranking.reduce((acc, r) => acc + Number(r.receita_total ?? 0), 0);
  const totalPresencas = ranking.reduce((acc, r) => acc + (r.presencas ?? 0), 0);

  const metricas = [
    { label: "Ligas ativas", valor: String(ligas.length) },
    { label: "Membros", valor: String(totalMembros) },
    { label: "Projetos ativos", valor: String(totalProjetos) },
    { label: "Presenças", valor: String(totalPresencas) },
  ];

  const engajamento = [
    { label: "Reuniões no mês", valor: String(eventosMes.length) },
    { label: "Eventos ativos", valor: String(eventosFuturos.length) },
    { label: "Receita total", valor: formatarMoeda(totalReceita) },
    { label: "Presenças", valor: String(totalPresencas) },
  ];

  const ligasComEvento = new Set(eventosFuturos.map((e) => e.liga_id));
  const alertasLigas: AlertV1Item[] = ligas
    .filter((l) => !ligasComEvento.has(l.id))
    .slice(0, 3)
    .map((l) => ({
      id: `sem-evento-${l.id}`,
      titulo: l.nome,
      descricao: "Sem eventos futuros programados",
      tipo: "atencao",
    }));

  const alertasCompletos: AlertV1Item[] = [
    ...alertasLigas,
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

  const presencaOrdenada = [...ranking]
    .sort((a, b) => (b.presencas ?? 0) - (a.presencas ?? 0))
    .slice(0, 5);
  const maxPresencas = Math.max(...presencaOrdenada.map((r) => r.presencas ?? 0), 1);

  let secao = 1;

  return (
    <div className="space-y-12">
      <section>
        <SectionHeader
          numero={String(secao++).padStart(2, "0")}
          eyebrow="Métricas globais"
          titulo="Estado das ligas"
        />
        <KpiRow items={metricas} />
      </section>

      {alertasCompletos.length > 0 && (
        <section>
          <SectionHeader
            numero={String(secao++).padStart(2, "0")}
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

      {presencaOrdenada.length > 0 && (
        <section>
          <SectionHeader
            numero={String(secao++).padStart(2, "0")}
            eyebrow="Ranking de presença"
            titulo="Comparativo por liga"
          />
          <EditorialTable
            columns={["#", "Liga", "Presenças", "Barra"]}
            rows={presencaOrdenada.map((r, i) => {
              const percent = Math.round(((r.presencas ?? 0) / maxPresencas) * 100);
              const baixa = percent < 33;
              const media = percent < 66;
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
                  {r.presencas ?? 0}
                </span>,
                <div key="bar" className="relative h-px bg-navy/10 w-32">
                  <div
                    className={`absolute left-0 top-0 h-px ${baixa ? "bg-navy" : "bg-navy/60"}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>,
              ];
            })}
          />
        </section>
      )}

      <section>
        <SectionHeader
          numero={String(secao++).padStart(2, "0")}
          eyebrow="Engajamento global"
          titulo="Indicadores de participação"
        />
        <KpiRow items={engajamento} />
      </section>
    </div>
  );
}
