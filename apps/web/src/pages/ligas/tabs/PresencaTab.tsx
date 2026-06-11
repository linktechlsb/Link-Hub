import { useEffect, useMemo, useState } from "react";

import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";

import { TabSection } from "./primitives";

import type { StatusPresenca } from "@link-leagues/types";

interface PresencaRow {
  id: string;
  evento_id: string;
  evento_titulo: string;
  evento_data: string;
  usuario_id: string;
  usuario_nome: string;
  status: StatusPresenca | null;
  justificativa: string | null;
}

interface ResumoMembro {
  usuarioId: string;
  nome: string;
  total: number;
  presentes: number;
  justificados: number;
  ausentes: number;
  percentual: number;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

interface Props {
  ligaId: string;
}

export function PresencaTab({ ligaId }: Props) {
  const [registros, setRegistros] = useState<PresencaRow[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const res = await fetch(`/api/ligas/${ligaId}/presenca`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRegistros(await res.json());
      setCarregando(false);
    }
    carregar();
  }, [ligaId]);

  const resumo = useMemo<ResumoMembro[]>(() => {
    const mapa = new Map<string, ResumoMembro>();
    for (const r of registros) {
      if (!r.usuario_id) continue;
      const atual = mapa.get(r.usuario_id) ?? {
        usuarioId: r.usuario_id,
        nome: r.usuario_nome,
        total: 0,
        presentes: 0,
        justificados: 0,
        ausentes: 0,
        percentual: 0,
      };
      atual.total += 1;
      if (r.status === "presente") atual.presentes += 1;
      else if (r.status === "justificado") atual.justificados += 1;
      else atual.ausentes += 1;
      mapa.set(r.usuario_id, atual);
    }
    const lista = Array.from(mapa.values()).map((m) => ({
      ...m,
      percentual: m.total === 0 ? 0 : Math.round(((m.presentes + m.justificados) / m.total) * 100),
    }));
    lista.sort((a, b) => b.percentual - a.percentual || a.nome.localeCompare(b.nome));
    return lista;
  }, [registros]);

  if (carregando) {
    return <p className="text-sm text-foreground/50">Carregando presenças...</p>;
  }

  return (
    <TabSection titulo="Presença dos membros">
      {resumo.length === 0 ? (
        <p className="text-sm text-foreground/50">Nenhum registro de presença encontrado.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {resumo.map((m) => (
            <li key={m.usuarioId} className="grid grid-cols-[1fr_auto] items-center gap-6 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">{m.nome}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-foreground/50">
                  {m.presentes + m.justificados} de {m.total} presenças
                  {m.justificados > 0 ? ` · ${m.justificados} justificada(s)` : ""}
                </p>
                <Progress value={m.percentual} className="mt-2 h-1.5" />
              </div>
              <span className="w-12 text-right text-sm tabular-nums text-foreground">
                {m.percentual}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </TabSection>
  );
}
