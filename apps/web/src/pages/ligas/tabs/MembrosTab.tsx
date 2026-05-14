import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { SectionHeader } from "@/pages/home/v1/primitives";

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
    return (
      <p className="font-plex-sans text-[13px] text-navy/50 dark:text-white/40">
        Carregando membros...
      </p>
    );
  }

  const contadorAcao = (
    <span className="font-plex-mono text-[11px] tracking-[0.14em] text-navy/60 dark:text-white/40">
      {membros.length}
    </span>
  );

  return (
    <div>
      <SectionHeader numero="02" eyebrow="Composição" titulo="Membros" acao={contadorAcao} />
      {membros.length === 0 ? (
        <p className="font-plex-sans text-[13px] text-navy/50 dark:text-white/40">
          Nenhum membro cadastrado.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-foreground/[0.08]">
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Nome
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Papel
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Ingresso
              </th>
            </tr>
          </thead>
          <tbody>
            {membros.map((m, idx) => {
              const isLast = idx === membros.length - 1;
              return (
                <tr
                  key={m.id}
                  className={`hover:bg-foreground/[0.03] transition-colors ${!isLast ? "border-b border-foreground/[0.06]" : ""}`}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-navy flex-shrink-0 flex items-center justify-center text-white font-plex-mono text-[9px] font-bold">
                        {m.nome.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-plex-sans text-[13px] text-foreground font-semibold">
                        {m.nome}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                    {ROLE_LABEL[m.role] ?? m.role}
                  </td>
                  <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                    {new Date(m.ingressou_em).toLocaleDateString("pt-BR", {
                      month: "short",
                      year: "numeric",
                    })}
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
