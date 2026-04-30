export interface TitleSegment {
  text: string;
  em: boolean;
  lowercase: boolean;
}

export function splitLigaTitle(nome: string): TitleSegment[] {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [];
  return palavras.map((text, i) => ({
    text,
    em: i === 1,
    lowercase: palavras.length >= 3 && i >= 2,
  }));
}
