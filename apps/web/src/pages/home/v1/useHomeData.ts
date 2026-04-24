import { useEffect, useState } from "react";

import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";

import type { Liga } from "@link-leagues/types";

interface PendenteItem {
  id: string;
  titulo: string;
  liga?: { nome: string };
}

interface Pendentes {
  projetos: PendenteItem[];
  eventos: PendenteItem[];
}

export interface HomeData {
  ligas: Liga[];
  minhaLiga: Liga | null;
  nomeUsuario: string;
  loadingUser: boolean;
  pendentes: Pendentes;
  role: string | null;
}

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function useHomeData(): HomeData {
  const { role } = useUser();
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [minhaLiga, setMinhaLiga] = useState<Liga | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState<string>("");
  const [loadingUser, setLoadingUser] = useState(true);
  const [pendentes, setPendentes] = useState<Pendentes>({ projetos: [], eventos: [] });

  useEffect(() => {
    async function carregar() {
      try {
        const token = await getToken();
        if (!token) {
          setLoadingUser(false);
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };

        const { data: sessionData } = await supabase.auth.getSession();
        const email = sessionData.session?.user.email ?? "";

        if (email) {
          const { data: usuario } = await supabase
            .from("usuarios")
            .select("nome")
            .eq("email", email)
            .single();
          if (usuario?.nome) setNomeUsuario(usuario.nome as string);
          else setNomeUsuario(email.split("@")[0] ?? "Usuário");
        }

        const [ligasRes, minhaRes] = await Promise.all([
          fetch(`/api/ligas`, { headers }),
          fetch(`/api/ligas/minha`, { headers }),
        ]);
        if (ligasRes.ok) setLigas(await ligasRes.json());
        if (minhaRes.ok) setMinhaLiga(await minhaRes.json());
      } catch {
        // Falha silenciosa — mesmo padrão do HomePage original
      } finally {
        setLoadingUser(false);
      }
    }
    void carregar();
  }, []);

  useEffect(() => {
    if (role !== "staff") return;
    async function carregarPendentes() {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/pendentes`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPendentes(await res.json());
    }
    void carregarPendentes();
  }, [role]);

  return { ligas, minhaLiga, nomeUsuario, loadingUser, pendentes, role };
}
