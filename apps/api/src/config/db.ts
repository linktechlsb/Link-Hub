import postgres from "postgres";

import { env } from "./env.js";

if (!env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL é obrigatório para operações diretas no Postgres. " +
      "Configure a variável no .env.",
  );
}

export const sql = postgres(env.DATABASE_URL);
