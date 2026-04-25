import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { EditorialTable, SectionHeader } from "@/pages/home/v1/primitives";

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
    return <p className="font-plex-sans text-[13px] text-navy/50">Carregando projetos...</p>;
  }

  return (
    <div>
      <SectionHeader numero="01" eyebrow="Iniciativas" titulo="Projetos da Liga" />
      {projetos.length === 0 ? (
        <p className="font-plex-sans text-[13px] text-navy/50">Nenhum projeto cadastrado.</p>
      ) : (
        <EditorialTable
          columns={["Projeto", "Responsável", "Prazo", "Status", "%"]}
          rows={projetos.map((p) => {
            const s = STATUS_CONFIG[p.status];
            return [
              <span key={p.id} className="font-medium">
                {p.titulo}
              </span>,
              p.responsavel_nome ?? "—",
              p.prazo
                ? new Date(p.prazo).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })
                : "—",
              <span key={`s-${p.id}`} className={`font-medium ${s.className}`}>
                {s.label}
              </span>,
              <span key={`pct-${p.id}`} className="font-plex-mono text-navy/70">
                {p.percentual_concluido}
              </span>,
            ];
          })}
        />
      )}
    </div>
  );
}
