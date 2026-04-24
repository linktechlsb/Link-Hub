import { describe, expect, it } from "vitest";

import { splitLigaTitle } from "../splitLigaTitle";

describe("splitLigaTitle", () => {
  it("retorna segmento único quando o nome tem 1 palavra", () => {
    expect(splitLigaTitle("Finanças")).toEqual([{ text: "Finanças", em: false, lowercase: false }]);
  });

  it("aplica itálico na segunda palavra quando o nome tem 2 palavras", () => {
    expect(splitLigaTitle("Liga Finanças")).toEqual([
      { text: "Liga", em: false, lowercase: false },
      { text: "Finanças", em: true, lowercase: false },
    ]);
  });

  it("aplica itálico na segunda e lowercase da terceira em diante", () => {
    expect(splitLigaTitle("Liga de Finanças Corporativas")).toEqual([
      { text: "Liga", em: false, lowercase: false },
      { text: "de", em: true, lowercase: false },
      { text: "Finanças", em: false, lowercase: true },
      { text: "Corporativas", em: false, lowercase: true },
    ]);
  });

  it("normaliza espaços múltiplos", () => {
    expect(splitLigaTitle("  Liga   de   Finanças  ")).toHaveLength(3);
  });

  it("retorna array vazio para string vazia", () => {
    expect(splitLigaTitle("")).toEqual([]);
  });
});
