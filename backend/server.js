import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import connectDB from "./database/config/db.js";
import bootstrap from "./src/modules/index.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error(
    "FATAL: JWT_SECRET is missing or too short. Set a long random value in your environment."
  );
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

const FRONTEND = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: FRONTEND,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  socket.on("join_manager", () => socket.join("managers"));

  socket.on("get_initial_data", async () => {
    try {
      const Order = (await import("./database/models/order.model.js")).default;
      const orders = await Order.find({
        status: { $in: ["active", "preparing", "ready", "unpaid"] },
      }).sort("-createdAt");
      socket.emit("initial_data", { orders });
    } catch {
      socket.emit("error", { message: "Error loading initial data" });
    }
  });
});

connectDB();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: FRONTEND,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "fail", message: "طلبات كثيرة جداً، يرجى المحاولة لاحقاً" },
});
app.use("/api", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { status: "fail", message: "محاولات تسجيل دخول كثيرة، يرجى الانتظار" },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/create-admin", authLimiter);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    system: "GODZ Cafe POS",
    time: new Date().toISOString(),
  });
});

bootstrap(app);

// Production: serve Vite build
const distPath = process.env.FRONTEND_DIST || path.join(__dirname, "frontend", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return next();
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) next();
    });
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log("═══════════════════════════════════════════");
  console.log("  ☕ GODZ Cafe POS Backend Running");
  console.log(`  ☕ http://localhost:${PORT}`);
  console.log("═══════════════════════════════════════════");
});

