import "dotenv/config";
import express from "express";
import cors from "cors";
import { router } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env["API_PORT"] ?? 3001;

app.use(cors({ origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000" }));
app.use(express.json());

app.use("/", router);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});

export default app;
