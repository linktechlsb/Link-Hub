import path from "path";
import { fileURLToPath } from "url";

import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { tallyWebhookRouter } from "./routes/tally-webhook.js";

const app: Express = express();

const allowedOrigins = env.CORS_ORIGIN.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsMiddleware = cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("Origem não permitida pelo CORS."));
  },
});

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: env.isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            fontSrc: ["'self'", "https:", "data:"],
            connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  }),
);
// Mount Tally webhook BEFORE express.json — needs raw body for HMAC
app.use(tallyWebhookRouter);
app.use(express.json({ limit: "200kb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_DISABLED ? 0 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.RATE_LIMIT_DISABLED,
});

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_DISABLED ? 0 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.RATE_LIMIT_DISABLED,
});

// Dynamic import to ensure environment variables are loaded before routes initialize
(async () => {
  const { router } = await import("./routes/index.js");
  app.use("/api", corsMiddleware);
  app.use("/api", apiLimiter);
  app.use("/api/feedbacks", sensitiveLimiter);
  app.use("/api/usuarios/busca", sensitiveLimiter);
  app.use("/api", router);

  // 404 explícito para rotas /api desconhecidas — não cair no SPA fallback
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Rota não encontrada." });
  });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const webDist = path.resolve(__dirname, "../../web/dist");
  app.use(express.static(webDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });

  app.use(errorHandler);

  app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`API rodando na porta ${env.PORT}`);
  });
})().catch((err) => {
  console.error("Falha crítica ao inicializar o servidor:", err);
  process.exit(1);
});

export default app;
