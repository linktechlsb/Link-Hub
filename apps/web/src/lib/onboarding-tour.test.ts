import { describe, expect, it } from "vitest";

import { PASSOS_TOUR, filtrarPassosPresentes, type PassoTour } from "./onboarding-tour";

describe("filtrarPassosPresentes", () => {
  const passos: PassoTour[] = [
    { titulo: "Boas-vindas", descricao: "Passo sem seletor, sempre presente." },
    { seletor: '[data-tour="existe"]', titulo: "Existe", descricao: "Elemento no DOM." },
    { seletor: '[data-tour="nao-existe"]', titulo: "Não existe", descricao: "Fora do DOM." },
  ];

  it("mantém passos sem seletor", () => {
    const raiz = document.createElement("div");
    const resultado = filtrarPassosPresentes(passos, raiz);
    expect(resultado.map((p) => p.titulo)).toContain("Boas-vindas");
  });

  it("mantém passos cujo seletor encontra elemento", () => {
    const raiz = document.createElement("div");
    raiz.innerHTML = '<button data-tour="existe">Existe</button>';
    const resultado = filtrarPassosPresentes(passos, raiz);
    expect(resultado.map((p) => p.titulo)).toEqual(["Boas-vindas", "Existe"]);
  });

  it("remove passos cujo seletor não encontra elemento", () => {
    const raiz = document.createElement("div");
    const resultado = filtrarPassosPresentes(passos, raiz);
    expect(resultado.map((p) => p.titulo)).not.toContain("Não existe");
  });
});

describe("PASSOS_TOUR", () => {
  it("começa com o passo de boas-vindas, sem seletor", () => {
    expect(PASSOS_TOUR[0].seletor).toBeUndefined();
    expect(PASSOS_TOUR[0].titulo).toMatch(/boas-vindas/i);
  });

  it("todos os demais passos usam seletores data-tour", () => {
    for (const passo of PASSOS_TOUR.slice(1)) {
      expect(passo.seletor).toMatch(/^\[data-tour="[a-z-]+"\]$/);
    }
  });
});
