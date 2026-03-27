import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import type { StatusProjeto } from "@link-leagues/types";

export const projetosRouter = Router();

// GET /projetos
projetosRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const ligaId = req.query["liga_id"] as string | undefined;

    let query = supabaseAdmin.from("projetos").select("*, liga:ligas(id, nome)").order("criado_em", { ascending: false });
    if (ligaId) query = query.eq("liga_id", ligaId);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /projetos
projetosRouter.post("/", authenticate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("projetos")
      .insert({ ...req.body, status: "rascunho" as StatusProjeto })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PATCH /projetos/:id/status — fluxo de aprovação
projetosRouter.patch("/:id/status", authenticate, requireRole("admin", "lider"), async (req, res, next) => {
  try {
    const { status } = req.body as { status: StatusProjeto };
    const statusValidos: StatusProjeto[] = ["rascunho", "em_aprovacao", "aprovado", "rejeitado"];

    if (!statusValidos.includes(status)) {
      res.status(400).json({ error: "Status inválido." });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("projetos")
      .update({ status })
      .eq("id", req.params["id"])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// DELETE /projetos/:id
projetosRouter.delete("/:id", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from("projetos")
      .delete()
      .eq("id", req.params["id"]);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
