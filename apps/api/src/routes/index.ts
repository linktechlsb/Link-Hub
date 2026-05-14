import { Router, type Router as IRouter } from "express";

import { crmRouter } from "./crm.js";
import { eventosRouter } from "./eventos.js";
import { feedbacksRouter } from "./feedbacks.js";
import { formulariosRouter } from "./formularios.js";
import { ligasRouter } from "./ligas.js";
import { muralRouter } from "./mural.js";
import { pendentesRouter } from "./pendentes.js";
import { presencaRouter } from "./presenca.js";
import { projetosRouter } from "./projetos.js";
import { rankingRouter } from "./ranking.js";
import { receitasRouter } from "./receitas.js";
import { recursosRouter } from "./recursos.js";
import { salasRouter } from "./salas.js";
import { solicitacoesRouter } from "./solicitacoes.js";
import { usuariosRouter } from "./usuarios.js";

export const router: IRouter = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/ligas", ligasRouter);
router.use("/projetos", projetosRouter);
router.use("/presenca", presencaRouter);
router.use("/salas", salasRouter);
router.use("/usuarios", usuariosRouter);
router.use("/eventos", eventosRouter);
router.use("/recursos", recursosRouter);
router.use("/receitas", receitasRouter);
router.use("/pendentes", pendentesRouter);
router.use("/mural", muralRouter);
router.use("/ranking", rankingRouter);
router.use("/crm", crmRouter);
router.use("/feedbacks", feedbacksRouter);
router.use("/formularios", formulariosRouter);
router.use("/solicitacoes", solicitacoesRouter);
