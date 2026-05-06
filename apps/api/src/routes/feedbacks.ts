import { Router, type Router as IRouter } from "express";

import { sql } from "../config/db.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";

export const feedbacksRouter: IRouter = Router();

interface FeedbackBody {
  titulo: string;
  tipo: "sugestao" | "feature" | "correcao";
  mensagem: string;
}

feedbacksRouter.post("/", authenticate, async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { titulo, tipo, mensagem } = req.body as FeedbackBody;

    if (!titulo?.trim() || !tipo || !mensagem?.trim()) {
      res.status(400).json({ error: "Título, tipo e mensagem são obrigatórios." });
      return;
    }

    if (!["sugestao", "feature", "correcao"].includes(tipo)) {
      res.status(400).json({ error: "Tipo inválido." });
      return;
    }

    if (titulo.length > 200 || mensagem.length > 5000) {
      res.status(400).json({ error: "Título ou mensagem excede o tamanho máximo permitido." });
      return;
    }

    await sql`
      INSERT INTO feedbacks (usuario_email, titulo, tipo, mensagem)
      VALUES (${user.email}, ${titulo.trim()}, ${tipo}, ${mensagem.trim()})
    `;

    res.status(201).json({ message: "Feedback enviado com sucesso." });
  } catch (err) {
    next(err);
  }
});
