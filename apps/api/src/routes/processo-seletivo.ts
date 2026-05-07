import { Router, type Router as IRouter } from "express";
import multer from "multer";

import { sql } from "../config/db.js";
import { supabaseAdmin } from "../config/supabase.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { usuarioEhDiretorDaLiga } from "../middleware/authorization.js";
import {
  criarFormTypeform,
  criarTemaTypeform,
  buscarRespostasTypeform,
} from "../services/typeform.js";

import type { CreateProcessoInput, ProcessoPergunta, TemaProcesso } from "@link-leagues/types";

export const processoSeletivoRouter: IRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /processo-seletivo/minha-liga — retorna a liga do diretor autenticado
processoSeletivoRouter.get(
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

// POST /processo-seletivo/assets/upload — faz upload de imagem para o Supabase Storage
processoSeletivoRouter.post(
  "/assets/upload",
  authenticate,
  requireRole("staff", "diretor"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "Nenhum arquivo enviado." });
        return;
      }

      const ext = file.originalname.split(".").pop() ?? "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabaseAdmin.storage
        .from("processo-seletivo-assets")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) throw new Error(error.message);

      const { data: publicUrlData } = supabaseAdmin.storage
        .from("processo-seletivo-assets")
        .getPublicUrl(fileName);

      res.json({ url: publicUrlData.publicUrl });
    } catch (err) {
      next(err);
    }
  },
);

// GET /processo-seletivo — lista processos (filtrado por liga para diretores)
processoSeletivoRouter.get(
  "/",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const liga_id = req.query["liga_id"] as string | undefined;

      let processos;

      if (user.role === "staff") {
        if (liga_id) {
          processos = await sql`
            SELECT ps.*, l.nome as liga_nome
            FROM processos_seletivos ps
            JOIN ligas l ON l.id = ps.liga_id
            WHERE ps.liga_id = ${liga_id}
            ORDER BY ps.created_at DESC
          `;
        } else {
          processos = await sql`
            SELECT ps.*, l.nome as liga_nome
            FROM processos_seletivos ps
            JOIN ligas l ON l.id = ps.liga_id
            ORDER BY ps.created_at DESC
          `;
        }
      } else {
        const [usuario] = await sql`
          SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1
        `;
        processos = await sql`
          SELECT ps.*, l.nome as liga_nome
          FROM processos_seletivos ps
          JOIN ligas l ON l.id = ps.liga_id
          WHERE (
            l.lider_id = ${usuario?.id ?? null}
            OR EXISTS (
              SELECT 1 FROM liga_membros lm
              JOIN usuarios u ON u.id = lm.usuario_id
              WHERE lm.liga_id = l.id AND u.email = ${user.email}
              AND (lm.cargo = 'Diretor' OR u.role = 'diretor')
            )
          )
          ORDER BY ps.created_at DESC
        `;
      }

      res.json(processos);
    } catch (err) {
      next(err);
    }
  },
);

// POST /processo-seletivo — cria processo + form no Typeform
processoSeletivoRouter.post(
  "/",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { liga_id, nome, descricao, pontuacao_minima_aprovacao, perguntas, tema } =
        req.body as CreateProcessoInput;

      if (!liga_id || !nome || !perguntas?.length) {
        res.status(400).json({ error: "liga_id, nome e perguntas são obrigatórios." });
        return;
      }

      if (user.role === "diretor" && !(await usuarioEhDiretorDaLiga(user.email, liga_id))) {
        res.status(403).json({ error: "Você só pode criar processos da sua própria liga." });
        return;
      }

      const [criador] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;

      // Criar tema no Typeform se fornecido
      let themeId: string | undefined;
      if (tema) {
        themeId = await criarTemaTypeform(tema as TemaProcesso);
      }

      // Criar form no Typeform
      const { formId, formUrl } = await criarFormTypeform(nome, perguntas, themeId);

      // Inserir processo
      const [processo] = await sql`
        INSERT INTO processos_seletivos
          (liga_id, nome, descricao, pontuacao_minima_aprovacao, typeform_form_id, typeform_form_url, tema, created_by)
        VALUES
          (${liga_id}, ${nome}, ${descricao ?? null}, ${pontuacao_minima_aprovacao ?? 70}, ${formId}, ${formUrl}, ${tema ? JSON.stringify(tema) : null}, ${criador?.id ?? null})
        RETURNING *
      `;

      if (!processo) {
        res.status(500).json({ error: "Erro ao criar processo seletivo." });
        return;
      }

      // Inserir perguntas
      for (const pergunta of perguntas) {
        const fieldRef = `pergunta_${pergunta.ordem}`;
        await sql`
          INSERT INTO processo_perguntas
            (processo_id, typeform_field_id, titulo, tipo, peso, eliminatoria, nota_minima, opcoes_eliminatorias, opcoes, ordem)
          VALUES
            (${processo.id}, ${fieldRef}, ${pergunta.titulo}, ${pergunta.tipo},
             ${pergunta.peso ?? 0}, ${pergunta.eliminatoria ?? false},
             ${pergunta.nota_minima ?? null},
             ${pergunta.opcoes_eliminatorias ? JSON.stringify(pergunta.opcoes_eliminatorias) : null},
             ${pergunta.opcoes ? JSON.stringify(pergunta.opcoes) : null},
             ${pergunta.ordem})
        `;
      }

      const pergundasSalvas = await sql`
        SELECT * FROM processo_perguntas WHERE processo_id = ${processo.id} ORDER BY ordem ASC
      `;

      res.status(201).json({ ...processo, perguntas: pergundasSalvas });
    } catch (err) {
      next(err);
    }
  },
);

// GET /processo-seletivo/:id — detalhes + perguntas
processoSeletivoRouter.get(
  "/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [processo] = await sql`
        SELECT ps.*, l.nome as liga_nome
        FROM processos_seletivos ps
        JOIN ligas l ON l.id = ps.liga_id
        WHERE ps.id = ${id}
        LIMIT 1
      `;

      if (!processo) {
        res.status(404).json({ error: "Processo seletivo não encontrado." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, processo.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }

      const perguntas = await sql`
        SELECT * FROM processo_perguntas WHERE processo_id = ${id} ORDER BY ordem ASC
      `;

      res.json({ ...processo, perguntas });
    } catch (err) {
      next(err);
    }
  },
);

// POST /processo-seletivo/:id/publicar — abre o processo
processoSeletivoRouter.post(
  "/:id/publicar",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [processo] = await sql`
        SELECT * FROM processos_seletivos WHERE id = ${id} LIMIT 1
      `;

      if (!processo) {
        res.status(404).json({ error: "Processo seletivo não encontrado." });
        return;
      }

      if (processo.status !== "rascunho") {
        res.status(400).json({ error: "Apenas processos em rascunho podem ser publicados." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, processo.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }

      const [updated] = await sql`
        UPDATE processos_seletivos
        SET status = 'aberto', updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// POST /processo-seletivo/:id/encerrar — fecha o processo
processoSeletivoRouter.post(
  "/:id/encerrar",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [processo] = await sql`
        SELECT * FROM processos_seletivos WHERE id = ${id} LIMIT 1
      `;

      if (!processo) {
        res.status(404).json({ error: "Processo seletivo não encontrado." });
        return;
      }

      if (processo.status !== "aberto") {
        res.status(400).json({ error: "Apenas processos abertos podem ser encerrados." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, processo.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }

      const [updated] = await sql`
        UPDATE processos_seletivos
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

// POST /processo-seletivo/:id/sincronizar — busca respostas do Typeform e aplica scoring
processoSeletivoRouter.post(
  "/:id/sincronizar",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [processo] = await sql`
        SELECT * FROM processos_seletivos WHERE id = ${id} LIMIT 1
      `;

      if (!processo) {
        res.status(404).json({ error: "Processo seletivo não encontrado." });
        return;
      }

      if (!processo.typeform_form_id) {
        res.status(400).json({ error: "Processo não possui formulário Typeform associado." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, processo.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }

      const perguntas = (await sql`
        SELECT * FROM processo_perguntas WHERE processo_id = ${id} ORDER BY ordem ASC
      `) as ProcessoPergunta[];

      const respostasTypeform = await buscarRespostasTypeform(processo.typeform_form_id as string);

      // IDs já sincronizados
      const jaSincronizados = (await sql`
        SELECT typeform_response_id FROM processo_candidatos WHERE processo_id = ${id}
      `) as unknown as Array<{ typeform_response_id: string }>;
      const idsExistentes = new Set(jaSincronizados.map((r) => r.typeform_response_id));

      let novosCandidatos = 0;

      for (const resposta of respostasTypeform) {
        if (idsExistentes.has(resposta.response_id)) continue;

        // Extrair nome/email das respostas
        const answers = resposta.answers ?? [];
        let nome = "Candidato";
        let email = "";

        for (const answer of answers) {
          if (answer.type === "email" || answer.field?.type === "email") {
            email = answer.email ?? answer.text ?? "";
          }
          if (
            answer.field?.type === "short_text" &&
            answer.type === "text" &&
            nome === "Candidato"
          ) {
            nome = answer.text ?? nome;
          }
        }

        // Calcular scoring
        let pontuacao = 0;
        let reprovado = false;
        let motivo_reprovacao: string | null = null;

        for (const pergunta of perguntas) {
          const fieldRef = pergunta.typeform_field_id;
          const answer = answers.find((a) => a.field?.ref === fieldRef);

          if (!answer) continue;

          if (pergunta.eliminatoria) {
            if (pergunta.tipo === "sim_nao" && answer.boolean === false) {
              reprovado = true;
              motivo_reprovacao = `Critério eliminatório: ${pergunta.titulo}`;
              break;
            }

            if (pergunta.tipo === "multipla_escolha") {
              const respLabel = answer.choice?.label ?? "";
              const eliminatorias = (pergunta.opcoes_eliminatorias as string[]) ?? [];
              if (eliminatorias.includes(respLabel)) {
                reprovado = true;
                motivo_reprovacao = `Critério eliminatório: ${pergunta.titulo}`;
                break;
              }
            }

            if (pergunta.tipo === "nota_1_10") {
              const nota = answer.number ?? 0;
              if (pergunta.nota_minima && nota < pergunta.nota_minima) {
                reprovado = true;
                motivo_reprovacao = `Nota mínima não atingida: ${pergunta.titulo}`;
                break;
              }
            }
          }

          // Calcular pontuação
          if (pergunta.peso > 0) {
            if (pergunta.tipo === "nota_1_10") {
              const nota = answer.number ?? 0;
              pontuacao += (nota / 10) * pergunta.peso;
            } else if (pergunta.tipo === "sim_nao") {
              pontuacao += answer.boolean ? pergunta.peso : 0;
            } else if (pergunta.tipo === "multipla_escolha") {
              const respLabel = answer.choice?.label ?? "";
              const eliminatorias = (pergunta.opcoes_eliminatorias as string[]) ?? [];
              if (!eliminatorias.includes(respLabel)) {
                pontuacao += pergunta.peso;
              }
            }
          }
        }

        const status = reprovado
          ? "reprovado"
          : Math.round(pontuacao) >= (processo.pontuacao_minima_aprovacao as number)
            ? "aprovado"
            : "pendente";

        await sql`
          INSERT INTO processo_candidatos
            (processo_id, typeform_response_id, nome, email, pontuacao_total, status, respostas, motivo_reprovacao, submitted_at)
          VALUES
            (${id}, ${resposta.response_id}, ${nome}, ${email},
             ${Math.round(pontuacao)}, ${status},
             ${JSON.stringify(resposta.answers ?? [])},
             ${motivo_reprovacao},
             ${resposta.submitted_at})
          ON CONFLICT (processo_id, typeform_response_id) DO NOTHING
        `;

        novosCandidatos++;
      }

      res.json({ sincronizados: novosCandidatos, total_typeform: respostasTypeform.length });
    } catch (err) {
      next(err);
    }
  },
);

// GET /processo-seletivo/:id/resultados — lista candidatos com estatísticas
processoSeletivoRouter.get(
  "/:id/resultados",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [processo] = await sql`
        SELECT * FROM processos_seletivos WHERE id = ${id} LIMIT 1
      `;

      if (!processo) {
        res.status(404).json({ error: "Processo seletivo não encontrado." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, processo.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }

      const statusFiltro = req.query["status"] as string | undefined;

      const candidatos = statusFiltro
        ? await sql`
            SELECT * FROM processo_candidatos
            WHERE processo_id = ${id} AND status = ${statusFiltro}
            ORDER BY pontuacao_total DESC, submitted_at ASC
          `
        : await sql`
            SELECT * FROM processo_candidatos
            WHERE processo_id = ${id}
            ORDER BY pontuacao_total DESC, submitted_at ASC
          `;

      const [stats] = await sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'aprovado') as aprovados,
          COUNT(*) FILTER (WHERE status = 'reprovado') as reprovados,
          COUNT(*) FILTER (WHERE status = 'pendente') as pendentes
        FROM processo_candidatos
        WHERE processo_id = ${id}
      `;

      res.json({
        total: Number(stats?.total ?? 0),
        aprovados: Number(stats?.aprovados ?? 0),
        reprovados: Number(stats?.reprovados ?? 0),
        pendentes: Number(stats?.pendentes ?? 0),
        candidatos,
      });
    } catch (err) {
      next(err);
    }
  },
);
