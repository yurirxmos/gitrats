// Carregar variáveis de ambiente ANTES de qualquer importação
import dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import cors from "@fastify/cors";
import healthRoutes from "./routes/health.js";
import exampleRoutes from "./routes/example.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import characterRoutes from "./routes/character.js";
import githubRoutes from "./routes/github.js";
import achievementsRoutes from "./routes/achievements.js";
import userRoutes from "./routes/user.js";
import { githubWebhookRoutes } from "./routes/github-webhook.js";

const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || "0.0.0.0";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

// Configurar CORS
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
});

// Registrar rotas
await fastify.register(healthRoutes);
await fastify.register(exampleRoutes, { prefix: "/api" });
await fastify.register(leaderboardRoutes, { prefix: "/api" });
await fastify.register(characterRoutes, { prefix: "/api" });
await fastify.register(githubRoutes, { prefix: "/api" });
await fastify.register(achievementsRoutes, { prefix: "/api" });
await fastify.register(userRoutes, { prefix: "/api" });
await fastify.register(githubWebhookRoutes, { prefix: "/api" });

// Iniciar servidor
const start = async () => {
  try {
    await fastify.listen({ port: Number(PORT), host: HOST });
    console.log(`🚀 API rodando em http://${HOST}:${PORT}`);
    console.log("\n📋 Rotas registradas:");
    fastify.printRoutes();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
