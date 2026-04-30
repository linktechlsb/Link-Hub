export interface RankingLiga {
  liga_id: string;
  nome: string;
  imagem_url?: string | null;
  projetos_concluidos: number;
  projetos_em_andamento: number;
  presencas: number;
  receita_total: number;
  posts: number;
  pontuacao: number;
  posicao?: number;
}

export interface ConfiguracaoPontuacao {
  chave: string;
  valor: number;
  descricao?: string;
  atualizado_em: string;
}
