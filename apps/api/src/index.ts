import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import express, { type Express } from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";

const app: Express = express();
const PORT = parseInt(process.env["PORT"] ?? process.env["API_PORT"] ?? "3001", 10);

app.use(cors({ origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000" }));
app.use(express.json());

// Dynamic import to ensure environment variables are loaded before routes initialize
(async () => {
  const { router } = await import("./routes/index.js");
  app.use("/", router);
  app.use(errorHandler);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API rodando na porta ${PORT}`);
  });
})();

export default app;
