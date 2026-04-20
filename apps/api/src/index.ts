import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler } from "./middleware/errorHandler.js";

const app: Express = express();
const PORT = parseInt(process.env["PORT"] ?? process.env["API_PORT"] ?? "3001", 10);

app.use(cors({ origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000" }));
app.use(express.json());

// Dynamic import to ensure environment variables are loaded before routes initialize
(async () => {
  const { router } = await import("./routes/index.js");
  app.use("/api", router);

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const webDist = path.resolve(__dirname, "../../web/dist");
  app.use(express.static(webDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });

  app.use(errorHandler);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API rodando na porta ${PORT}`);
  });
})();

export default app;
