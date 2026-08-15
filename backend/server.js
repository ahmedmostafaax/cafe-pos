import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./database/config/db.js";
import bootstrap from "./src/modules/index.routes.js";

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
    } catch (err) {
      socket.emit("error", { message: "Error" });
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

// Rate limits
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "fail", message: "عدد الطلبات تجاوز الحد" },
});
app.use("/api", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { status: "fail", message: "محاولات كثيرة على تسجيل الدخول" },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/create-admin", authLimiter);

// Security headers بسيطة
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    system: "GODZ",
    time: new Date().toISOString(),
  });
});

bootstrap(app);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log("═══════════════════════════════════════════");
  console.log("  GODZ Cafe POS Backend");
  console.log(`  http://localhost:${PORT}`);
  console.log("═══════════════════════════════════════════");
});
