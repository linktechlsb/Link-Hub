import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err.stack);
  const body: Record<string, string> = { error: "Erro interno do servidor." };
  if (process.env["NODE_ENV"] !== "production") {
    body["message"] = err.message;
  }
  res.status(500).json(body);
}
