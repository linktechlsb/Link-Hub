import { describe, it, expect } from "vitest";

import { calcularPontuacao } from "./scoring.js";

import type { FormularioCampo, TallyAnswer } from "@link-leagues/types";

function campo(over: Partial<FormularioCampo>): FormularioCampo {
  return {
    id: "id",
    formulario_id: "form",
    tally_question_id: over.tally_question_id ?? "q",
    titulo: "?",
    tipo: "texto",
    ordem: 0,
    peso: 0,
    eliminatoria: false,
    ...over,
  };
}

function ans(value: unknown, type: TallyAnswer["type"] = "INPUT_TEXT"): TallyAnswer {
  return { type, value, label: "" };
}

describe("calcularPontuacao", () => {
  it("retorna pontuacao_total=0 e status=pendente quando não há campos pontuáveis", () => {
    const campos = [campo({ tipo: "texto" })];
    const result = calcularPontuacao(campos, { q: ans("qualquer") }, 60);
    expect(result.pontuacao_total).toBe(0);
    expect(result.status).toBe("pendente");
  });

  it("aprova quando soma ponderada >= pontuacao minima", () => {
    const campos = [campo({ tally_question_id: "a", tipo: "nota_1_10", peso: 100 })];
    const respostas = { a: ans(8, "LINEAR_SCALE") }; // (8/10)*100 = 80
    const result = calcularPontuacao(campos, respostas, 60);
    expect(result.pontuacao_total).toBe(80);
    expect(result.status).toBe("aprovado");
  });

  it("retorna pendente quando soma < pontuacao minima", () => {
    const campos = [campo({ tally_question_id: "a", tipo: "nota_1_10", peso: 100 })];
    const respostas = { a: ans(4, "LINEAR_SCALE") }; // 40
    const result = calcularPontuacao(campos, respostas, 60);
    expect(result.pontuacao_total).toBe(40);
    expect(result.status).toBe("pendente");
  });

  it("eliminatória sim_nao reprova se resposta é 'Não'", () => {
    const campos = [
      campo({ tally_question_id: "a", tipo: "sim_nao", eliminatoria: true, peso: 0 }),
    ];
    const respostas = { a: ans("Não", "MULTIPLE_CHOICE") };
    const result = calcularPontuacao(campos, respostas, 60);
    expect(result.status).toBe("reprovado");
    expect(result.motivo_reprovacao).toContain("?");
  });

  it("eliminatória nota_1_10 reprova se valor < nota_minima", () => {
    const campos = [
      campo({
        tally_question_id: "a",
        tipo: "nota_1_10",
        eliminatoria: true,
        nota_minima: 7,
        peso: 50,
      }),
    ];
    const respostas = { a: ans(5, "LINEAR_SCALE") };
    const result = calcularPontuacao(campos, respostas, 0);
    expect(result.status).toBe("reprovado");
  });

  it("eliminatória multipla_escolha reprova se resposta está em opcoes_eliminatorias", () => {
    const campos = [
      campo({
        tally_question_id: "a",
        tipo: "multipla_escolha",
        eliminatoria: false,
        opcoes_eliminatorias: ["Não tenho disponibilidade"],
        peso: 0,
      }),
    ];
    const respostas = { a: ans("Não tenho disponibilidade", "MULTIPLE_CHOICE") };
    const result = calcularPontuacao(campos, respostas, 0);
    expect(result.status).toBe("reprovado");
  });

  it("soma ponderada combina nota_1_10 + sim_nao + multipla_escolha", () => {
    const campos = [
      campo({ tally_question_id: "a", tipo: "nota_1_10", peso: 50 }), // 10/10 * 50 = 50
      campo({ tally_question_id: "b", tipo: "sim_nao", peso: 30 }), // 1 * 30 = 30
      campo({
        tally_question_id: "c",
        tipo: "multipla_escolha",
        opcoes_eliminatorias: ["X"],
        peso: 20,
      }), // selecionou não-eliminatória → 1 * 20 = 20
    ];
    const respostas = {
      a: ans(10, "LINEAR_SCALE"),
      b: ans("Sim", "MULTIPLE_CHOICE"),
      c: ans("Y", "MULTIPLE_CHOICE"),
    };
    const result = calcularPontuacao(campos, respostas, 60);
    expect(result.pontuacao_total).toBe(100);
    expect(result.status).toBe("aprovado");
  });

  it("ignora campos do tipo texto na soma", () => {
    const campos = [
      campo({ tally_question_id: "t", tipo: "texto", peso: 50 }), // ignorado
      campo({ tally_question_id: "n", tipo: "nota_1_10", peso: 100 }), // pesa 100
    ];
    const respostas = {
      t: ans("blabla"),
      n: ans(6, "LINEAR_SCALE"),
    };
    const result = calcularPontuacao(campos, respostas, 50);
    expect(result.pontuacao_total).toBe(60);
    expect(result.status).toBe("aprovado");
  });

  it("respostas faltando contam como 0", () => {
    const campos = [campo({ tally_question_id: "a", tipo: "nota_1_10", peso: 100 })];
    const result = calcularPontuacao(campos, {}, 60);
    expect(result.pontuacao_total).toBe(0);
    expect(result.status).toBe("pendente");
  });
});
