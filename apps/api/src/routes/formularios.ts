import { Router, type Router as IRouter } from "express";
import multer from "multer";

import { sql } from "../config/db.js";
import { supabaseAdmin } from "../config/supabase.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { usuarioEhDiretorDaLiga } from "../middleware/authorization.js";

import type { CreateFormularioInput } from "@link-leagues/types";

export const formulariosRouter: IRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /formularios/minha-liga — retorna a liga do diretor autenticado
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

// POST /formularios/assets/upload — faz upload de imagem para o Supabase Storage
formulariosRouter.post(
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

// GET /formularios — lista formulários (filtrado por liga para diretores)
formulariosRouter.get(
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

// POST /formularios — cria formulário + form no Google Forms
formulariosRouter.post(
  "/",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { liga_id, nome, descricao, perguntas, tema } = req.body as CreateFormularioInput;

      if (!liga_id || !nome || !perguntas?.length) {
        res.status(400).json({ error: "liga_id, nome e perguntas são obrigatórios." });
        return;
      }

      if (user.role === "diretor" && !(await usuarioEhDiretorDaLiga(user.email, liga_id))) {
        res.status(403).json({ error: "Você só pode criar formulários da sua própria liga." });
        return;
      }

      const [criador] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;

      const [processo] = await sql`
        INSERT INTO processos_seletivos
          (liga_id, nome, descricao, google_form_id, google_form_url, tema, created_by)
        VALUES
          (${liga_id}, ${nome}, ${descricao ?? null}, ${null}, ${null}, ${tema ? JSON.stringify(tema) : null}, ${criador?.id ?? null})
        RETURNING *
      `;

      if (!processo) {
        res.status(500).json({ error: "Erro ao criar formulário." });
        return;
      }

      for (const pergunta of perguntas) {
        await sql`
          INSERT INTO processo_perguntas
            (processo_id, google_item_id, titulo, tipo, peso, eliminatoria, nota_minima, opcoes_eliminatorias, opcoes, ordem)
          VALUES
            (${processo.id}, ${null}, ${pergunta.titulo}, ${pergunta.tipo},
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

// GET /formularios/:id — detalhes + perguntas
formulariosRouter.get(
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
        res.status(404).json({ error: "Formulário não encontrado." });
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

// POST /formularios/:id/publicar — abre o formulário
formulariosRouter.post(
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
        res.status(404).json({ error: "Formulário não encontrado." });
        return;
      }

      if (processo.status !== "rascunho") {
        res.status(400).json({ error: "Apenas formulários em rascunho podem ser publicados." });
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

// POST /formularios/:id/encerrar — fecha o formulário
formulariosRouter.post(
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
        res.status(404).json({ error: "Formulário não encontrado." });
        return;
      }

      if (processo.status !== "aberto") {
        res.status(400).json({ error: "Apenas formulários abertos podem ser encerrados." });
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

// POST /formularios/:id/sincronizar — busca respostas do Google Forms e aplica scoring
formulariosRouter.post(
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
        res.status(404).json({ error: "Formulário não encontrado." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, processo.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }

      res.status(501).json({ error: "Sincronização com Google Forms não está disponível." });
    } catch (err) {
      next(err);
    }
  },
);

// GET /formularios/:id/resultados — lista candidatos com estatísticas
formulariosRouter.get(
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
        res.status(404).json({ error: "Formulário não encontrado." });
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
