// Role: API server bootstrap and top-level error boundary.
import "./server/config/loadEnv.js";
import express from "express";
import cors from "cors";
import { apiRouter } from "./server/routes/apiRouter.js";
import { getGeminiIntroModelName } from "./server/services/introRecommendationService.js";

const PORT = Number(process.env.PORT ?? 4000);

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());
app.use(apiRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ message: "Invalid JSON body" });
    return;
  }

  res.status(error.statusCode ?? 500).json({
    message: error.statusCode ? error.message : "Internal server error",
    ...(!error.statusCode && { detail: error.message }),
  });
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
  console.log(`Gemini intro model: ${getGeminiIntroModelName()}`);
});
