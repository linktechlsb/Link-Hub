import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import type { Projeto, Evento } from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function primeiroUltimoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length <= 2) return nome;
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

interface Props {
  ligaId: string;
  diretores: { id: string; nome: string }[];
}

function MetricCard({
  value,
  label,
  sub,
  valueClass = "text-navy",
}: {
  value: string;
  label: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white border border-brand-gray rounded-lg p-3 text-center">
      <div className={`text-xl font-bold ${valueClass}`}>{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
      <div className="text-xs text-muted-foreground/60 mt-0.5">{sub}</div>
    </div>
  );
}

export function VisaoGeralTab({ ligaId, diretores }: Props) {
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
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">Diretores</p>
        {diretores.length > 0 ? (
          <div className="flex flex-col gap-2">
            {diretores.map((d) => (
              <div
                key={d.id}
                className="bg-white border border-brand-gray rounded-lg p-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-link-blue flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                  {d.nome.charAt(0).toUpperCase()}
                </div>
                <div className="font-semibold text-navy text-sm">{primeiroUltimoNome(d.nome)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum diretor cadastrado.</p>
        )}
      </div>

      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Métricas da Liga
        </p>
        <div className="grid grid-cols-4 gap-3">
          <MetricCard value={String(projetosAtivos)} label="Proj. Ativos" sub="em andamento" />
          <MetricCard
            value={String(score)}
            label="Score"
            sub="valor fictício"
            valueClass="text-amber-500"
          />
          <MetricCard
            value={presencaPercent !== null ? `${presencaPercent}%` : "—"}
            label="Presença"
            sub="média da liga"
            valueClass="text-green-600"
          />
          <MetricCard
            value={faturamentoPorMembro}
            label="Fat./Membro"
            sub="valor fictício"
            valueClass="text-link-blue"
          />
        </div>
      </div>

      {proximoEvento && (
        <div>
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
            Próximo Evento
          </p>
          <div className="bg-white border border-brand-gray rounded-lg p-4 flex items-center gap-4">
            <div className="bg-navy text-white rounded-lg px-4 py-3 text-center flex-shrink-0">
              <div className="text-2xl font-bold leading-none">
                {new Date(proximoEvento.data).getDate()}
              </div>
              <div className="text-xs opacity-70 uppercase mt-1">
                {new Date(proximoEvento.data).toLocaleString("pt-BR", { month: "short" })}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-navy text-sm">{proximoEvento.titulo}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(proximoEvento.data).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                {" · "}
                {new Date(proximoEvento.data).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {proximoEvento.descricao && (
                <p className="text-xs text-muted-foreground mt-0.5">{proximoEvento.descricao}</p>
              )}
              <span className="inline-block mt-2 bg-amber-50 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-md">
                em breve
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
