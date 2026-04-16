import express, { type Express } from "express";
import cors from "cors";
import { router } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app: Express = express();
const PORT = process.env["PORT"] ?? process.env["API_PORT"] ?? 3001;

app.use(cors({ origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000" }));
app.use(express.json());

app.use("/", router);
app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API rodando na porta ${PORT}`);
});

export default app;
