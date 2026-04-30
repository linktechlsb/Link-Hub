import { Router, type Router as IRouter } from "express";
import multer from "multer";

import { sql } from "../config/db.js";
import { supabaseAdmin } from "../config/supabase.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { usuarioEhDiretorDaLiga } from "../middleware/authorization.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png"].includes(file.mimetype)) {
      cb(new Error("Apenas PNG e JPG são permitidos."));
      return;
    }
    cb(null, true);
  },
});

export const muralRouter: IRouter = Router();

// POST /mural/upload — upload de imagem para post
muralRouter.post(
  "/upload",
  authenticate,
  requireRole("staff", "diretor"),
  upload.single("imagem"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Arquivo de imagem obrigatório." });
        return;
      }

      const ext = req.file.mimetype === "image/png" ? "png" : "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: storageError } = await supabaseAdmin.storage
        .from("posts-imagens")
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (storageError) throw storageError;

      const { data: urlData } = supabaseAdmin.storage.from("posts-imagens").getPublicUrl(filename);
      res.json({ imagem_url: urlData.publicUrl });
    } catch (err) {
      next(err);
    }
  },
);

// GET /mural?liga_id= — lista posts (feed global ou de uma liga)
muralRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const liga_id = req.query["liga_id"] as string | undefined;

    const [usuarioAtual] = await sql`
      SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1
    `;

    const posts = await sql`
      SELECT
        p.id,
        p.liga_id,
        l.nome AS liga_nome,
        p.autor_id,
        u.nome AS autor_nome,
        u.role AS autor_role,
        u.avatar_url AS autor_avatar_url,
        p.conteudo,
        p.imagem_url,
        p.criado_em,
        p.atualizado_em,
        (SELECT COUNT(*)::int FROM post_curtidas c WHERE c.post_id = p.id) AS curtidas,
        EXISTS (
          SELECT 1 FROM post_curtidas c
          WHERE c.post_id = p.id AND c.usuario_id = ${usuarioAtual?.id ?? null}
        ) AS curtido_por_mim,
        (SELECT COUNT(*)::int FROM post_comentarios co WHERE co.post_id = p.id) AS total_comentarios
      FROM posts p
      JOIN ligas l ON l.id = p.liga_id
      JOIN usuarios u ON u.id = p.autor_id
      WHERE TRUE
        ${liga_id ? sql`AND p.liga_id = ${liga_id}` : sql``}
      ORDER BY p.criado_em DESC
      LIMIT 100
    `;

    res.json(posts);
  } catch (err) {
    next(err);
  }
});

// POST /mural — cria post (diretor da própria liga ou staff)
muralRouter.post("/", authenticate, requireRole("staff", "diretor"), async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { liga_id, conteudo, imagem_url } = req.body as {
      liga_id?: string;
      conteudo?: string;
      imagem_url?: string;
    };

    if (!liga_id || !conteudo?.trim()) {
      res.status(400).json({ error: "liga_id e conteudo são obrigatórios." });
      return;
    }

    if (user.role === "diretor" && !(await usuarioEhDiretorDaLiga(user.email, liga_id))) {
      res.status(403).json({ error: "Você só pode publicar no mural da sua própria liga." });
      return;
    }

    const [autor] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;
    if (!autor) {
      res.status(404).json({ error: "Autor não encontrado." });
      return;
    }

    const [post] = await sql`
      INSERT INTO posts (liga_id, autor_id, conteudo, imagem_url)
      VALUES (${liga_id}, ${autor.id}, ${conteudo.trim()}, ${imagem_url ?? null})
      RETURNING id, liga_id, autor_id, conteudo, imagem_url, criado_em, atualizado_em
    `;

    res.status(201).json({
      ...post,
      autor_nome: autor.nome,
      curtidas: 0,
      curtido_por_mim: false,
      total_comentarios: 0,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /mural/:id — autor do post, diretor da liga ou staff
muralRouter.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const id = req.params["id"] as string;

    const [post] = await sql`
      SELECT p.liga_id, u.email AS autor_email
      FROM posts p
      JOIN usuarios u ON u.id = p.autor_id
      WHERE p.id = ${id}
      LIMIT 1
    `;
    if (!post) {
      res.status(404).json({ error: "Post não encontrado." });
      return;
    }

    const ehAutor = post.autor_email === user.email;
    const ehStaff = user.role === "staff";
    const ehDiretorDaLiga =
      user.role === "diretor" && (await usuarioEhDiretorDaLiga(user.email, post.liga_id as string));

    if (!ehAutor && !ehStaff && !ehDiretorDaLiga) {
      res.status(403).json({ error: "Sem permissão para remover este post." });
      return;
    }

    await sql`DELETE FROM posts WHERE id = ${id}`;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /mural/:id/curtir — alterna curtida do usuário autenticado
muralRouter.post("/:id/curtir", authenticate, async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const id = req.params["id"] as string;

    const [autor] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;
    if (!autor) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    const [existente] = await sql`
      SELECT id FROM post_curtidas WHERE post_id = ${id} AND usuario_id = ${autor.id} LIMIT 1
    `;

    if (existente) {
      await sql`DELETE FROM post_curtidas WHERE id = ${existente.id}`;
      res.json({ curtido_por_mim: false });
    } else {
      await sql`
        INSERT INTO post_curtidas (post_id, usuario_id) VALUES (${id}, ${autor.id})
      `;
      res.json({ curtido_por_mim: true });
    }
  } catch (err) {
    next(err);
  }
});

// GET /mural/:id/comentarios — lista comentários
muralRouter.get("/:id/comentarios", authenticate, async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const comentarios = await sql`
      SELECT c.id, c.post_id, c.autor_id, u.nome AS autor_nome, c.conteudo, c.criado_em
      FROM post_comentarios c
      JOIN usuarios u ON u.id = c.autor_id
      WHERE c.post_id = ${id}
      ORDER BY c.criado_em ASC
    `;
    res.json(comentarios);
  } catch (err) {
    next(err);
  }
});

// POST /mural/:id/comentarios — qualquer usuário autenticado
muralRouter.post("/:id/comentarios", authenticate, async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const id = req.params["id"] as string;
    const { conteudo } = req.body as { conteudo?: string };

    if (!conteudo?.trim()) {
      res.status(400).json({ error: "conteudo é obrigatório." });
      return;
    }

    const [autor] = await sql`SELECT id, nome FROM usuarios WHERE email = ${user.email} LIMIT 1`;
    if (!autor) {
      res.status(404).json({ error: "Autor não encontrado." });
      return;
    }

    const [comentario] = await sql`
      INSERT INTO post_comentarios (post_id, autor_id, conteudo)
      VALUES (${id}, ${autor.id}, ${conteudo.trim()})
      RETURNING id, post_id, autor_id, conteudo, criado_em
    `;

    res.status(201).json({ ...comentario, autor_nome: autor.nome });
  } catch (err) {
    next(err);
  }
});
