import type { CampoTipo, FormularioCampo, RespostaStatus } from "@link-leagues/types";

export interface ScoringResult {
  pontuacao_total: number;
  status: RespostaStatus;
  motivo_reprovacao?: string;
}

type CampoComChave = FormularioCampo & { tally_question_id?: string | null };

export function calcularPontuacao(
  campos: FormularioCampo[],
  respostas: Record<string, { value: unknown }>,
  pontuacaoMinima: number,
): ScoringResult {
  // 1. Eliminatórias primeiro
  for (const campo of campos) {
    if (!campo.eliminatoria && !temOpcoesEliminatorias(campo)) continue;
    const key = (campo as CampoComChave).tally_question_id;
    if (!key) continue;
    const resposta = respostas[key];
    if (!resposta) continue;

    const motivo = avaliarEliminatoria(campo, resposta);
    if (motivo) {
      return {
        pontuacao_total: 0,
        status: "reprovado",
        motivo_reprovacao: motivo,
      };
    }
  }

  // 2. Soma ponderada
  let soma = 0;
  for (const campo of campos) {
    if (campo.tipo === "texto" || campo.peso <= 0) continue;
    const key = (campo as CampoComChave).tally_question_id;
    if (!key) continue;
    const resposta = respostas[key];
    if (!resposta) continue;

    const fator = fatorPontuacao(campo.tipo, resposta.value);
    soma += fator * campo.peso;
  }

  const pontuacao_total = Math.round(soma);
  const status: RespostaStatus = pontuacao_total >= pontuacaoMinima ? "aprovado" : "pendente";
  return { pontuacao_total, status };
}

function temOpcoesEliminatorias(campo: FormularioCampo): boolean {
  return (campo.opcoes_eliminatorias?.length ?? 0) > 0;
}

function avaliarEliminatoria(campo: FormularioCampo, resposta: { value: unknown }): string | null {
  const v = resposta.value;
  if (campo.tipo === "sim_nao" && campo.eliminatoria) {
    if (asString(v) === "Não") return `Resposta "Não" em pergunta eliminatória: ${campo.titulo}`;
  }
  if (campo.tipo === "nota_1_10" && campo.eliminatoria) {
    const n = asNumber(v);
    const minima = campo.nota_minima ?? 0;
    if (n !== null && n < minima) {
      return `Nota ${n} abaixo da mínima ${minima} em: ${campo.titulo}`;
    }
  }
  if (campo.tipo === "multipla_escolha" && campo.opcoes_eliminatorias?.length) {
    const escolhidas = asArrayOfStrings(v);
    const blocker = escolhidas.find((opt) => campo.opcoes_eliminatorias!.includes(opt));
    if (blocker) return `Opção eliminatória "${blocker}" em: ${campo.titulo}`;
  }
  return null;
}

function fatorPontuacao(tipo: CampoTipo, value: unknown): number {
  if (tipo === "nota_1_10") {
    const n = asNumber(value);
    if (n === null) return 0;
    return Math.max(0, Math.min(10, n)) / 10;
  }
  if (tipo === "sim_nao") {
    return asString(value) === "Sim" ? 1 : 0;
  }
  if (tipo === "multipla_escolha") {
    const escolhidas = asArrayOfStrings(value);
    return escolhidas.length > 0 ? 1 : 0;
  }
  return 0;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function asArrayOfStrings(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : ""));
  if (typeof v === "string") return [v];
  return [];
}
