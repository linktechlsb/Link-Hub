import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
  presente: { label: "Presente", className: "bg-green-100 text-green-700" },
  ausente: { label: "Ausente", className: "bg-red-100 text-red-700" },
  justificado: { label: "Justificado", className: "bg-yellow-100 text-yellow-700" },
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
    return <p className="text-sm text-muted-foreground">Carregando presenças...</p>;
  }

  const comStatus = registros.filter((r) => r.status !== null);

  return (
    <div>
      <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
        Presença dos Membros
      </p>
      {comStatus.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum registro de presença encontrado.</p>
      ) : (
        <div className="bg-white border border-brand-gray rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-gray/50 border-b border-brand-gray">
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-4 py-2">
                  Membro
                </th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-4 py-2">
                  Evento
                </th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-4 py-2">
                  Status
                </th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-4 py-2">
                  Justificativa
                </th>
              </tr>
            </thead>
            <tbody>
              {comStatus.map((r) => {
                const s = STATUS_CONFIG[r.status];
                return (
                  <tr key={r.id} className="border-b border-brand-gray last:border-0">
                    <td className="px-4 py-3 text-sm font-medium text-navy">{r.usuario_nome}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.evento_titulo}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${s.className}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {r.justificativa ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
