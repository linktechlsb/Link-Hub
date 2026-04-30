export interface Post {
  id: string;
  liga_id: string;
  liga_nome?: string;
  autor_id: string;
  autor_nome?: string;
  autor_role?: string;
  autor_avatar_url?: string | null;
  conteudo: string;
  imagem_url?: string | null;
  criado_em: string;
  atualizado_em: string;
  curtidas?: number;
  curtido_por_mim?: boolean;
  total_comentarios?: number;
}

export interface PostComentario {
  id: string;
  post_id: string;
  autor_id: string;
  autor_nome?: string;
  conteudo: string;
  criado_em: string;
}

export interface CreatePostInput {
  liga_id: string;
  conteudo: string;
  imagem_url?: string;
}

export interface CreateComentarioInput {
  conteudo: string;
}
