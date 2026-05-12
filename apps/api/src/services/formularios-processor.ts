import { calcularPontuacao } from "@link-leagues/utils";

import { sql } from "../config/db.js";

import type {
  FormularioCampo,
  RespostaNormalizada,
  RespostaStatus,
  TallyAnswer,
  TallyFieldType,
} from "@link-leagues/types";

interface FormularioRow {
  id: string;
  scoring_enabled: boolean;
  pontuacao_minima_aprovacao: number | null;
}

/**
 * Processa uma submission (vinda do webhook ou do /sincronizar).
 * Idempotente por (formulario_id, tally_submission_id).
 *
 * @returns `true` se inseriu nova resposta, `false` se ignorou (duplicada ou form desconhecido).
 */
export async function processarSubmission(
  tallyFormId: string,
  tallySubmissionId: string,
  respostas: RespostaNormalizada[],
  submittedAt: string = new Date().toISOString(),
): Promise<boolean> {
  // 1. Resolve formulário
  const [formulario] = await sql<FormularioRow[]>`
    SELECT id, scoring_enabled, pontuacao_minima_aprovacao
    FROM formularios
    WHERE tally_form_id = ${tallyFormId}
    LIMIT 1
  `;
  if (!formulario) {
    console.warn(`[tally] formulario desconhecido tally_form_id=${tallyFormId}`);
    return false;
  }

  // 2. Idempotência
  const [existente] = await sql`
    SELECT 1 FROM formulario_respostas
    WHERE tally_submission_id = ${tallySubmissionId}
    LIMIT 1
  `;
  if (existente) return false;

  // 3. Monta mapa { tally_question_id → TallyAnswer }
  const respostasMap: Record<string, TallyAnswer> = {};
  for (const r of respostas) {
    respostasMap[r.questionId] = { type: r.type, value: r.value, label: r.label };
  }

  // 4. Extrai nome/email procurando por label case-insensitive
  const nome = encontrarPorLabel(respostas, /^nome/i) ?? "";
  const email = encontrarPorLabel(respostas, /^e-?mail/i) ?? "";

  // 5. Scoring (se habilitado)
  let pontuacao_total: number | null = null;
  let status: RespostaStatus = "pendente";
  let motivo_reprovacao: string | null = null;

  if (formulario.scoring_enabled && formulario.pontuacao_minima_aprovacao !== null) {
    const campos = await sql<FormularioCampo[]>`
      SELECT * FROM formulario_campos
      WHERE formulario_id = ${formulario.id}
      ORDER BY ordem ASC
    `;
    const result = calcularPontuacao(campos, respostasMap, formulario.pontuacao_minima_aprovacao);
    pontuacao_total = result.pontuacao_total;
    status = result.status;
    motivo_reprovacao = result.motivo_reprovacao ?? null;
  }

  // 6. Insert
  await sql`
    INSERT INTO formulario_respostas
      (formulario_id, tally_submission_id, nome, email, respostas,
       pontuacao_total, status, motivo_reprovacao, submitted_at, sincronizado_at)
    VALUES
      (${formulario.id}, ${tallySubmissionId}, ${nome}, ${email},
       ${JSON.stringify(respostasMap)},
       ${pontuacao_total}, ${status}, ${motivo_reprovacao},
       ${submittedAt}, NOW())
    ON CONFLICT (tally_submission_id) DO NOTHING
  `;
  return true;
}

function encontrarPorLabel(respostas: RespostaNormalizada[], pattern: RegExp): string | null {
  const r = respostas.find((x) => pattern.test(x.label));
  if (!r) return null;
  if (typeof r.value === "string") return r.value;
  if (typeof r.value === "number") return String(r.value);
  return null;
}

// Re-exporta tipo para conveniência de import
export type { RespostaNormalizada, TallyFieldType };
