import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { EditorialTable, SectionHeader } from "@/pages/home/v1/primitives";

import type { StatusPresenca } from "@link-leagues/types";

interface PresencaRow {
  id: string;
  evento_id: string;
  evento_titulo: string;
  evento_data: string;
  usuario_id: string;
  usuario_nome: string;
  status: StatusPresenca;
  justificativa: string | null;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const STATUS_CONFIG: Record<StatusPresenca, { label: string; className: string }> = {
  presente: { label: "Presente", className: "text-green-700" },
  ausente: { label: "Ausente", className: "text-red-600" },
  justificado: { label: "Justificado", className: "text-amber-600" },
};

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

  if (carregando) {
    return <p className="font-plex-sans text-[13px] text-navy/50">Carregando presenças...</p>;
  }

  const comStatus = registros.filter((r) => r.status !== null);

  return (
    <div>
      <SectionHeader numero="01" eyebrow="Registros" titulo="Presença dos Membros" />
      {comStatus.length === 0 ? (
        <p className="font-plex-sans text-[13px] text-navy/50">
          Nenhum registro de presença encontrado.
        </p>
      ) : (
        <EditorialTable
          columns={["Membro", "Evento", "Status", "Justificativa"]}
          rows={comStatus.map((r) => {
            const s = STATUS_CONFIG[r.status];
            return [
              r.usuario_nome,
              r.evento_titulo,
              <span key={r.id} className={`font-medium ${s.className}`}>
                {s.label}
              </span>,
              r.justificativa ?? "—",
            ];
          })}
        />
      )}
    </div>
  );
}
