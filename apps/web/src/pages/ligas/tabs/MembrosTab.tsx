import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { EditorialTable, SectionHeader } from "@/pages/home/v1/primitives";

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
    return <p className="font-plex-sans text-[13px] text-navy/50">Carregando membros...</p>;
  }

  const contadorAcao = (
    <span className="font-plex-mono text-[11px] tracking-[0.14em] text-navy/60">
      {membros.length}
    </span>
  );

  return (
    <div>
      <SectionHeader numero="01" eyebrow="Composição" titulo="Membros" acao={contadorAcao} />
      {membros.length === 0 ? (
        <p className="font-plex-sans text-[13px] text-navy/50">Nenhum membro cadastrado.</p>
      ) : (
        <EditorialTable
          columns={["Nome", "Papel", "Ingresso"]}
          rows={membros.map((m) => [
            <div key={m.id} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-navy flex-shrink-0 flex items-center justify-center text-white font-plex-mono text-[9px] font-bold">
                {m.nome.charAt(0).toUpperCase()}
              </div>
              <span>{m.nome}</span>
            </div>,
            ROLE_LABEL[m.role] ?? m.role,
            new Date(m.ingressou_em).toLocaleDateString("pt-BR", {
              month: "short",
              year: "numeric",
            }),
          ])}
        />
      )}
    </div>
  );
}
