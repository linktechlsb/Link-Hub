import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";

export const salasRouter = Router();

// GET /salas — lista salas disponíveis
salasRouter.get("/", authenticate, async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from("salas").select("*").order("nome");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /salas/reservas?sala_id=&data_inicio=&data_fim=
salasRouter.get("/reservas", authenticate, async (req, res, next) => {
  try {
    const { sala_id, data_inicio, data_fim } = req.query as Record<string, string>;

    let query = supabaseAdmin
      .from("reservas_salas")
      .select("*, sala:salas(*), liga:ligas(id, nome)")
      .order("inicio");

    if (sala_id) query = query.eq("sala_id", sala_id);
    if (data_inicio) query = query.gte("inicio", data_inicio);
    if (data_fim) query = query.lte("fim", data_fim);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /salas/reservas — criar reserva
salasRouter.post("/reservas", authenticate, async (req, res, next) => {
  try {
    const { sala_id, inicio, fim } = req.body as { sala_id: string; inicio: string; fim: string };

    // Verificar conflito de horário
    const { data: conflito } = await supabaseAdmin
      .from("reservas_salas")
      .select("id")
      .eq("sala_id", sala_id)
      .lt("inicio", fim)
      .gt("fim", inicio)
      .limit(1);

    if (conflito && conflito.length > 0) {
      res.status(409).json({ error: "Conflito de horário: a sala já está reservada neste período." });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("reservas_salas")
      .insert(req.body)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// DELETE /salas/reservas/:id — cancelar reserva
salasRouter.delete("/reservas/:id", authenticate, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from("reservas_salas")
      .delete()
      .eq("id", req.params["id"]);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
