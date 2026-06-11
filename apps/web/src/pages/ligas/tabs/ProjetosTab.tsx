import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import { TabSection } from "./primitives";

import type { Projeto, StatusProjeto } from "@link-leagues/types";

interface ProjetoRow extends Projeto {
  responsavel_nome: string | null;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const STATUS_CONFIG: Record<StatusProjeto, { label: string; className: string }> = {
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

export function ProjetosTab({ ligaId }: Props) {
  const [projetos, setProjetos] = useState<ProjetoRow[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const res = await fetch(`/api/ligas/${ligaId}/projetos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProjetos(await res.json());
      setCarregando(false);
    }
    carregar();
  }, [ligaId]);

  if (carregando) {
    return <p className="text-sm text-foreground/50">Carregando projetos...</p>;
  }

  return (
    <TabSection titulo="Projetos da liga">
      {projetos.length === 0 ? (
        <p className="text-sm text-foreground/50">Nenhum projeto cadastrado.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              {["Projeto", "Responsável", "Prazo", "Status", "%"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-foreground/40"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projetos.map((p) => {
              const s = STATUS_CONFIG[p.status];
              return (
                <tr
                  key={p.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-foreground/[0.03]"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-foreground">{p.titulo}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground/60">
                    {p.responsavel_nome ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground/60">
                    {p.prazo
                      ? new Date(p.prazo).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${s.className}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-foreground/60">
                    {p.percentual_concluido}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </TabSection>
  );
}
