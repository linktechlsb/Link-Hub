import { Router, type Router as IRouter } from "express";
import { authenticate } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";

export const presencaRouter: IRouter = Router();

// GET /presenca?liga_id=&usuario_id=&periodo_inicio=&periodo_fim=
presencaRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const { liga_id, usuario_id, periodo_inicio, periodo_fim } = req.query as Record<string, string>;

    let query = supabaseAdmin.from("presencas").select("*, evento:eventos(*)").order("data", { ascending: false });

    if (liga_id) query = query.eq("liga_id", liga_id);
    if (usuario_id) query = query.eq("usuario_id", usuario_id);
    if (periodo_inicio) query = query.gte("data", periodo_inicio);
    if (periodo_fim) query = query.lte("data", periodo_fim);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /presenca — registrar presença
presencaRouter.post("/", authenticate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("presencas")
      .insert(req.body)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PATCH /presenca/:id — justificar ausência
presencaRouter.patch("/:id", authenticate, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("presencas")
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
