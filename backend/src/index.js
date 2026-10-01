import "express-async-errors";
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { HttpError } from "./lib/http.js";
import { requireAuth, requireRole } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import otpRoutes from "./routes/otps.js";
import userRoutes from "./routes/users.js";
import auditRoutes from "./routes/audit.js";
import adminRoutes from "./routes/admin.js";

const app = express();

app.disable("x-powered-by");
// Behind the external nginx: use X-Forwarded-For for req.ip (audit and rate limit).
app.set("trust proxy", 1);
app.use(
  cors({
    origin: config.frontendOrigins.length ? config.frontendOrigins : false,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "32kb" }));
app.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRoutes);
app.use("/otps", requireAuth, otpRoutes);
app.use("/users", requireAuth, userRoutes);
app.use("/audit", requireAuth, auditRoutes);
app.use("/admin", requireAuth, requireRole("ADMIN_LOCAL", "ADMIN_GLOBAL"), adminRoutes);

app.use((_req, _res, next) => next(new HttpError(404, "Rota não encontrada")));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "JSON inválido" });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "Requisição muito grande" });
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

app.listen(config.port, config.bindHost, () => {
  console.log(`OTP API ouvindo em ${config.bindHost}:${config.port}`);
});
