import { Router, type Router as IRouter } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";

export const ligasRouter: IRouter = Router();

// GET /ligas — lista todas as ligas
ligasRouter.get("/", authenticate, async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("ligas")
      .select("*")
      .order("nome");

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /ligas/:id — detalhe de uma liga
ligasRouter.get("/:id", authenticate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("ligas")
      .select("*, membros:liga_membros(*, usuario:usuarios(*))")
      .eq("id", req.params["id"])
      .single();

    if (error) throw error;
    if (!data) { res.status(404).json({ error: "Liga não encontrada." }); return; }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /ligas — criar liga (admin)
ligasRouter.post("/", authenticate, requireRole("staff"), async (req, res, next) => {
  try {
    const { nome, descricao, lider_id } = req.body as {
      nome: string;
      descricao?: string;
      lider_id: string;
    };

    const { data, error } = await supabaseAdmin
      .from("ligas")
      .insert({ nome, descricao, lider_id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PATCH /ligas/:id — editar liga
ligasRouter.patch("/:id", authenticate, requireRole("staff", "diretor"), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("ligas")
      .update(req.body)
      .eq("id", req.params["id"])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// DELETE /ligas/:id — arquivar liga (admin)
ligasRouter.delete("/:id", authenticate, requireRole("staff"), async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from("ligas")
      .update({ ativo: false })
      .eq("id", req.params["id"]);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
