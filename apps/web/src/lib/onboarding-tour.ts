export interface PassoTour {
  /** Seletor CSS do elemento a destacar. Ausente = balão centralizado. */
  seletor?: string;
  titulo: string;
  descricao: string;
}

/**
 * Fonte única do conteúdo do tour. A sequência final é filtrada por
 * presença no DOM — itens que o papel do usuário não vê saem sozinhos.
 */
export const PASSOS_TOUR: PassoTour[] = [
  {
    titulo: "Boas-vindas à Link Leagues Platform",
    descricao:
      "Conheça em poucos passos o que cada área da plataforma faz. Use as setas do teclado para navegar ou saia quando quiser.",
  },
  {
    seletor: '[data-tour="home"]',
    titulo: "Home",
    descricao: "Veja a visão geral do seu dia: pendências, próximos eventos e atalhos rápidos.",
  },
  {
    seletor: '[data-tour="ligas"]',
    titulo: "Ligas",
    descricao: "Conheça as ligas acadêmicas da Link e acompanhe a sua.",
  },
  {
    seletor: '[data-tour="projetos"]',
    titulo: "Projetos",
    descricao: "Acompanhe os projetos da sua liga: status, entregas e responsáveis.",
  },
  {
    seletor: '[data-tour="tarefas"]',
    titulo: "Tarefas",
    descricao: "Veja as tarefas atribuídas a você e marque o que já concluiu.",
  },
  {
    seletor: '[data-tour="eventos"]',
    titulo: "Eventos",
    descricao: "Consulte o calendário, marque encontros e solicite eventos para a sua liga.",
  },
  {
    seletor: '[data-tour="mural"]',
    titulo: "Mural",
    descricao: "Acompanhe avisos e comunicados da coordenação e das ligas.",
  },
  {
    seletor: '[data-tour="ranking"]',
    titulo: "Ranking",
    descricao: "Acompanhe a pontuação das ligas ao longo do semestre.",
  },
  {
    seletor: '[data-tour="super-admin"]',
    titulo: "Super Admin",
    descricao: "Administre usuários e configurações globais da plataforma.",
  },
  {
    seletor: '[data-tour="gerenciamento"]',
    titulo: "Gerenciamento",
    descricao: "Gerencie ligas, membros e processos sob sua responsabilidade.",
  },
  {
    seletor: '[data-tour="dados"]',
    titulo: "Dados",
    descricao: "Analise o uso da plataforma e os indicadores das ligas.",
  },
];

export function filtrarPassosPresentes(
  passos: PassoTour[],
  raiz: Document | HTMLElement = document,
): PassoTour[] {
  return passos.filter((p) => !p.seletor || raiz.querySelector(p.seletor) !== null);
}
