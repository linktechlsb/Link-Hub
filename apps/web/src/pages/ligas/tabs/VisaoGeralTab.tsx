import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { KpiRow, SectionHeader } from "@/pages/home/v1/primitives";

import type { Projeto, Evento } from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

interface Props {
  ligaId: string;
}

export function VisaoGeralTab({ ligaId }: Props) {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [presencaPercent, setPresencaPercent] = useState<number | null>(null);
  const [proximoEvento, setProximoEvento] = useState<Evento | null>(null);

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [projetosRes, presencaRes, eventoRes] = await Promise.all([
        fetch(`/api/ligas/${ligaId}/projetos`, { headers }),
        fetch(`/api/ligas/${ligaId}/presenca`, { headers }),
        fetch(`/api/ligas/${ligaId}/eventos/proximo`, { headers }),
      ]);

      if (projetosRes.ok) setProjetos(await projetosRes.json());

      if (presencaRes.ok) {
        const registros = (await presencaRes.json()) as { status: string }[];
        const total = registros.filter((r) => r.status !== null).length;
        if (total > 0) {
          const presentes = registros.filter((r) => r.status === "presente").length;
          setPresencaPercent(Math.round((presentes / total) * 100));
        }
      }

      if (eventoRes.ok) setProximoEvento(await eventoRes.json());
    }
    carregar();
  }, [ligaId]);

  const projetosAtivos = projetos.filter((p) => p.status === "em_andamento").length;
  // Valores fictícios — substituir quando campos forem implementados
  const score = 78;
  const faturamentoPorMembro = "R$420";

  return (
    <div className="space-y-12">
      <div>
        <SectionHeader numero="01" eyebrow="Desempenho" titulo="Métricas da Liga" />
        <KpiRow
          items={[
            { label: "Score", valor: String(score), trend: "valor fictício" },
            { label: "Projetos ativos", valor: String(projetosAtivos), unidade: "em andamento" },
            {
              label: "Presença",
              valor: presencaPercent !== null ? String(presencaPercent) : "—",
              unidade: presencaPercent !== null ? "%" : undefined,
            },
            { label: "Fat. / Membro", valor: faturamentoPorMembro, trend: "valor fictício" },
          ]}
        />
      </div>

      {proximoEvento && (
        <div>
          <SectionHeader numero="02" eyebrow="Agenda" titulo="Próximo Evento" />
          <ProximoEventoCard evento={proximoEvento} />
        </div>
      )}
    </div>
  );
}

function ProximoEventoCard({ evento }: { evento: Evento }) {
  const data = new Date(evento.data);
  const weekday = data.toLocaleString("pt-BR", { weekday: "short" }).toUpperCase().replace(".", "");
  const day = data.getDate();
  const month = data.toLocaleString("pt-BR", { month: "short" }).toUpperCase().replace(".", "");
  const year = data.getFullYear();
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="border-t border-navy/15 pt-5">
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0 text-center">
          <div className="font-plex-mono text-[9px] uppercase tracking-[0.2em] text-navy/50">
            {weekday}
          </div>
          <div className="font-plex-sans font-bold text-[42px] leading-none text-navy tracking-[-0.035em]">
            {day}
          </div>
          <div className="font-plex-mono text-[9px] uppercase tracking-[0.2em] text-navy/50 mt-1">
            {month} {year}
          </div>
        </div>
        <div className="border-l border-navy/15 pl-6 flex-1">
          <div className="font-plex-mono text-[9px] uppercase tracking-[0.2em] text-navy/50">
            {hora}
          </div>
          <div className="font-plex-sans font-bold text-[18px] text-navy tracking-[-0.02em] mt-1">
            {evento.titulo}
          </div>
          {evento.descricao && (
            <div className="font-plex-sans text-[13px] text-navy/60 mt-1">{evento.descricao}</div>
          )}
        </div>
      </div>
    </div>
  );
}
