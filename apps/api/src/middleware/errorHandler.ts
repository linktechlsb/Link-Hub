import { type NextFunction, type Request, type Response } from "express";

import { env } from "../config/env.js";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err.stack);
  const body: Record<string, string> = { error: "Erro interno do servidor." };
  if (!env.isProduction) {
    body["message"] = err.message;
  }
  res.status(500).json(body);
}
