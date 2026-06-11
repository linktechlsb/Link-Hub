import { useEffect, useState } from "react";

import { UserAvatar } from "@/components/ui/user-avatar";
import { supabase } from "@/lib/supabase";

import { TabSection } from "./primitives";

const ROLE_LABEL: Record<string, string> = {
  staff: "Staff",
  diretor: "Diretor",
  membro: "Membro",
  estudante: "Estudante",
  professor: "Professor",
};

interface MembroRow {
  id: string;
  usuario_id: string;
  role: string;
  ingressou_em: string;
  nome: string;
  email: string;
  avatar_url: string | null;
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
    return <p className="text-sm text-foreground/50">Carregando membros...</p>;
  }

  const contador = (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/60">
      {membros.length}
    </span>
  );

  return (
    <TabSection titulo="Membros" acao={contador}>
      {membros.length === 0 ? (
        <p className="text-sm text-foreground/50">Nenhum membro cadastrado.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-foreground/40">
                Nome
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-foreground/40">
                Papel
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-foreground/40">
                Ingresso
              </th>
            </tr>
          </thead>
          <tbody>
            {membros.map((m) => (
              <tr
                key={m.id}
                className="border-b border-border transition-colors last:border-0 hover:bg-foreground/[0.03]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar nome={m.nome} src={m.avatar_url} className="size-7" />
                    <span className="text-sm font-medium text-foreground">{m.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-foreground/60">
                  {ROLE_LABEL[m.role] ?? m.role}
                </td>
                <td className="px-4 py-3 text-sm text-foreground/60">
                  {new Date(m.ingressou_em).toLocaleDateString("pt-BR", {
                    month: "short",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </TabSection>
  );
}
