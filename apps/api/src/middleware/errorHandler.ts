import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err.stack);
  res.status(500).json({
    error: "Erro interno do servidor.",
    message: process.env["NODE_ENV"] === "development" ? err.message : undefined,
  });
}
