import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { SectionHeader } from "@/pages/home/v1/primitives";

import type { Projeto, StatusProjeto } from "@link-leagues/types";

interface ProjetoRow extends Projeto {
  responsavel_nome: string | null;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const STATUS_CONFIG: Record<StatusProjeto, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "text-navy/50" },
  em_aprovacao: { label: "Em aprovação", className: "text-amber-600" },
  aprovado: { label: "Aprovado", className: "text-blue-600" },
  rejeitado: { label: "Rejeitado", className: "text-red-600" },
  em_andamento: { label: "Em andamento", className: "text-blue-600" },
  concluido: { label: "Concluído", className: "text-green-700" },
  cancelado: { label: "Cancelado", className: "text-navy/40" },
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
    return (
      <p className="font-plex-sans text-[13px] text-navy/50 dark:text-white/40">
        Carregando projetos...
      </p>
    );
  }

  return (
    <div>
      <SectionHeader numero="04" eyebrow="Iniciativas" titulo="Projetos da Liga" />
      {projetos.length === 0 ? (
        <p className="font-plex-sans text-[13px] text-navy/50 dark:text-white/40">
          Nenhum projeto cadastrado.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-foreground/[0.08]">
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Projeto
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Responsável
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Prazo
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Status
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {projetos.map((p, idx) => {
              const s = STATUS_CONFIG[p.status];
              const isLast = idx === projetos.length - 1;
              return (
                <tr
                  key={p.id}
                  className={`hover:bg-foreground/[0.03] transition-colors ${!isLast ? "border-b border-foreground/[0.06]" : ""}`}
                >
                  <td className="py-4 px-4">
                    <span className="font-plex-sans text-[13px] text-foreground font-semibold">
                      {p.titulo}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                    {p.responsavel_nome ?? "—"}
                  </td>
                  <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                    {p.prazo
                      ? new Date(p.prazo).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })
                      : "—"}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`font-plex-mono text-[12px] font-medium ${s.className}`}>
                      {s.label}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                    {p.percentual_concluido}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
