import path from "path";
import { fileURLToPath } from "url";

import cors from "cors";
import express, { type Express } from "express";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app: Express = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
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

  app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`API rodando na porta ${env.PORT}`);
  });
})();

export default app;
