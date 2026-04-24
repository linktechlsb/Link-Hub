import { useNavigate } from "react-router-dom";

import { EditorialTable, KpiRow, SectionHeader } from "./primitives";

const METRICAS = [
  { label: "Score", valor: "840", unidade: "pts", trend: "↑ +12pts" },
  { label: "Projetos ativos", valor: "5", trend: "Estável" },
  { label: "Membros", valor: "24", trend: "↑ +2" },
  { label: "Frequência", valor: "87", unidade: "%", trend: "↑ +3%" },
];

const FILA = [
  { id: "f1", nome: "App de presenças", diasAguardando: 9 },
  { id: "f2", nome: "API de integração", diasAguardando: 2 },
  { id: "f3", nome: "Sistema de feedback", diasAguardando: 1 },
];

const EVENTOS = [
  { id: "e1", nome: "Reunião semanal", data: "Sex 18/04", hora: "19:00" },
  { id: "e2", nome: "Workshop de produto", data: "Ter 22/04", hora: "18:00" },
];

function statusLabel(dias: number) {
  if (dias > 7) return "Urgente";
  if (dias >= 4) return "Atenção";
  return "Aguardando";
}

export function HomeProfessorViewV1() {
  const navigate = useNavigate();

  return (
    <div className="space-y-12">
      <section>
        <SectionHeader numero="01" eyebrow="Métricas da liga" titulo="Indicadores atuais" />
        <KpiRow items={METRICAS} />
      </section>

      <section>
        <SectionHeader
          numero="02"
          eyebrow="Fila de aprovação"
          titulo="Projetos aguardando revisão"
          acao={
            <button
              onClick={() => navigate("/projetos")}
              className="font-plex-mono text-[10px] uppercase tracking-[0.2em] text-navy border-b border-navy pb-0.5"
            >
              Ver todos →
            </button>
          }
        />
        <EditorialTable
          columns={["Projeto", "Aguardando", "Status", "Ação"]}
          rows={FILA.map((p) => [
            <span key="nome" className="font-semibold">
              {p.nome}
            </span>,
            <span key="dias" className="font-plex-mono text-[11px] text-navy/70">
              {String(p.diasAguardando).padStart(2, "0")} dia{p.diasAguardando > 1 ? "s" : ""}
            </span>,
            <span
              key="status"
              className="font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy border border-navy px-2 py-1"
            >
              {statusLabel(p.diasAguardando)}
            </span>,
            <button
              key="cta"
              onClick={() => navigate("/projetos")}
              className="font-plex-mono text-[10px] uppercase tracking-[0.2em] text-navy border-b border-navy pb-0.5"
            >
              Revisar →
            </button>,
          ])}
        />
      </section>

      <section>
        <SectionHeader numero="03" eyebrow="Agenda" titulo="Próximos eventos da liga" />
        <ul className="border-t border-navy/15">
          {EVENTOS.map((e) => (
            <li
              key={e.id}
              className="border-b border-navy/15 py-4 flex items-baseline justify-between"
            >
              <div>
                <div className="font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/60">
                  {e.data}
                </div>
                <div className="font-plex-sans font-semibold text-[15px] text-navy mt-1">
                  {e.nome}
                </div>
              </div>
              <span className="font-plex-sans font-bold text-[18px] text-navy tracking-[-0.02em]">
                {e.hora}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
