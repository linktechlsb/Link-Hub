import { CalendarClock, FolderKanban, Percent, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { DashboardCard } from "@/pages/home/components/DashboardCard";

import { StatStrip, TabSection } from "./primitives";

import type { CrmContato, Projeto, Evento, Recurso, StatusProjeto } from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const STATUS_PROJETO: Record<StatusProjeto, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "text-foreground/50" },
  em_aprovacao: { label: "Em aprovação", className: "text-amber-600 dark:text-amber-300" },
  aprovado: { label: "Aprovado", className: "text-sky-600 dark:text-sky-300" },
  rejeitado: { label: "Rejeitado", className: "text-red-600 dark:text-red-300" },
  em_andamento: { label: "Em andamento", className: "text-sky-600 dark:text-sky-300" },
  concluido: { label: "Concluído", className: "text-emerald-600 dark:text-emerald-300" },
  cancelado: { label: "Cancelado", className: "text-foreground/40" },
};

interface Props {
  ligaId: string;
}

export function VisaoGeralTab({ ligaId }: Props) {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [contatos, setContatos] = useState<CrmContato[]>([]);
  const [presencaPercent, setPresencaPercent] = useState<number | null>(null);
  const [proximoEvento, setProximoEvento] = useState<Evento | null>(null);
  const [score, setScore] = useState<number>(0);

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [projetosRes, recursosRes, contatosRes, presencaRes, eventoRes, scoreRes] =
        await Promise.all([
          fetch(`/api/ligas/${ligaId}/projetos`, { headers }),
          fetch(`/api/recursos?liga_id=${ligaId}`, { headers }),
          fetch(`/api/crm?liga_id=${ligaId}`, { headers }),
          fetch(`/api/ligas/${ligaId}/presenca`, { headers }),
          fetch(`/api/ligas/${ligaId}/eventos/proximo`, { headers }),
          fetch(`/api/ligas/${ligaId}/score`, { headers }),
        ]);

      if (projetosRes.ok) setProjetos(await projetosRes.json());
      if (recursosRes.ok) setRecursos(await recursosRes.json());
      if (contatosRes.ok) setContatos(await contatosRes.json());

      if (presencaRes.ok) {
        const registros = (await presencaRes.json()) as { status: string }[];
        const total = registros.filter((r) => r.status !== null).length;
        if (total > 0) {
          const presentes = registros.filter((r) => r.status === "presente").length;
          setPresencaPercent(Math.round((presentes / total) * 100));
        }
      }

      if (eventoRes.ok) setProximoEvento(await eventoRes.json());

      if (scoreRes.ok) {
        const data = (await scoreRes.json()) as { pontuacao?: number };
        setScore(data.pontuacao ?? 0);
      }
    }
    carregar();
  }, [ligaId]);

  const projetosAtivos = projetos.filter((p) => p.status === "em_andamento").length;
  const faturamentoPorMembro = "R$0";

  return (
    <div className="space-y-10">
      <TabSection titulo="Métricas da liga">
        <StatStrip
          items={[
            { label: "Score", value: String(score), icon: Trophy },
            { label: "Projetos ativos", value: String(projetosAtivos), icon: FolderKanban },
            {
              label: "Presença",
              value: presencaPercent !== null ? String(presencaPercent) : "0",
              unidade: "%",
              icon: Percent,
            },
            { label: "Fat. / membro", value: faturamentoPorMembro, icon: CalendarClock },
          ]}
        />

        <div className="grid grid-cols-2 gap-4">
          <ProjetosMiniCard projetos={projetos} />
          <DadosMiniCard recursos={recursos} contatos={contatos} />
        </div>
      </TabSection>

      {proximoEvento && (
        <TabSection titulo="Próximo evento">
          <ProximoEventoCard evento={proximoEvento} />
        </TabSection>
      )}
    </div>
  );
}

/** Contador estilo pílula reutilizado nos cards. */
function Contador({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/60">
      {n}
    </span>
  );
}

/** Tabela compacta de projetos da liga (container da esquerda). */
function ProjetosMiniCard({ projetos }: { projetos: Projeto[] }) {
  return (
    <DashboardCard className="flex h-64 flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-xs text-foreground/40">Projetos</h3>
        <Contador n={projetos.length} />
      </div>
      {projetos.length === 0 ? (
        <Vazio texto="Nenhum projeto." />
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col overflow-auto">
          {projetos.map((p) => {
            const s = STATUS_PROJETO[p.status];
            return (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0"
              >
                <span className="min-w-0 truncate text-sm text-foreground">{p.titulo}</span>
                <span className={`shrink-0 text-xs font-medium ${s.className}`}>{s.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}

type DadosView = "recursos" | "contatos";

/** Container "Dados" com select entre tabela de recursos ou de contatos. */
function DadosMiniCard({ recursos, contatos }: { recursos: Recurso[]; contatos: CrmContato[] }) {
  const [view, setView] = useState<DadosView>("recursos");
  return (
    <DashboardCard className="flex h-64 flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs text-foreground/40">Dados</h3>
        <Select value={view} onValueChange={(v) => setView(v as DadosView)}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recursos">Recursos</SelectItem>
            <SelectItem value="contatos">Contatos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {view === "recursos" ? (
        recursos.length === 0 ? (
          <Vazio texto="Nenhum recurso." />
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col overflow-auto">
            {recursos.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2.5 border-b border-border py-2.5 last:border-0"
              >
                <span
                  className="size-6 shrink-0 rounded-md"
                  style={{ backgroundColor: r.cor }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{r.titulo}</p>
                  <p className="truncate text-[10px] capitalize text-foreground/40">{r.tipo}</p>
                </div>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[11px] font-medium text-foreground/50 transition-colors hover:text-foreground"
                >
                  ↗ Abrir
                </a>
              </li>
            ))}
          </ul>
        )
      ) : contatos.length === 0 ? (
        <Vazio texto="Nenhum contato." />
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col overflow-auto">
          {contatos.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{c.nome}</p>
                <p className="truncate text-[10px] text-foreground/40">
                  {[c.emprego, c.empresa].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-xs text-foreground/40">{texto}</p>
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
    <DashboardCard className="flex items-start gap-6 p-5">
      <div className="flex-shrink-0 text-center">
        <div className="text-[10px] uppercase tracking-wide text-foreground/40">{weekday}</div>
        <div className="font-display text-4xl font-bold leading-none text-foreground">{day}</div>
        <div className="mt-1 text-[10px] uppercase tracking-wide text-foreground/40">
          {month} {year}
        </div>
      </div>
      <div className="flex-1 border-l border-border pl-6">
        <div className="text-[10px] uppercase tracking-wide text-foreground/40">{hora}</div>
        <div className="mt-1 font-display text-base font-bold text-foreground">{evento.titulo}</div>
        {evento.descricao && (
          <div className="mt-1 text-sm text-foreground/60">{evento.descricao}</div>
        )}
      </div>
    </DashboardCard>
  );
}
