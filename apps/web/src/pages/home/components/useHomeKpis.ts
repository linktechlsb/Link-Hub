import {
  Award,
  Building2,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  ListChecks,
  Percent,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import type { KpiItem } from "./KpiStrip";
import type { HomeData } from "../v1/useHomeData";
import type { Tarefa } from "@link-leagues/types";

interface UseHomeKpisResult {
  items: KpiItem[];
  loading: boolean;
}

// Usado só enquanto loading=true (o KpiStrip renderiza skeleton, não estes valores).
const PLACEHOLDER_KPIS: KpiItem[] = Array.from({ length: 4 }).map((_, i) => ({
  icon: FolderKanban,
  label: `kpi-${i}`,
  value: "—",
}));

function pct(value: number): string {
  return `${Math.round(value)}%`;
}

/** Dados pessoais do membro/estudante, carregados sob demanda. */
interface DadosPessoais {
  presencaPct: number;
  tarefasAtivas: number;
  eventosFuturos: number;
  carregado: boolean;
}

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Deriva os 4 KPIs do topo da Home conforme o papel do usuário.
 * Staff/Diretor/Professor usam apenas dados já carregados em `data`.
 * Membro/Estudante disparam fetches leves (presença, tarefas, eventos).
 */
export function useHomeKpis(data: HomeData): UseHomeKpisResult {
  const { role, ligas, minhaLiga, ranking, usuarioId, loadingUser } = data;
  const ehPessoal = role === "membro" || role === "estudante";

  const [pessoais, setPessoais] = useState<DadosPessoais>({
    presencaPct: 0,
    tarefasAtivas: 0,
    eventosFuturos: 0,
    carregado: false,
  });

  useEffect(() => {
    if (!ehPessoal || !minhaLiga || !usuarioId) return;
    let cancelado = false;

    async function carregar() {
      const token = await getToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const ligaId = minhaLiga!.id;
      const hoje = new Date().toISOString().slice(0, 10);

      const [eventosRes, presencasRes, tarefasRes] = await Promise.all([
        fetch(`/api/eventos?liga_id=${ligaId}`, { headers }),
        fetch(`/api/presenca?liga_id=${ligaId}&usuario_id=${usuarioId}`, { headers }),
        fetch(`/api/tarefas`, { headers }),
      ]);

      const eventos = eventosRes.ok ? ((await eventosRes.json()) as { data: string }[]) : [];
      const presencas = presencasRes.ok ? ((await presencasRes.json()) as unknown[]) : [];
      const tarefas = tarefasRes.ok ? ((await tarefasRes.json()) as Tarefa[]) : [];

      const totalEventos = eventos.length;
      const eventosFuturos = eventos.filter((e) => e.data?.slice(0, 10) >= hoje).length;
      const presencaPct = totalEventos > 0 ? (presencas.length / totalEventos) * 100 : 0;
      const tarefasAtivas = tarefas.filter(
        (t) => t.responsavel_id === usuarioId && t.status !== "concluida",
      ).length;

      if (!cancelado) {
        setPessoais({ presencaPct, tarefasAtivas, eventosFuturos, carregado: true });
      }
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [ehPessoal, minhaLiga, usuarioId]);

  if (loadingUser || !role) {
    return { items: PLACEHOLDER_KPIS, loading: true };
  }

  // Linha do ranking correspondente à liga do usuário (diretor/membro)
  const minhaRankingRow = minhaLiga ? ranking.find((r) => r.liga_id === minhaLiga.id) : undefined;

  const sum = (nums: (number | undefined)[]) => nums.reduce<number>((acc, n) => acc + (n ?? 0), 0);

  let items: KpiItem[];

  switch (role) {
    case "staff": {
      const ligasAtivas = ligas.filter((l) => l.ativo).length;
      const totalMembros = sum(ligas.map((l) => l.total_membros));
      const projetosAndamento = sum(ligas.map((l) => l.projetos_aprovados));
      const presencaMedia =
        ranking.length > 0 ? sum(ranking.map((r) => r.presenca_percentual)) / ranking.length : 0;
      items = [
        { icon: Trophy, label: "Ligas ativas", value: String(ligasAtivas) },
        { icon: Users, label: "Total de membros", value: String(totalMembros) },
        { icon: FolderKanban, label: "Projetos em andamento", value: String(projetosAndamento) },
        { icon: Percent, label: "Presença média", value: pct(presencaMedia) },
      ];
      break;
    }
    case "diretor": {
      items = [
        { icon: Users, label: "Membros da liga", value: String(minhaLiga?.total_membros ?? 0) },
        {
          icon: FolderKanban,
          label: "Projetos ativos",
          value: String(minhaLiga?.projetos_ativos ?? 0),
        },
        {
          icon: Percent,
          label: "Presença da liga",
          value: pct(minhaRankingRow?.presenca_percentual ?? 0),
        },
        {
          icon: Trophy,
          label: "Posição no ranking",
          value: minhaRankingRow?.posicao ? `#${minhaRankingRow.posicao}` : "—",
        },
      ];
      break;
    }
    case "professor": {
      const minhasLigas = ligas.filter((l) => l.professor_id === usuarioId);
      const idsLigas = new Set(minhasLigas.map((l) => l.id));
      const rowsLigas = ranking.filter((r) => idsLigas.has(r.liga_id));
      const projetosAndamento = sum(minhasLigas.map((l) => l.projetos_aprovados));
      const projetosConcluidos = sum(minhasLigas.map((l) => l.projetos_concluidos));
      const presencaMedia =
        rowsLigas.length > 0
          ? sum(rowsLigas.map((r) => r.presenca_percentual)) / rowsLigas.length
          : 0;
      items = [
        { icon: Building2, label: "Ligas acompanhadas", value: String(minhasLigas.length) },
        { icon: FolderKanban, label: "Projetos em andamento", value: String(projetosAndamento) },
        { icon: CheckCircle2, label: "Projetos concluídos", value: String(projetosConcluidos) },
        { icon: Percent, label: "Presença média", value: pct(presencaMedia) },
      ];
      break;
    }
    default: {
      // membro / estudante
      items = [
        { icon: CalendarCheck, label: "Minha presença", value: pct(pessoais.presencaPct) },
        { icon: ListChecks, label: "Minhas tarefas ativas", value: String(pessoais.tarefasAtivas) },
        { icon: CalendarClock, label: "Eventos futuros", value: String(pessoais.eventosFuturos) },
        {
          icon: Award,
          label: "Posição da minha liga",
          value: minhaRankingRow?.posicao ? `#${minhaRankingRow.posicao}` : "—",
        },
      ];
    }
  }

  const loading = ehPessoal && minhaLiga != null && !pessoais.carregado;
  return { items, loading };
}
