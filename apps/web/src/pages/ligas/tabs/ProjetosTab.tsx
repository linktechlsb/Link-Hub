import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import type { Projeto, StatusProjeto } from "@link-leagues/types";

interface ProjetoRow extends Projeto {
  responsavel_nome: string | null;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const STATUS_CONFIG: Record<StatusProjeto, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-gray-100 text-gray-600" },
  em_aprovacao: { label: "Em aprovação", className: "bg-yellow-100 text-yellow-700" },
  aprovado: { label: "Aprovado", className: "bg-blue-100 text-blue-700" },
  rejeitado: { label: "Rejeitado", className: "bg-red-100 text-red-700" },
  em_andamento: { label: "Em andamento", className: "bg-blue-100 text-blue-700" },
  concluido: { label: "Concluído", className: "bg-green-100 text-green-700" },
  cancelado: { label: "Cancelado", className: "bg-gray-100 text-gray-500" },
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
    return <p className="text-sm text-muted-foreground">Carregando projetos...</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-link-blue uppercase tracking-wider">Projetos da Liga</p>
      {projetos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum projeto cadastrado.</p>
      ) : (
        projetos.map((p) => {
          const s = STATUS_CONFIG[p.status];
          return (
            <div
              key={p.id}
              className="bg-white border border-brand-gray rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-navy text-sm">{p.titulo}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Resp: {p.responsavel_nome ?? "—"}
                  {p.prazo ? ` · Prazo: ${new Date(p.prazo).toLocaleDateString("pt-BR")}` : ""}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${s.className}`}>
                  {s.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {p.percentual_concluido}% concluído
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
