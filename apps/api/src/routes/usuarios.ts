import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as IRouter,
} from "express";
import multer from "multer";

import { sql } from "../config/db.js";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";

import type { UserRole } from "@link-leagues/types";

const ROLES_VALIDOS: UserRole[] = ["staff", "diretor", "membro", "professor"];
const MAX_TEXTO = 2000;

function textoExcedeLimite(...valores: Array<string | undefined>) {
  return valores.some((v) => typeof v === "string" && v.length > MAX_TEXTO);
}

export const usuariosRouter: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png"].includes(file.mimetype)) {
      cb(new Error("INVALID_FILE_TYPE"));
      return;
    }
    cb(null, true);
  },
});

function uploadSingle(field: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(field)(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        res.status(status).json({ error: err.message });
        return;
      }
      if (err instanceof Error && err.message === "INVALID_FILE_TYPE") {
        res.status(400).json({ error: "Apenas PNG e JPG são permitidos." });
        return;
      }
      if (err) {
        next(err);
        return;
      }
      next();
    });
  };
}

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

    if (textoExcedeLimite(nome, biografia, instagram, linkedin, semestre)) {
      res.status(400).json({ error: `Cada campo deve ter no máximo ${MAX_TEXTO} caracteres.` });
      return;
    }

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
usuariosRouter.post("/me/avatar", authenticate, uploadSingle("imagem"), async (req, res, next) => {
  try {
    const userEmail = (req as AuthenticatedRequest).user!.email;

    if (!req.file) {
      res.status(400).json({ error: "Arquivo de imagem obrigatório." });
      return;
    }

    const [usuarioAtual] = await sql`
        SELECT id, avatar_url FROM usuarios WHERE email = ${userEmail} LIMIT 1
      `;

    if (!usuarioAtual) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    const ext = req.file.mimetype === "image/png" ? "png" : "jpg";
    const filename = `${usuarioAtual.id}-${Date.now()}.${ext}`;

    // Remove avatar anterior para evitar acúmulo no storage
    const avatarAnterior = usuarioAtual["avatar_url"] as string | null | undefined;
    if (avatarAnterior) {
      const match = avatarAnterior.match(/\/avatares\/([^?]+)$/);
      const nomeAntigo = match?.[1];
      if (nomeAntigo) {
        await supabaseAdmin.storage
          .from("avatares")
          .remove([nomeAntigo])
          .catch(() => {});
      }
    }

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

    if (!nome?.trim() || !email?.trim() || !role) {
      res.status(400).json({ error: "nome, email e role são obrigatórios." });
      return;
    }

    if (!ROLES_VALIDOS.includes(role as UserRole)) {
      res.status(400).json({ error: `role inválido. Use um de: ${ROLES_VALIDOS.join(", ")}.` });
      return;
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${env.APP_URL}/criar-senha`,
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

    let usuario;
    try {
      const [novo] = await sql`
        INSERT INTO usuarios (id, email, nome, role)
        VALUES (${authData.user.id}, ${email}, ${nome}, ${role})
        RETURNING id, email, nome, role
      `;
      usuario = novo;

      if (liga_id) {
        await sql`
          INSERT INTO liga_membros (liga_id, usuario_id)
          VALUES (${liga_id}, ${authData.user.id})
          ON CONFLICT (liga_id, usuario_id) DO NOTHING
        `;
      }
    } catch (dbErr) {
      // Rollback do Auth para evitar usuário órfão
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {});
      throw dbErr;
    }

    res.status(201).json(usuario);
  } catch (err) {
    next(err);
  }
});

// GET /usuarios/professores — lista todos os professores (para atribuir a uma liga)
usuariosRouter.get("/professores", authenticate, requireRole("staff"), async (_req, res, next) => {
  try {
    const professores = await sql`
        SELECT id, nome, email
        FROM usuarios
        WHERE role = 'professor'
        ORDER BY nome
      `;
    res.json(professores);
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

      if (email.length < 3) {
        res.json([]);
        return;
      }

      // Apenas membros e diretores aparecem na busca; staff/professor não são listáveis
      const usuarios = await sql`
      SELECT id, nome, email FROM usuarios
      WHERE email ILIKE ${"%" + email + "%"}
        AND role IN ('membro', 'diretor')
      LIMIT 10
    `;

      res.json(usuarios);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /usuarios/:id — atualiza nome, role e/ou liga (admin)
usuariosRouter.patch("/:id", authenticate, requireRole("staff"), async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const { nome, role, liga_id } = req.body as {
      nome?: string;
      role?: string;
      liga_id?: string | null;
    };

    if (role !== undefined && !ROLES_VALIDOS.includes(role as UserRole)) {
      res.status(400).json({ error: `role inválido. Use um de: ${ROLES_VALIDOS.join(", ")}.` });
      return;
    }

    if (textoExcedeLimite(nome)) {
      res.status(400).json({ error: `nome deve ter no máximo ${MAX_TEXTO} caracteres.` });
      return;
    }

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

    // Sincroniza role no user_metadata do Auth para consistência cross-system
    if (role !== undefined) {
      await supabaseAdmin.auth.admin
        .updateUserById(id, { user_metadata: { role } })
        .catch((e) => console.error("[usuarios] Falha ao sincronizar role no Auth:", e));
    }

    if (liga_id !== undefined) {
      await sql`DELETE FROM liga_membros WHERE usuario_id = ${id}`;
      if (liga_id) {
        await sql`
          INSERT INTO liga_membros (liga_id, usuario_id)
          VALUES (${liga_id}, ${id})
          ON CONFLICT (liga_id, usuario_id) DO NOTHING
        `;
      }
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
    const user = (req as AuthenticatedRequest).user!;

    if (id === user.id) {
      res.status(400).json({ error: "Você não pode remover a si mesmo." });
      return;
    }

    // Remove dependências locais antes do Auth para evitar usuário órfão por FK
    try {
      await sql.begin(async (tx) => {
        const t = tx as unknown as typeof sql;
        await t`DELETE FROM liga_membros WHERE usuario_id = ${id}`;
        await t`DELETE FROM usuarios WHERE id = ${id}`;
      });
    } catch (dbErr) {
      next(dbErr);
      return;
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) {
      console.error("[usuarios] Falha ao remover do Auth (dados locais já removidos):", authError);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
