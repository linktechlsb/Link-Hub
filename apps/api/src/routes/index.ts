import { Router, type Router as IRouter } from "express";
import { ligasRouter } from "./ligas.js";
import { projetosRouter } from "./projetos.js";
import { presencaRouter } from "./presenca.js";
import { salasRouter } from "./salas.js";
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
