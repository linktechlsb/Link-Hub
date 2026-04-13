import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface MembroRow {
  id: string;
  usuario_id: string;
  cargo: string | null;
  ingressou_em: string;
  nome: string;
  email: string;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

interface Props {
  ligaId: string;
}

export function MembrosTab({ ligaId }: Props) {
  const [membros, setMembros] = useState<MembroRow[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const res = await fetch(`/api/ligas/${ligaId}/membros`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setMembros(await res.json());
      setCarregando(false);
    }
    carregar();
  }, [ligaId]);

  if (carregando) {
    return <p className="text-sm text-muted-foreground">Carregando membros...</p>;
  }

  return (
    <div>
      <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
        Membros da Liga{" "}
        <span className="bg-brand-gray text-link-blue rounded-full px-2 py-0.5 text-xs font-normal ml-1 normal-case">
          {membros.length}
        </span>
      </p>
      {membros.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
      ) : (
        <div className="bg-white border border-brand-gray rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-gray/50 border-b border-brand-gray">
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-4 py-2">
                  Membro
                </th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-4 py-2">
                  Cargo
                </th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-4 py-2">
                  Ingresso
                </th>
              </tr>
            </thead>
            <tbody>
              {membros.map((m) => (
                <tr key={m.id} className="border-b border-brand-gray last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-navy flex-shrink-0" />
                      <span className="text-sm font-medium text-navy">{m.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {m.cargo ?? "Membro"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(m.ingressou_em).toLocaleDateString("pt-BR", {
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
