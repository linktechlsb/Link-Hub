import { describe, it, expect } from "vitest";

import { mapCamposToBlocks, fromWebhookFields, fromSubmissionResponses } from "./tally.js";

import type { CreateCampoInput, TallyField, TallyResponse } from "@link-leagues/types";

function campo(over: Partial<CreateCampoInput>): CreateCampoInput {
  return {
    titulo: "Pergunta",
    tipo: "texto",
    ordem: 0,
    peso: 0,
    eliminatoria: false,
    ...over,
  };
}

describe("mapCamposToBlocks", () => {
  it("inclui FORM_TITLE como primeiro elemento com groupUuid === uuid", () => {
    const { blocks } = mapCamposToBlocks({ nome: "Meu Form" }, []);
    expect(blocks[0]?.type).toBe("FORM_TITLE");
    expect(blocks[0]?.groupType).toBe("FORM_TITLE");
    expect(blocks[0]?.groupUuid).toBe(blocks[0]?.uuid);
    expect((blocks[0]?.payload as { html: string }).html).toBe("Meu Form");
  });

  it("texto vira 1× INPUT_TEXT com groupType QUESTION e groupUuid === uuid", () => {
    const { blocks, ordemParaContainerUuid } = mapCamposToBlocks({ nome: "F" }, [
      campo({ titulo: "Nome completo", tipo: "texto", ordem: 0 }),
    ]);
    const inputs = blocks.filter((b) => b.type === "INPUT_TEXT");
    expect(inputs).toHaveLength(1);
    expect(inputs[0]?.groupType).toBe("QUESTION");
    expect(inputs[0]?.groupUuid).toBe(inputs[0]?.uuid);
    expect(ordemParaContainerUuid.get(0)).toBe(inputs[0]?.uuid);
  });

  it("multipla_escolha emite container + N options ligadas por groupUuid, com isFirst/isLast no payload", () => {
    const { blocks, ordemParaContainerUuid } = mapCamposToBlocks({ nome: "F" }, [
      campo({
        titulo: "Sabor",
        tipo: "multipla_escolha",
        opcoes: ["Chocolate", "Baunilha", "Morango"],
        ordem: 0,
      }),
    ]);
    const container = blocks.find((b) => b.type === "MULTIPLE_CHOICE");
    const options = blocks.filter((b) => b.type === "MULTIPLE_CHOICE_OPTION");
    expect(container).toBeDefined();
    expect(container?.groupType).toBe("QUESTION");
    expect(container?.groupUuid).toBe(container?.uuid);
    expect(options).toHaveLength(3);
    for (const opt of options) {
      expect(opt.groupUuid).toBe(container!.uuid);
    }
    expect((options[0]?.payload as { isFirst: boolean }).isFirst).toBe(true);
    expect((options[0]?.payload as { isLast: boolean }).isLast).toBe(false);
    expect((options[2]?.payload as { isFirst: boolean }).isFirst).toBe(false);
    expect((options[2]?.payload as { isLast: boolean }).isLast).toBe(true);
    expect(ordemParaContainerUuid.get(0)).toBe(container!.uuid);
  });

  it("nota_1_10 vira LINEAR_SCALE com groupType QUESTION e start=1 end=10", () => {
    const { blocks } = mapCamposToBlocks({ nome: "F" }, [campo({ tipo: "nota_1_10", ordem: 0 })]);
    const scale = blocks.find((b) => b.type === "LINEAR_SCALE");
    expect(scale).toBeDefined();
    expect(scale?.groupType).toBe("QUESTION");
    expect(scale!.payload).toMatchObject({ start: 1, end: 10 });
  });

  it("sim_nao vira MULTIPLE_CHOICE com 2 options Sim/Não com isFirst/isLast", () => {
    const { blocks } = mapCamposToBlocks({ nome: "F" }, [campo({ tipo: "sim_nao", ordem: 0 })]);
    const options = blocks.filter((b) => b.type === "MULTIPLE_CHOICE_OPTION");
    expect(options.map((o) => (o.payload as { text: string }).text)).toEqual(["Sim", "Não"]);
    expect((options[0]?.payload as { isFirst: boolean }).isFirst).toBe(true);
    expect((options[1]?.payload as { isLast: boolean }).isLast).toBe(true);
  });

  it("preserva ordem do wizard no mapa retornado", () => {
    const { ordemParaContainerUuid } = mapCamposToBlocks({ nome: "F" }, [
      campo({ titulo: "A", tipo: "texto", ordem: 0 }),
      campo({ titulo: "B", tipo: "multipla_escolha", opcoes: ["X", "Y"], ordem: 1 }),
      campo({ titulo: "C", tipo: "nota_1_10", ordem: 2 }),
    ]);
    expect([...ordemParaContainerUuid.keys()].sort()).toEqual([0, 1, 2]);
    expect(new Set([...ordemParaContainerUuid.values()]).size).toBe(3);
  });
});

describe("fromWebhookFields", () => {
  it("normaliza key → questionId", () => {
    const fields: TallyField[] = [{ key: "k1", label: "Nome", type: "INPUT_TEXT", value: "João" }];
    const result = fromWebhookFields(fields);
    expect(result).toEqual([
      { questionId: "k1", label: "Nome", type: "INPUT_TEXT", value: "João" },
    ]);
  });
});

describe("fromSubmissionResponses", () => {
  it("resolve label e type via questions[] lookup", () => {
    const responses: TallyResponse[] = [
      { id: "r1", questionId: "q1", answer: 8, formattedAnswer: "8" },
    ];
    const questions = [{ id: "q1", title: "Nota", type: "LINEAR_SCALE" as const }];
    const result = fromSubmissionResponses(responses, questions);
    expect(result).toEqual([{ questionId: "q1", label: "Nota", type: "LINEAR_SCALE", value: 8 }]);
  });

  it("cai em INPUT_TEXT vazio se question não encontrada", () => {
    const responses: TallyResponse[] = [
      { id: "r1", questionId: "qX", answer: "x", formattedAnswer: "x" },
    ];
    const result = fromSubmissionResponses(responses, []);
    expect(result[0]?.type).toBe("INPUT_TEXT");
    expect(result[0]?.label).toBe("");
  });
});
