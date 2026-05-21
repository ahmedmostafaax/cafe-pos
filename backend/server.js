/**
 * server.js — 餐厅 POS 后端服务 (v5)
 *
 * 1Panel 部署入口保持不变：npm start -> node server.js
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const dbContext = require('./db');
const { createServices } = require('./services');
const { registerRoutes } = require('./routes');
const { registerSocketHandlers } = require('./sockets');

const { PORT, db, paths } = dbContext;
const { DB_FILE, UPLOAD_ROOT } = paths;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const services = createServices(dbContext);

app.use(express.json({ limit: '8mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use('/uploads', express.static(UPLOAD_ROOT));

registerRoutes(app, services);
registerSocketHandlers(io, services);

const DIST_CANDIDATES = [
  process.env.FRONTEND_DIST ? path.resolve(process.env.FRONTEND_DIST) : null,
  path.join(__dirname, 'cafe-pos-demo', 'dist'),
  path.resolve(__dirname, '..', 'cafe-pos-demo', 'dist'),
].filter(Boolean);
const FRONTEND_DIST = DIST_CANDIDATES.find((candidate) => fs.existsSync(path.join(candidate, 'index.html'))) || null;

if (FRONTEND_DIST) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  console.warn('⚠️ 未找到前端 dist 目录，当前仅提供 API + Socket 服务');
}

server.listen(PORT, '0.0.0.0', () => {
  services.reports.ensureYesterdayReport();
  services.reports.scheduleDailyReportJob();
  console.log('═══════════════════════════════════════════');
  console.log('  🍽️  POS 后端 v5 已启动');
  console.log('  📡 http://0.0.0.0:' + PORT);
  console.log('  🌐 http://localhost:' + PORT);
  console.log('  🗄️  ' + DB_FILE);
  if (FRONTEND_DIST) console.log('  📦 静态资源: ' + FRONTEND_DIST);
  else console.log('  ⚠️ 未托管静态页面（请先构建前端 dist）');
  console.log('═══════════════════════════════════════════');
});

process.on('SIGINT', () => { db.close(); server.close(() => process.exit(0)); });
process.on('SIGTERM', () => { db.close(); server.close(() => process.exit(0)); });

