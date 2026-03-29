import { Router, type Router as IRouter } from "express";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { sql } from "../config/db.js";
import { supabaseAdmin } from "../config/supabase.js";
import multer from "multer";

export const ligasRouter: IRouter = Router();

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

// GET /ligas — lista todas as ligas com diretores e contagem de projetos
ligasRouter.get("/", authenticate, async (_req, res, next) => {
  try {
    const ligas = await sql`
      SELECT
        l.*,
        lu.email AS lider_email,
        COALESCE(
          json_agg(
            json_build_object('id', u.id, 'nome', u.nome)
          ) FILTER (WHERE lm.cargo = 'Diretor' AND lm.id IS NOT NULL),
          '[]'
        ) AS diretores,
        COUNT(p.id) FILTER (
          WHERE p.status IN ('aprovado', 'em_andamento')
        )::int AS projetos_ativos
      FROM ligas l
      LEFT JOIN usuarios lu ON lu.id = l.lider_id
      LEFT JOIN liga_membros lm ON lm.liga_id = l.id
      LEFT JOIN usuarios u ON u.id = lm.usuario_id
      LEFT JOIN projetos p ON p.liga_id = l.id
      WHERE l.ativo = true
      GROUP BY l.id, lu.email
      ORDER BY l.nome
    `;
    res.json(ligas);
  } catch (err) {
    next(err);
  }
});

// GET /ligas/:id — detalhe de uma liga com membros
ligasRouter.get("/:id", authenticate, async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const [liga] = await sql`
      SELECT
        l.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', lm.id,
              'usuario_id', lm.usuario_id,
              'cargo', lm.cargo,
              'usuario', json_build_object('id', u.id, 'nome', u.nome, 'email', u.email)
            )
          ) FILTER (WHERE lm.id IS NOT NULL),
          '[]'
        ) AS membros
      FROM ligas l
      LEFT JOIN liga_membros lm ON lm.liga_id = l.id
      LEFT JOIN usuarios u ON u.id = lm.usuario_id
      WHERE l.id = ${id}
      GROUP BY l.id
    `;

    if (!liga) { res.status(404).json({ error: "Liga não encontrada." }); return; }
    res.json(liga);
  } catch (err) {
    next(err);
  }
});

// POST /ligas/:id/imagem — upload de imagem da liga
ligasRouter.post(
  "/:id/imagem",
  authenticate,
  requireRole("admin", "lider"),
  upload.single("imagem"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;

      if (!req.file) {
        res.status(400).json({ error: "Arquivo de imagem obrigatório." });
        return;
      }

      const ext = req.file.mimetype === "image/png" ? "png" : "jpg";
      const filename = `${id}-${Date.now()}.${ext}`;

      const { error: storageError } = await supabaseAdmin.storage
        .from("ligas-imagens")
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (storageError) throw storageError;

      const { data: urlData } = supabaseAdmin.storage
        .from("ligas-imagens")
        .getPublicUrl(filename);

      const imagem_url = urlData.publicUrl;

      const [liga] = await sql`
        UPDATE ligas SET imagem_url = ${imagem_url}
        WHERE id = ${id}
        RETURNING *
      `;

      if (!liga) { res.status(404).json({ error: "Liga não encontrada." }); return; }
      res.json(liga);
    } catch (err) {
      next(err);
    }
  }
);

// POST /ligas — criar liga (admin)
ligasRouter.post("/", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const { nome, descricao, diretores } = req.body as {
      nome: string;
      descricao?: string;
      diretores?: string[];
    };

    // Resolve o usuarios.id do admin logado pelo email
    const [adminUsuario] = await sql`
      SELECT id FROM usuarios WHERE email = ${(req as AuthenticatedRequest).user!.email}
    `;
    if (!adminUsuario) { res.status(404).json({ error: "Usuário não encontrado." }); return; }
    const lider_id = adminUsuario.id as string;

    const [liga] = await sql`
      INSERT INTO ligas (nome, descricao, lider_id)
      VALUES (${nome}, ${descricao ?? null}, ${lider_id})
      RETURNING *
    `;

    if (liga && diretores && diretores.length > 0) {
      for (const usuario_id of diretores) {
        await sql`
          INSERT INTO liga_membros (liga_id, usuario_id, cargo)
          VALUES (${liga.id}, ${usuario_id}, 'Diretor')
          ON CONFLICT (liga_id, usuario_id)
          DO UPDATE SET cargo = 'Diretor'
        `;
        await sql`
          UPDATE usuarios SET role = 'lider' WHERE id = ${usuario_id}
        `;
      }
    }

    res.status(201).json(liga);
  } catch (err) {
    next(err);
  }
});

// PATCH /ligas/:id — editar liga (admin ou lider)
ligasRouter.patch("/:id", authenticate, requireRole("admin", "lider"), async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const { diretores, ...updates } = req.body as Record<string, unknown> & {
      diretores?: string[];
    };

    let liga;
    if (Object.keys(updates).length > 0) {
      const [updated] = await sql`
        UPDATE ligas SET ${sql(updates)} WHERE id = ${id} RETURNING *
      `;
      liga = updated;
    } else {
      const [existing] = await sql`SELECT * FROM ligas WHERE id = ${id}`;
      liga = existing;
    }

    if (!liga) { res.status(404).json({ error: "Liga não encontrada." }); return; }

    if (diretores !== undefined) {
      // Remove diretores anteriores
      await sql`
        UPDATE liga_membros SET cargo = NULL
        WHERE liga_id = ${id} AND cargo = 'Diretor'
      `;
      // Adiciona novos diretores
      for (const usuario_id of diretores) {
        await sql`
          INSERT INTO liga_membros (liga_id, usuario_id, cargo)
          VALUES (${id}, ${usuario_id}, 'Diretor')
          ON CONFLICT (liga_id, usuario_id)
          DO UPDATE SET cargo = 'Diretor'
        `;
        await sql`
          UPDATE usuarios SET role = 'lider' WHERE id = ${usuario_id}
        `;
      }
    }

    res.json(liga);
  } catch (err) {
    next(err);
  }
});

// DELETE /ligas/:id — arquivar liga (admin)
ligasRouter.delete("/:id", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    await sql`UPDATE ligas SET ativo = false WHERE id = ${id}`;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
