import { Router, type Router as IRouter } from "express";

import { sql } from "../config/db.js";
import { env } from "../config/env.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { usuarioEhDiretorDaLiga } from "../middleware/authorization.js";
import { processarSubmission } from "../services/formularios-processor.js";
import {
  fromSubmissionResponses,
  mapCamposToBlocks,
  TallyApiError,
  tally,
} from "../services/tally.js";

import type { CreateFormularioInput, FormularioTipo } from "@link-leagues/types";

export const formulariosRouter: IRouter = Router();

const TIPOS_VALIDOS: FormularioTipo[] = [
  "generico",
  "processo_seletivo",
  "pesquisa",
  "inscricao",
  "feedback",
];

// ============================================================================
// GET /formularios/minha-liga
// ============================================================================
formulariosRouter.get(
  "/minha-liga",
  authenticate,
  requireRole("diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const [liga] = await sql`
        SELECT l.id, l.nome
        FROM ligas l
        WHERE l.ativo = true
          AND (
            l.lider_id = (SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1)
            OR EXISTS (
              SELECT 1 FROM liga_membros lm
              JOIN usuarios u ON u.id = lm.usuario_id
              WHERE lm.liga_id = l.id
                AND u.email = ${user.email}
                AND (lm.cargo = 'Diretor' OR u.role = 'diretor')
            )
          )
        LIMIT 1
      `;
      if (!liga) {
        res.status(404).json({ error: "Nenhuma liga encontrada para este diretor." });
        return;
      }
      res.json(liga);
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================================
// GET /formularios — listagem
// ============================================================================
formulariosRouter.get(
  "/",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const tipo = req.query["tipo"] as string | undefined;
      const liga_id = req.query["liga_id"] as string | undefined;

      const tipoFilter = tipo && TIPOS_VALIDOS.includes(tipo as FormularioTipo) ? tipo : null;

      let rows;
      if (user.role === "staff") {
        rows = await sql`
          SELECT f.*, l.nome as liga_nome
          FROM formularios f
          LEFT JOIN ligas l ON l.id = f.liga_id
          WHERE (${tipoFilter}::text IS NULL OR f.tipo = ${tipoFilter})
            AND (${liga_id ?? null}::uuid IS NULL OR f.liga_id = ${liga_id ?? null})
          ORDER BY f.created_at DESC
        `;
      } else {
        const [usuario] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;
        rows = await sql`
          SELECT f.*, l.nome as liga_nome
          FROM formularios f
          LEFT JOIN ligas l ON l.id = f.liga_id
          WHERE (${tipoFilter}::text IS NULL OR f.tipo = ${tipoFilter})
            AND (
              f.created_by = ${usuario?.id ?? null}
              OR (f.liga_id IS NOT NULL AND (
                l.lider_id = ${usuario?.id ?? null}
                OR EXISTS (
                  SELECT 1 FROM liga_membros lm
                  JOIN usuarios u ON u.id = lm.usuario_id
                  WHERE lm.liga_id = l.id AND u.email = ${user.email}
                  AND (lm.cargo = 'Diretor' OR u.role = 'diretor')
                )
              ))
            )
          ORDER BY f.created_at DESC
        `;
      }
      res.json(rows);
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================================
// POST /formularios — cria local + Tally
// ============================================================================
formulariosRouter.post(
  "/",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const body = req.body as CreateFormularioInput;
      const {
        liga_id,
        tipo,
        nome,
        descricao,
        scoring_enabled,
        pontuacao_minima_aprovacao,
        campos,
      } = body;

      // Validações
      if (!nome || !tipo || !campos?.length) {
        res.status(400).json({ error: "tipo, nome e campos são obrigatórios." });
        return;
      }
      if (!TIPOS_VALIDOS.includes(tipo)) {
        res.status(400).json({ error: `tipo inválido. Use um de: ${TIPOS_VALIDOS.join(", ")}` });
        return;
      }
      if (
        scoring_enabled &&
        (pontuacao_minima_aprovacao === undefined || pontuacao_minima_aprovacao === null)
      ) {
        res.status(400).json({
          error: "pontuacao_minima_aprovacao é obrigatório quando scoring_enabled=true.",
        });
        return;
      }
      if (user.role === "diretor") {
        if (!liga_id) {
          res.status(400).json({ error: "Diretor deve associar a uma liga." });
          return;
        }
        if (!(await usuarioEhDiretorDaLiga(user.email, liga_id))) {
          res.status(403).json({ error: "Você só pode criar formulários da sua própria liga." });
          return;
        }
      }
      if (user.role === "staff" && tipo === "processo_seletivo" && !liga_id) {
        res.status(400).json({ error: "Processo seletivo requer uma liga." });
        return;
      }

      const [criador] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;

      // 1. INSERT formulario (status=rascunho, tally_form_id ainda NULL)
      const [formulario] = await sql`
        INSERT INTO formularios
          (liga_id, tipo, nome, descricao, status, scoring_enabled, pontuacao_minima_aprovacao, created_by)
        VALUES
          (${liga_id ?? null}, ${tipo}, ${nome}, ${descricao ?? null},
           'rascunho', ${scoring_enabled}, ${pontuacao_minima_aprovacao ?? null},
           ${criador?.id ?? null})
        RETURNING *
      `;
      if (!formulario) {
        res.status(500).json({ error: "Erro ao criar formulário." });
        return;
      }

      // 2. INSERT campos (sem tally_question_id ainda)
      for (const c of campos) {
        await sql`
          INSERT INTO formulario_campos
            (formulario_id, titulo, tipo, ordem, peso, eliminatoria, nota_minima, opcoes, opcoes_eliminatorias)
          VALUES
            (${formulario.id}, ${c.titulo}, ${c.tipo}, ${c.ordem},
             ${c.peso}, ${c.eliminatoria}, ${c.nota_minima ?? null},
             ${c.opcoes ? JSON.stringify(c.opcoes) : null},
             ${c.opcoes_eliminatorias ? JSON.stringify(c.opcoes_eliminatorias) : null})
        `;
      }

      // 3. Chama Tally para criar o form
      const { blocks, ordemParaContainerUuid } = mapCamposToBlocks({ nome, descricao }, campos);

      let tallyForm;
      try {
        tallyForm = await tally.forms.create({
          name: nome,
          status: "DRAFT",
          workspaceId: env.TALLY_WORKSPACE_ID,
          blocks,
        });
      } catch (err) {
        // Cleanup local — não persistimos form sem Tally backing
        await sql`DELETE FROM formularios WHERE id = ${formulario.id}`;
        if (err instanceof TallyApiError) {
          res.status(502).json({ error: `Falha ao criar form no Tally: ${err.message}` });
          return;
        }
        throw err;
      }

      const tallyFormUrl = `https://tally.so/r/${tallyForm.id}`;

      // 4. UPDATE formulario com tally_form_id/url
      await sql`
        UPDATE formularios
        SET tally_form_id = ${tallyForm.id},
            tally_form_url = ${tallyFormUrl},
            updated_at = NOW()
        WHERE id = ${formulario.id}
      `;

      // 5. Backfill tally_question_id em cada campo
      for (const [ordem, uuid] of ordemParaContainerUuid) {
        await sql`
          UPDATE formulario_campos
          SET tally_question_id = ${uuid}
          WHERE formulario_id = ${formulario.id} AND ordem = ${ordem}
        `;
      }

      // 6. Retorna formulário completo
      const [final] = await sql`
        SELECT f.*, l.nome as liga_nome
        FROM formularios f
        LEFT JOIN ligas l ON l.id = f.liga_id
        WHERE f.id = ${formulario.id}
      `;
      const camposFinais = await sql`
        SELECT * FROM formulario_campos
        WHERE formulario_id = ${formulario.id}
        ORDER BY ordem ASC
      `;
      res.status(201).json({ ...final, campos: camposFinais });
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================================
// GET /formularios/:id
// ============================================================================
formulariosRouter.get(
  "/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [formulario] = await sql`
        SELECT f.*, l.nome as liga_nome
        FROM formularios f
        LEFT JOIN ligas l ON l.id = f.liga_id
        WHERE f.id = ${id}
        LIMIT 1
      `;
      if (!formulario) {
        res.status(404).json({ error: "Formulário não encontrado." });
        return;
      }
      if (
        user.role === "diretor" &&
        formulario.liga_id &&
        !(await usuarioEhDiretorDaLiga(user.email, formulario.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }
      const campos = await sql`
        SELECT * FROM formulario_campos
        WHERE formulario_id = ${id}
        ORDER BY ordem ASC
      `;
      res.json({ ...formulario, campos });
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================================
// POST /formularios/:id/publicar
// ============================================================================
formulariosRouter.post(
  "/:id/publicar",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [formulario] = await sql`SELECT * FROM formularios WHERE id = ${id} LIMIT 1`;
      if (!formulario) {
        res.status(404).json({ error: "Formulário não encontrado." });
        return;
      }
      if (formulario.status !== "rascunho") {
        res.status(400).json({ error: "Apenas formulários em rascunho podem ser publicados." });
        return;
      }
      if (
        user.role === "diretor" &&
        formulario.liga_id &&
        !(await usuarioEhDiretorDaLiga(user.email, formulario.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }
      if (!formulario.tally_form_id) {
        res.status(500).json({ error: "Formulário sem tally_form_id." });
        return;
      }

      // 1. Publica no Tally
      await tally.forms.publish(formulario.tally_form_id as string);

      // 2. Cria webhook
      let webhook;
      try {
        webhook = await tally.webhooks.create(
          formulario.tally_form_id as string,
          `${env.PUBLIC_API_BASE_URL}/api/formularios/webhook/tally`,
          env.TALLY_WEBHOOK_SIGNING_SECRET,
        );
      } catch (err) {
        // Rollback: volta para DRAFT
        await tally.forms.unpublish(formulario.tally_form_id as string);
        if (err instanceof TallyApiError) {
          res.status(502).json({ error: `Falha ao criar webhook: ${err.message}` });
          return;
        }
        throw err;
      }

      const [updated] = await sql`
        UPDATE formularios
        SET status = 'aberto', tally_webhook_id = ${webhook.id}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================================
// POST /formularios/:id/encerrar
// ============================================================================
formulariosRouter.post(
  "/:id/encerrar",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [formulario] = await sql`SELECT * FROM formularios WHERE id = ${id} LIMIT 1`;
      if (!formulario) {
        res.status(404).json({ error: "Formulário não encontrado." });
        return;
      }
      if (formulario.status !== "aberto") {
        res.status(400).json({ error: "Apenas formulários abertos podem ser encerrados." });
        return;
      }
      if (
        user.role === "diretor" &&
        formulario.liga_id &&
        !(await usuarioEhDiretorDaLiga(user.email, formulario.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }

      if (formulario.tally_webhook_id) {
        try {
          await tally.webhooks.delete(formulario.tally_webhook_id as string);
        } catch (err) {
          console.warn(`[tally] falha ao deletar webhook: ${(err as Error).message}`);
        }
      }
      if (formulario.tally_form_id) {
        try {
          await tally.forms.close(formulario.tally_form_id as string, "Formulário encerrado.");
        } catch (err) {
          console.warn(`[tally] falha ao fechar form: ${(err as Error).message}`);
        }
      }

      const [updated] = await sql`
        UPDATE formularios
        SET status = 'encerrado', updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================================
// POST /formularios/:id/sincronizar
// ============================================================================
formulariosRouter.post(
  "/:id/sincronizar",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [formulario] = await sql`SELECT * FROM formularios WHERE id = ${id} LIMIT 1`;
      if (!formulario) {
        res.status(404).json({ error: "Formulário não encontrado." });
        return;
      }
      if (
        user.role === "diretor" &&
        formulario.liga_id &&
        !(await usuarioEhDiretorDaLiga(user.email, formulario.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }
      if (!formulario.tally_form_id) {
        res.status(400).json({ error: "Formulário sem tally_form_id." });
        return;
      }

      let sincronizados = 0;
      let after: string | undefined;
      do {
        const page = await tally.submissions.list(formulario.tally_form_id as string, {
          limit: 100,
          after,
        });
        for (const submission of page.items) {
          const respostas = fromSubmissionResponses(submission.responses, page.questions);
          const inseriu = await processarSubmission(
            formulario.tally_form_id as string,
            submission.id,
            respostas,
            submission.submittedAt,
          );
          if (inseriu) sincronizados++;
        }
        after = page.hasMore ? page.nextCursor : undefined;
      } while (after);

      res.json({ sincronizados });
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================================
// GET /formularios/:id/resultados
// ============================================================================
formulariosRouter.get(
  "/:id/resultados",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [formulario] = await sql`SELECT * FROM formularios WHERE id = ${id} LIMIT 1`;
      if (!formulario) {
        res.status(404).json({ error: "Formulário não encontrado." });
        return;
      }
      if (
        user.role === "diretor" &&
        formulario.liga_id &&
        !(await usuarioEhDiretorDaLiga(user.email, formulario.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }

      const statusFiltro = req.query["status"] as string | undefined;
      const respostas = statusFiltro
        ? await sql`
            SELECT * FROM formulario_respostas
            WHERE formulario_id = ${id} AND status = ${statusFiltro}
            ORDER BY pontuacao_total DESC NULLS LAST, submitted_at ASC
          `
        : await sql`
            SELECT * FROM formulario_respostas
            WHERE formulario_id = ${id}
            ORDER BY pontuacao_total DESC NULLS LAST, submitted_at ASC
          `;

      const [stats] = await sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'aprovado') as aprovados,
          COUNT(*) FILTER (WHERE status = 'reprovado') as reprovados,
          COUNT(*) FILTER (WHERE status = 'pendente') as pendentes
        FROM formulario_respostas
        WHERE formulario_id = ${id}
      `;

      res.json({
        total: Number(stats?.total ?? 0),
        aprovados: Number(stats?.aprovados ?? 0),
        reprovados: Number(stats?.reprovados ?? 0),
        pendentes: Number(stats?.pendentes ?? 0),
        respostas,
      });
    } catch (err) {
      next(err);
    }
  },
);
