import { Router, type Router as IRouter } from "express";
import multer from "multer";

import { sql } from "../config/db.js";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";

export const usuariosRouter: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png"].includes(file.mimetype)) {
      cb(new Error("Apenas PNG e JPG são permitidos."));
      return;
    }
    cb(null, true);
  },
});

// GET /usuarios/me — retorna dados do usuário autenticado
usuariosRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    const [usuario] = await sql`
      SELECT id, nome, email, role, avatar_url, biografia, instagram, linkedin, semestre FROM usuarios
      WHERE email = ${(req as AuthenticatedRequest).user!.email}
      LIMIT 1
    `;

    if (!usuario) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    res.json(usuario);
  } catch (err) {
    next(err);
  }
});

// PATCH /usuarios/me — atualiza nome e/ou biografia do usuário autenticado
usuariosRouter.patch("/me", authenticate, async (req, res, next) => {
  try {
    const { nome, biografia, instagram, linkedin, semestre } = req.body as {
      nome?: string;
      biografia?: string;
      instagram?: string;
      linkedin?: string;
      semestre?: string;
    };

    const [usuario] = await sql`
      UPDATE usuarios
      SET
        nome      = COALESCE(${nome ?? null}, nome),
        biografia = COALESCE(${biografia ?? null}, biografia),
        instagram = COALESCE(${instagram ?? null}, instagram),
        linkedin  = COALESCE(${linkedin ?? null}, linkedin),
        semestre  = COALESCE(${semestre ?? null}, semestre)
      WHERE email = ${(req as AuthenticatedRequest).user!.email}
      RETURNING id, nome, email, role, avatar_url, biografia, instagram, linkedin, semestre
    `;

    if (!usuario) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    res.json(usuario);
  } catch (err) {
    next(err);
  }
});

// POST /usuarios/me/avatar — upload de foto de perfil do usuário autenticado
usuariosRouter.post("/me/avatar", authenticate, upload.single("imagem"), async (req, res, next) => {
  try {
    const userEmail = (req as AuthenticatedRequest).user!.email;

    if (!req.file) {
      res.status(400).json({ error: "Arquivo de imagem obrigatório." });
      return;
    }

    const [usuarioAtual] = await sql`
        SELECT id FROM usuarios WHERE email = ${userEmail} LIMIT 1
      `;

    if (!usuarioAtual) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    const ext = req.file.mimetype === "image/png" ? "png" : "jpg";
    const filename = `${usuarioAtual.id}-${Date.now()}.${ext}`;

    const { error: storageError } = await supabaseAdmin.storage
      .from("avatares")
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (storageError) throw storageError;

    const { data: urlData } = supabaseAdmin.storage.from("avatares").getPublicUrl(filename);

    const avatar_url = urlData.publicUrl;

    const [usuario] = await sql`
        UPDATE usuarios SET avatar_url = ${avatar_url}
        WHERE id = ${usuarioAtual.id}
        RETURNING id, nome, email, role, avatar_url, biografia, instagram, linkedin, semestre
      `;

    res.json(usuario);
  } catch (err) {
    next(err);
  }
});

// GET /usuarios/visao-geral — usuários (lider/membro) com liga e % de presença (admin)
usuariosRouter.get("/visao-geral", authenticate, requireRole("staff"), async (_req, res, next) => {
  try {
    const usuarios = await sql`
      SELECT
        u.id,
        u.nome,
        u.email,
        u.role,
        l.nome AS liga_nome,
        ROUND(
          COUNT(p.id) FILTER (WHERE p.status = 'presente') * 100.0
          / NULLIF(COUNT(p.id), 0)
        )::int AS presenca_pct
      FROM usuarios u
      LEFT JOIN liga_membros lm ON lm.usuario_id = u.id
      LEFT JOIN ligas l ON l.id = lm.liga_id AND l.ativo = true
      LEFT JOIN presencas p ON p.usuario_id = u.id
      WHERE u.role IN ('diretor', 'membro')
      GROUP BY u.id, u.nome, u.email, u.role, l.nome
      ORDER BY u.nome
    `;
    res.json(usuarios);
  } catch (err) {
    next(err);
  }
});

// GET /usuarios — lista todos os usuários com liga (admin)
usuariosRouter.get("/", authenticate, requireRole("staff"), async (_req, res, next) => {
  try {
    const usuarios = await sql`
      SELECT
        u.id, u.nome, u.email, u.role, u.avatar_url,
        l.nome AS liga_nome,
        l.id AS liga_id
      FROM usuarios u
      LEFT JOIN liga_membros lm ON lm.usuario_id = u.id
      LEFT JOIN ligas l ON l.id = lm.liga_id AND l.ativo = true
      ORDER BY u.nome
    `;
    res.json(usuarios);
  } catch (err) {
    next(err);
  }
});

// POST /usuarios — cria usuário no Supabase Auth + tabela (admin)
usuariosRouter.post("/", authenticate, requireRole("staff"), async (req, res, next) => {
  try {
    const { nome, email, role, liga_id } = req.body as {
      nome: string;
      email: string;
      role: string;
      liga_id?: string;
    };

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${env.APP_URL}/redefinir-senha`,
        data: { nome, role },
      },
    );

    if (authError || !authData.user) {
      let mensagemErro = authError?.message ?? "Erro ao criar usuário no Auth.";
      if (mensagemErro.toLowerCase().includes("already been registered")) {
        mensagemErro = "Já existe um usuário cadastrado com este e-mail.";
      }
      res.status(400).json({ error: mensagemErro });
      return;
    }

    const [usuario] = await sql`
      INSERT INTO usuarios (id, email, nome, role)
      VALUES (${authData.user.id}, ${email}, ${nome}, ${role})
      RETURNING id, email, nome, role
    `;

    if (liga_id) {
      await sql`
        INSERT INTO liga_membros (liga_id, usuario_id)
        VALUES (${liga_id}, ${authData.user.id})
        ON CONFLICT (liga_id, usuario_id) DO NOTHING
      `;
    }

    res.status(201).json(usuario);
  } catch (err) {
    next(err);
  }
});

// GET /usuarios/busca?email= — busca usuários por e-mail (autocomplete de diretores)
// IMPORTANTE: deve estar antes de PATCH /:id e GET /:id para não ser capturado por esses padrões
usuariosRouter.get(
  "/busca",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const email = (req.query["email"] as string) ?? "";

      if (email.length < 2) {
        res.json([]);
        return;
      }

      const usuarios = await sql`
      SELECT id, nome, email FROM usuarios
      WHERE email ILIKE ${"%" + email + "%"}
      LIMIT 10
    `;

      res.json(usuarios);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /usuarios/:id — atualiza nome e/ou role (admin)
usuariosRouter.patch("/:id", authenticate, requireRole("staff"), async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const { nome, role } = req.body as { nome?: string; role?: string };

    const [usuario] = await sql`
      UPDATE usuarios
      SET
        nome = COALESCE(${nome ?? null}, nome),
        role = COALESCE(${role ?? null}, role)
      WHERE id = ${id}
      RETURNING id, email, nome, role
    `;

    if (!usuario) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    res.json(usuario);
  } catch (err) {
    next(err);
  }
});

// DELETE /usuarios/:id — remove do Supabase Auth + tabela (admin)
// Ordem: primeiro remove do Auth (irreversível), depois da tabela local com rollback se falhar
usuariosRouter.delete("/:id", authenticate, requireRole("staff"), async (req, res, next) => {
  try {
    const id = req.params["id"] as string;

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) throw authError;

    try {
      await sql`DELETE FROM usuarios WHERE id = ${id}`;
    } catch (dbErr) {
      // A remoção do Auth já ocorreu; registar o erro mas não recriar o utilizador
      // pois isso exigiria a password original que não temos
      next(dbErr);
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
