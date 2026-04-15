export type TipoRecurso = "curso" | "video" | "documento" | "link";

export interface Recurso {
  id: string;
  liga_id: string;
  titulo: string;
  tipo: TipoRecurso;
  url: string;
  icone: string;
  cor: string;
  criado_por?: string;
  criado_em: string;
}
