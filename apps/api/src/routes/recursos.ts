import { randomUUID } from "node:crypto";

import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as IRouter,
} from "express";
import multer from "multer";

import { sql } from "../config/db.js";
import { supabaseAdmin } from "../config/supabase.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { usuarioEhDiretorDaLiga, usuarioPertenceALiga } from "../middleware/authorization.js";

export const recursosRouter: IRouter = Router();

const BUCKET_RECURSOS = "recursos";

const TIPOS_PERMITIDOS = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
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
        res
          .status(400)
          .json({
            error: "Tipo de ficheiro não permitido. Use PDF, documentos, apresentações ou vídeos.",
          });
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

let bucketGarantido = false;
async function garantirBucket() {
  if (bucketGarantido) return;
  const { data } = await supabaseAdmin.storage.getBucket(BUCKET_RECURSOS);
  if (!data) {
    await supabaseAdmin.storage.createBucket(BUCKET_RECURSOS, { public: true });
  }
  bucketGarantido = true;
}

// POST /recursos/upload — envia um arquivo para o storage e devolve a URL pública
recursosRouter.post(
  "/upload",
  authenticate,
  requireRole("staff", "diretor"),
  uploadSingle("arquivo"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Arquivo obrigatório." });
        return;
      }

      const liga_id = (req.body as { liga_id?: string }).liga_id ?? "geral";
      const user = (req as AuthenticatedRequest).user!;

      if (user.role === "diretor" && !(await usuarioEhDiretorDaLiga(user.email, liga_id))) {
        res.status(403).json({ error: "Você só pode enviar arquivos da sua própria liga." });
        return;
      }

      await garantirBucket();

      const ext = req.file.originalname.split(".").pop() ?? "bin";
      const path = `${liga_id}/${randomUUID()}.${ext}`;

      const { error: storageError } = await supabaseAdmin.storage
        .from(BUCKET_RECURSOS)
        .upload(path, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (storageError) throw storageError;

      const { data: urlData } = supabaseAdmin.storage.from(BUCKET_RECURSOS).getPublicUrl(path);

      res.status(201).json({ url: urlData.publicUrl });
    } catch (err) {
      next(err);
    }
  },
);

// GET /recursos?liga_id= — lista recursos de uma liga (somente membros, staff ou professor)
recursosRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const liga_id = req.query["liga_id"] as string | undefined;

    if (!liga_id) {
      res.status(400).json({ error: "liga_id é obrigatório." });
      return;
    }

    // Membros, staff e professores veem tudo; pessoas de fora só veem públicos.
    const acessoCompleto =
      user.role === "staff" ||
      user.role === "professor" ||
      (await usuarioPertenceALiga(user.email, liga_id));

    const recursos = acessoCompleto
      ? await sql`
          SELECT id, liga_id, titulo, tipo, url, icone, cor, publico, criado_por, criado_em
          FROM recursos
          WHERE liga_id = ${liga_id}
          ORDER BY criado_em DESC
        `
      : await sql`
          SELECT id, liga_id, titulo, tipo, url, icone, cor, publico, criado_por, criado_em
          FROM recursos
          WHERE liga_id = ${liga_id} AND publico = true
          ORDER BY criado_em DESC
        `;

    res.json(recursos);
  } catch (err) {
    next(err);
  }
});

// POST /recursos — cria um recurso (lider da liga ou staff)
recursosRouter.post("/", authenticate, requireRole("staff", "diretor"), async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { liga_id, titulo, tipo, url, icone, cor, publico } = req.body as {
      liga_id: string;
      titulo: string;
      tipo: string;
      url: string;
      icone?: string;
      cor?: string;
      publico?: boolean;
    };

    if (!liga_id || !titulo || !url) {
      res.status(400).json({ error: "liga_id, titulo e url são obrigatórios." });
      return;
    }

    if (user.role === "diretor" && !(await usuarioEhDiretorDaLiga(user.email, liga_id))) {
      res.status(403).json({ error: "Você só pode criar recursos da sua própria liga." });
      return;
    }

    const [criador] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;

    const [recurso] = await sql`
      INSERT INTO recursos (liga_id, titulo, tipo, url, icone, cor, publico, criado_por)
      VALUES (
        ${liga_id},
        ${titulo},
        ${tipo ?? "link"},
        ${url},
        ${icone ?? "link"},
        ${cor ?? "#546484"},
        ${publico ?? false},
        ${criador?.id ?? null}
      )
      RETURNING id, liga_id, titulo, tipo, url, icone, cor, publico, criado_por, criado_em
    `;

    res.status(201).json(recurso);
  } catch (err) {
    next(err);
  }
});

// PATCH /recursos/:id — atualiza um recurso (lider ou staff)
recursosRouter.patch(
  "/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;
      const { titulo, tipo, url, icone, cor, publico } = req.body as {
        titulo?: string;
        tipo?: string;
        url?: string;
        icone?: string;
        cor?: string;
        publico?: boolean;
      };

      if (user.role === "diretor") {
        const [alvo] = await sql`SELECT liga_id FROM recursos WHERE id = ${id} LIMIT 1`;
        if (!alvo) {
          res.status(404).json({ error: "Recurso não encontrado." });
          return;
        }
        if (!(await usuarioEhDiretorDaLiga(user.email, alvo.liga_id as string))) {
          res.status(403).json({ error: "Você só pode editar recursos da sua própria liga." });
          return;
        }
      }

      const [recurso] = await sql`
      UPDATE recursos
      SET
        titulo  = COALESCE(${titulo ?? null}, titulo),
        tipo    = COALESCE(${tipo ?? null},   tipo),
        url     = COALESCE(${url ?? null},    url),
        icone   = COALESCE(${icone ?? null},  icone),
        cor     = COALESCE(${cor ?? null},    cor),
        publico = COALESCE(${publico ?? null}, publico)
      WHERE id = ${id}
      RETURNING id, liga_id, titulo, tipo, url, icone, cor, publico, criado_por, criado_em
    `;

      if (!recurso) {
        res.status(404).json({ error: "Recurso não encontrado." });
        return;
      }

      res.json(recurso);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /recursos/:id — remove um recurso (lider ou staff)
recursosRouter.delete(
  "/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      if (user.role === "diretor") {
        const [alvo] = await sql`SELECT liga_id FROM recursos WHERE id = ${id} LIMIT 1`;
        if (!alvo) {
          res.status(404).json({ error: "Recurso não encontrado." });
          return;
        }
        if (!(await usuarioEhDiretorDaLiga(user.email, alvo.liga_id as string))) {
          res.status(403).json({ error: "Você só pode remover recursos da sua própria liga." });
          return;
        }
      }

      await sql`DELETE FROM recursos WHERE id = ${id}`;

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
