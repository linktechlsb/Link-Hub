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

// GET /ligas/minha — liga do usuário autenticado (via liga_membros ou lider_id)
ligasRouter.get("/minha", authenticate, async (req, res, next) => {
  try {
    const email = (req as AuthenticatedRequest).user!.email;
    const [liga] = await sql`
      SELECT l.*, lu.email AS lider_email
      FROM ligas l
      LEFT JOIN usuarios lu ON lu.id = l.lider_id
      WHERE l.ativo = true
        AND (
          l.lider_id = (SELECT id FROM usuarios WHERE email = ${email})
          OR EXISTS (
            SELECT 1 FROM liga_membros lm
            JOIN usuarios u ON u.id = lm.usuario_id
            WHERE lm.liga_id = l.id AND u.email = ${email}
          )
        )
      LIMIT 1
    `;
    if (!liga) { res.status(404).json({ error: "Liga não encontrada." }); return; }
    res.json(liga);
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

// GET /ligas/:id/membros — membros da liga com cargo e data de ingresso
ligasRouter.get("/:id/membros", authenticate, async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const membros = await sql`
      SELECT
        lm.id, lm.usuario_id, lm.cargo, lm.ingressou_em,
        u.nome, u.email, u.role
      FROM liga_membros lm
      JOIN usuarios u ON u.id = lm.usuario_id
      WHERE lm.liga_id = ${id}
      ORDER BY lm.ingressou_em ASC
    `;
    res.json(membros);
  } catch (err) {
    next(err);
  }
});

// GET /ligas/:id/projetos — projetos da liga
ligasRouter.get("/:id/projetos", authenticate, async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const projetos = await sql`
      SELECT p.*, u.nome AS responsavel_nome
      FROM projetos p
      LEFT JOIN usuarios u ON u.id = p.responsavel_id
      WHERE p.liga_id = ${id}
      ORDER BY p.criado_em DESC
    `;
    res.json(projetos);
  } catch (err) {
    next(err);
  }
});

// GET /ligas/:id/presenca — registros de presença agrupados por evento
ligasRouter.get("/:id/presenca", authenticate, async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const registros = await sql`
      SELECT
        e.id AS evento_id,
        e.titulo AS evento_titulo,
        e.data AS evento_data,
        pr.id,
        pr.usuario_id,
        pr.status,
        pr.justificativa,
        u.nome AS usuario_nome
      FROM eventos e
      LEFT JOIN presencas pr ON pr.evento_id = e.id
      LEFT JOIN usuarios u ON u.id = pr.usuario_id
      WHERE e.liga_id = ${id}
      ORDER BY e.data DESC
    `;
    res.json(registros);
  } catch (err) {
    next(err);
  }
});

// GET /ligas/:id/eventos/proximo — próximo evento futuro da liga
ligasRouter.get("/:id/eventos/proximo", authenticate, async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const [evento] = await sql`
      SELECT * FROM eventos
      WHERE liga_id = ${id} AND data > NOW()
      ORDER BY data ASC
      LIMIT 1
    `;
    if (!evento) { res.status(404).json({ error: "Nenhum evento futuro." }); return; }
    res.json(evento);
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

// POST /ligas/:id/membros — adiciona membro à liga (admin)
ligasRouter.post("/:id/membros", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const liga_id = req.params["id"] as string;
    const { usuario_id, cargo } = req.body as { usuario_id: string; cargo?: string };

    await sql`
      INSERT INTO liga_membros (liga_id, usuario_id, cargo)
      VALUES (${liga_id}, ${usuario_id}, ${cargo ?? null})
      ON CONFLICT (liga_id, usuario_id)
      DO UPDATE SET cargo = EXCLUDED.cargo
    `;

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /ligas/:id/membros/:userId — remove membro da liga (admin)
ligasRouter.delete("/:id/membros/:userId", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const liga_id = req.params["id"] as string;
    const usuario_id = req.params["userId"] as string;

    await sql`
      DELETE FROM liga_membros
      WHERE liga_id = ${liga_id} AND usuario_id = ${usuario_id}
    `;

    res.status(204).send();
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
