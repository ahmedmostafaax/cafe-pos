const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const PORT = Number(process.env.PORT || 3001);
const BACKEND_ROOT = path.resolve(__dirname, '..');
const DB_DIR = process.env.DB_PATH || path.join(BACKEND_ROOT, 'data');
const DB_FILE = path.join(DB_DIR, 'pos.db');
const UPLOAD_ROOT = path.join(BACKEND_ROOT, 'uploads');
const MENU_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'menu');
const MAX_MENU_IMAGE_BYTES = 5 * 1024 * 1024;
const ACTIVE_DB_STATUSES = ['active', 'preparing'];
const OPEN_DB_STATUSES = [...ACTIVE_DB_STATUSES, 'unpaid'];
const DASHBOARD_DB_STATUSES = [...ACTIVE_DB_STATUSES, 'archived', 'served'];
const COMMISSION_DB_STATUSES = ['archived', 'served'];

function safeJSONParse(str, fallback = []) {
  if (str === undefined || str === null || str === '') return fallback;
  try { return JSON.parse(str); }
  catch { return fallback; }
}

const DEFAULT_STATION_THRESHOLDS = {
  kitchen: { newMinutes: 5, urgentMinutes: 15 },
  bar: { newMinutes: 3, urgentMinutes: 10 },
};
const DEFAULT_TABLE_IDS = [];
const RESERVED_TABLE_IDS = new Set(['外卖', '堂食', 'walkin']);
const COMMISSION_ROLES = ['front', 'kitchen', 'bar'];
const MENU_IMAGE_MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const DESIGN_CATS = ["披萨", "欧包", "沙拉", "甜品", "鸡尾酒", "咖啡", "饮品"];

const opt = (label, type, required, choices) => ({
  label,
  type,
  required,
  choices: choices.map((choice) => typeof choice === 'string' ? { name: choice, priceDelta: 0 } : choice),
});

const DESIGN_MENU = [
  { id: 101, name: "玛格丽特披萨", station: "kitchen", category: "披萨", price: 68, desc: "圣马扎诺番茄、水牛马苏里拉、罗勒", recipe: "手拉饼底抹番茄酱，铺水牛马苏里拉，炉温320℃烘烤3-4分钟，出炉点罗勒油。", available: 1, sort: 101, options: [opt("饼底", "single", true, ["薄脆", "经典", { name: "加芝士边", priceDelta: 12 }])] },
  { id: 102, name: "帕尔玛火腿披萨", station: "kitchen", category: "披萨", price: 88, desc: "24月陈帕尔玛火腿、芝麻菜、帕马森", recipe: "披萨出炉后铺帕尔玛火腿和芝麻菜，刨帕马森，淋少量橄榄油。", available: 1, sort: 102, options: [] },
  { id: 103, name: "四芝士披萨", station: "kitchen", category: "披萨", price: 78, desc: "戈贡佐拉、马苏里拉、帕马森、山羊奶酪", recipe: "四种芝士均匀铺底，炉烤至边缘上色，出炉可加蜂蜜。", available: 1, sort: 103, options: [opt("加料", "multi", false, [{ name: "蜂蜜", priceDelta: 0 }, { name: "芝麻菜", priceDelta: 8 }])] },
  { id: 104, name: "松露蘑菇披萨", station: "kitchen", category: "披萨", price: 98, desc: "黑松露酱、混合菌菇、芳提娜", recipe: "炒香菌菇后铺饼，加入芳提娜芝士，出炉点松露油。", available: 1, sort: 104, options: [] },
  { id: 105, name: "辣意香肠披萨", station: "kitchen", category: "披萨", price: 78, desc: "卡拉布里亚辣香肠、蜂蜜、辣椒油", recipe: "辣香肠铺满饼面，炉烤后淋蜂蜜和辣椒油。", available: 1, sort: 105, options: [opt("辣度", "single", true, ["微辣", "标准", "加辣"])] },
  { id: 201, name: "酸种乡村面包", station: "kitchen", category: "欧包", price: 28, desc: "天然酵母、72小时冷发酵", recipe: "切厚片回烤2分钟，配发酵黄油。", available: 1, sort: 201, options: [] },
  { id: 202, name: "布里欧修吐司", station: "kitchen", category: "欧包", price: 32, desc: "法式黄油布里欧修、枫糖浆", recipe: "吐司两面煎至金黄，配枫糖浆和海盐黄油。", available: 1, sort: 202, options: [] },
  { id: 203, name: "普罗旺斯佛卡夏", station: "kitchen", category: "欧包", price: 38, desc: "迷迭香、黑橄榄、海盐", recipe: "回烤后切块，表面补橄榄油和海盐。", available: 1, sort: 203, options: [] },
  { id: 301, name: "凯撒沙拉", station: "kitchen", category: "沙拉", price: 58, desc: "罗马生菜、鳀鱼酱、帕马森脆片", recipe: "罗马生菜控干，拌凯撒酱，撒面包丁和帕马森。", available: 1, sort: 301, options: [opt("蛋白", "single", false, [{ name: "不加", priceDelta: 0 }, { name: "鸡胸", priceDelta: 12 }, { name: "虾仁", priceDelta: 18 }])] },
  { id: 302, name: "卡布里沙拉", station: "kitchen", category: "沙拉", price: 68, desc: "水牛马苏里拉、牛番茄、罗勒油", recipe: "番茄和马苏里拉交叠摆盘，淋罗勒油和黑醋。", available: 1, sort: 302, options: [] },
  { id: 401, name: "提拉米苏", station: "kitchen", category: "甜品", price: 48, desc: "马斯卡彭、意式浓缩、手指饼干", recipe: "冷藏取出后撒可可粉，边缘清洁后出餐。", available: 1, sort: 401, options: [] },
  { id: 402, name: "巴斯克芝士蛋糕", station: "kitchen", category: "甜品", price: 42, desc: "焦糖表面、柔滑内心", recipe: "切件回温5分钟，配少量海盐奶油。", available: 1, sort: 402, options: [] },
  { id: 403, name: "熔岩巧克力", station: "kitchen", category: "甜品", price: 52, desc: "70%黑巧、香草冰淇淋", recipe: "烤箱180℃加热7分钟，配香草冰淇淋立即出餐。", available: 1, sort: 403, options: [] },
  { id: 501, name: "Negroni", station: "bar", category: "鸡尾酒", price: 78, desc: "金巴利、马天尼、金酒", recipe: "金酒30ml、金巴利30ml、甜味美思30ml搅拌，橙皮装饰。", available: 1, sort: 501, options: [opt("酒精", "single", true, ["标准", { name: "低酒精", priceDelta: 0 }])] },
  { id: 502, name: "Aperol Spritz", station: "bar", category: "鸡尾酒", price: 68, desc: "阿佩罗、普洛赛克、苏打水", recipe: "冰杯加入Aperol、Prosecco和苏打水，橙片装饰。", available: 1, sort: 502, options: [] },
  { id: 503, name: "Old Fashioned", station: "bar", category: "鸡尾酒", price: 88, desc: "波本、安高天娜苦精、橙皮", recipe: "方糖、苦精、波本搅拌，大冰块，橙皮油喷香。", available: 1, sort: 503, options: [opt("基酒", "single", true, ["波本", { name: "黑麦威士忌", priceDelta: 8 }])] },
  { id: 504, name: "Espresso Martini", station: "bar", category: "鸡尾酒", price: 82, desc: "伏特加、咖啡利口酒、意式浓缩", recipe: "伏特加45ml、咖啡利口酒20ml、浓缩咖啡30ml摇和，咖啡豆装饰。", available: 1, sort: 504, options: [] },
  { id: 601, name: "意式浓缩", station: "bar", category: "咖啡", price: 28, desc: "单份 30ml", recipe: "18g粉萃取30ml，控制25-30秒。", available: 1, sort: 601, options: [opt("份量", "single", true, ["单份", { name: "双份", priceDelta: 8 }])] },
  { id: 602, name: "澳白", station: "bar", category: "咖啡", price: 36, desc: "双份浓缩 + 微泡奶", recipe: "双份浓缩，奶泡细腻，杯量约180ml。", available: 1, sort: 602, options: [opt("杯型", "single", true, ["中杯", { name: "大杯", priceDelta: 5 }]), opt("换奶", "single", false, [{ name: "鲜奶", priceDelta: 0 }, { name: "燕麦奶", priceDelta: 5 }])] },
  { id: 603, name: "拿铁", station: "bar", category: "咖啡", price: 38, desc: "双份浓缩 + 蒸奶", recipe: "双份浓缩加入蒸奶，表面拉花。", available: 1, sort: 603, options: [opt("温度", "single", true, ["热", "冰", "去冰"]), opt("换奶", "single", false, [{ name: "鲜奶", priceDelta: 0 }, { name: "燕麦奶", priceDelta: 5 }, { name: "椰奶", priceDelta: 5 }])] },
  { id: 604, name: "冷萃咖啡", station: "bar", category: "咖啡", price: 42, desc: "18小时慢萃取", recipe: "冷萃基底加冰，橙皮可选。", available: 1, sort: 604, options: [] },
  { id: 701, name: "西柚苏打", station: "bar", category: "饮品", price: 32, desc: "鲜榨西柚、迷迭香糖浆", recipe: "西柚汁、迷迭香糖浆和苏打水轻搅，迷迭香装饰。", available: 1, sort: 701, options: [] },
  { id: 702, name: "桃子冰茶", station: "bar", category: "饮品", price: 28, desc: "锡兰红茶、白桃果肉", recipe: "冰杯加入红茶、白桃果肉和糖浆，摇匀。", available: 1, sort: 702, options: [opt("甜度", "single", true, ["正常", "少糖", "无糖"])] },
  { id: 703, name: "手工柠檬水", station: "bar", category: "饮品", price: 26, desc: "现榨柠檬、蜂蜜、薄荷", recipe: "柠檬汁、蜂蜜和苏打水调和，薄荷拍香。", available: 1, sort: 703, options: [] },
];


// ════════════════════════════════════════════════════════════
//  SQLite 初始化
// ════════════════════════════════════════════════════════════

if (!fs.existsSync(DB_DIR)) { fs.mkdirSync(DB_DIR, { recursive: true }); }
if (!fs.existsSync(MENU_UPLOAD_DIR)) { fs.mkdirSync(MENU_UPLOAD_DIR, { recursive: true }); }

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('busy_timeout = 5000');
db.pragma('temp_store = MEMORY');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, tableId TEXT NOT NULL, items TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active', totalPrice REAL NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL, extra TEXT DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_tableId ON orders(tableId);
  CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders(createdAt DESC);
  CREATE INDEX IF NOT EXISTS idx_orders_status_createdAt ON orders(status, createdAt DESC);
  CREATE INDEX IF NOT EXISTS idx_orders_table_status_createdAt ON orders(tableId, status, createdAt DESC);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, roles TEXT NOT NULL DEFAULT '[]'
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS menu (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, station TEXT NOT NULL DEFAULT 'kitchen',
    category TEXT NOT NULL DEFAULT '', price REAL NOT NULL DEFAULT 0,
    desc TEXT DEFAULT '', recipe TEXT DEFAULT '', available INTEGER DEFAULT 1,
    options TEXT DEFAULT '[]', sort INTEGER DEFAULT 0,
    imageUrl TEXT DEFAULT '', isSignature INTEGER DEFAULT 0
  );
`);

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name);
  if (!columns.includes(columnName)) {
    db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`).run();
  }
}

ensureColumn('menu', 'imageUrl', "TEXT DEFAULT ''");
ensureColumn('menu', 'isSignature', 'INTEGER DEFAULT 0');

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, sort INTEGER DEFAULT 0
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '{}', updatedAt INTEGER NOT NULL DEFAULT 0
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS daily_reports (
    day TEXT PRIMARY KEY, startAt INTEGER NOT NULL, endAt INTEGER NOT NULL,
    summary TEXT NOT NULL DEFAULT '{}', hourly TEXT NOT NULL DEFAULT '[]',
    topItems TEXT NOT NULL DEFAULT '[]', categoryBreakdown TEXT NOT NULL DEFAULT '[]',
    payMethodBreakdown TEXT NOT NULL DEFAULT '[]',
    orderCount INTEGER NOT NULL DEFAULT 0, revenue REAL NOT NULL DEFAULT 0,
    updatedAt INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_daily_reports_startAt ON daily_reports(startAt);
`);

// 默认管理员
const userCount = db.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt;
if (userCount === 0) {
  db.prepare("INSERT INTO users (id,name,username,password,roles) VALUES (1,'Demo Admin','admin','admin123','[\"admin\",\"front\",\"kitchen\",\"bar\"]')").run();
}

// 种子菜单
const menuCount = db.prepare('SELECT COUNT(*) AS cnt FROM menu').get().cnt;
if (menuCount === 0) {
  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name,sort) VALUES (?,?)');
  DESIGN_CATS.forEach((c,i) => insertCat.run(c,i));

  const ins = db.prepare('INSERT INTO menu (id,name,station,category,price,desc,recipe,available,options,sort,imageUrl,isSignature) VALUES (@id,@name,@station,@category,@price,@desc,@recipe,@available,@options,@sort,@imageUrl,@isSignature)');
  DESIGN_MENU.forEach(item => ins.run({ ...item, options: JSON.stringify(item.options || []), imageUrl: item.imageUrl || '', isSignature: item.isSignature ? 1 : 0 }));
}


console.log('🗄️  SQLite 已就绪：' + DB_FILE);

const stmtInsert = db.prepare('INSERT INTO orders (id,tableId,items,status,totalPrice,createdAt,extra) VALUES (@id,@tableId,@items,@status,@totalPrice,@createdAt,@extra)');
const stmtUpsertOrder = db.prepare(`
  INSERT INTO orders (id,tableId,items,status,totalPrice,createdAt,extra)
  VALUES (@id,@tableId,@items,@status,@totalPrice,@createdAt,@extra)
  ON CONFLICT(id) DO UPDATE SET
    tableId=@tableId, items=@items, status=@status, totalPrice=@totalPrice,
    createdAt=@createdAt, extra=@extra
`);
const stmtUpdateStatusWithExtra = db.prepare('UPDATE orders SET status=@status, extra=@extra WHERE id=@id');
const stmtUpdateItemsWithExtra = db.prepare('UPDATE orders SET items=@items, status=@status, extra=@extra WHERE id=@id');
const stmtGetActive = db.prepare(`SELECT * FROM orders WHERE status IN (${OPEN_DB_STATUSES.map(() => '?').join(',')}) ORDER BY createdAt DESC`);
const stmtGetPreparing = db.prepare(`SELECT * FROM orders WHERE status IN (${ACTIVE_DB_STATUSES.map(() => '?').join(',')}) ORDER BY createdAt DESC`);
const stmtGetAll = db.prepare("SELECT * FROM orders WHERE status!='cancelled' ORDER BY createdAt DESC");
const stmtGetByStatus = db.prepare('SELECT * FROM orders WHERE status=? ORDER BY createdAt DESC');
const stmtGetActivePaged = db.prepare(`SELECT * FROM orders WHERE status IN (${OPEN_DB_STATUSES.map(() => '?').join(',')}) ORDER BY createdAt DESC LIMIT ? OFFSET ?`);
const stmtGetPreparingPaged = db.prepare(`SELECT * FROM orders WHERE status IN (${ACTIVE_DB_STATUSES.map(() => '?').join(',')}) ORDER BY createdAt DESC LIMIT ? OFFSET ?`);
const stmtGetAllPaged = db.prepare("SELECT * FROM orders WHERE status!='cancelled' ORDER BY createdAt DESC LIMIT ? OFFSET ?");
const stmtGetByStatusPaged = db.prepare('SELECT * FROM orders WHERE status=? ORDER BY createdAt DESC LIMIT ? OFFSET ?');
const stmtGetByCreatedRange = db.prepare("SELECT * FROM orders WHERE status!='cancelled' AND createdAt>=? AND createdAt<? ORDER BY createdAt DESC LIMIT ? OFFSET ?");
const stmtGetByStatusCreatedRange = db.prepare('SELECT * FROM orders WHERE status=? AND createdAt>=? AND createdAt<? ORDER BY createdAt DESC LIMIT ? OFFSET ?');
const stmtGetActiveCreatedRange = db.prepare(`SELECT * FROM orders WHERE status IN (${OPEN_DB_STATUSES.map(() => '?').join(',')}) AND createdAt>=? AND createdAt<? ORDER BY createdAt DESC LIMIT ? OFFSET ?`);
const stmtGetPreparingCreatedRange = db.prepare(`SELECT * FROM orders WHERE status IN (${ACTIVE_DB_STATUSES.map(() => '?').join(',')}) AND createdAt>=? AND createdAt<? ORDER BY createdAt DESC LIMIT ? OFFSET ?`);
const stmtGetById = db.prepare('SELECT * FROM orders WHERE id=?');
const stmtGetByTableActive = db.prepare(`SELECT * FROM orders WHERE tableId=? AND status IN (${OPEN_DB_STATUSES.map(() => '?').join(',')}) ORDER BY createdAt DESC`);
const stmtSoftDeleteOrder = db.prepare("UPDATE orders SET status='cancelled', extra=@extra WHERE id=@id");
const stmtCountByCreatedAtRange = db.prepare('SELECT COUNT(*) AS cnt FROM orders WHERE createdAt>=? AND createdAt<?');
const stmtHasOrderId = db.prepare('SELECT 1 AS ok FROM orders WHERE id=? LIMIT 1');

const stmtGetAllUsers = db.prepare('SELECT * FROM users ORDER BY id');
const stmtGetUserById = db.prepare('SELECT * FROM users WHERE id=?');
const stmtInsertUser = db.prepare('INSERT INTO users (id,name,username,password,roles) VALUES (@id,@name,@username,@password,@roles)');
const stmtUpdateUser = db.prepare('UPDATE users SET name=@name, username=@username, password=@password, roles=@roles WHERE id=@id');
const stmtDeleteUser = db.prepare('DELETE FROM users WHERE id=?');

const stmtGetAllMenu = db.prepare('SELECT * FROM menu ORDER BY sort, id');
const stmtGetMenuById = db.prepare('SELECT * FROM menu WHERE id=?');
const stmtInsertMenu = db.prepare('INSERT INTO menu (id,name,station,category,price,desc,recipe,available,options,sort,imageUrl,isSignature) VALUES (@id,@name,@station,@category,@price,@desc,@recipe,@available,@options,@sort,@imageUrl,@isSignature)');
const stmtUpdateMenu = db.prepare('UPDATE menu SET name=@name, station=@station, category=@category, price=@price, desc=@desc, recipe=@recipe, available=@available, options=@options, sort=@sort, imageUrl=@imageUrl, isSignature=@isSignature WHERE id=@id');
const stmtDeleteMenu = db.prepare('DELETE FROM menu WHERE id=?');

const stmtGetAllCats = db.prepare('SELECT * FROM categories ORDER BY sort, id');
const stmtReplaceCats = db.transaction((cats) => {
  db.prepare('DELETE FROM categories').run();
  const ins = db.prepare('INSERT INTO categories (name,sort) VALUES (?,?)');
  cats.forEach((name,i) => ins.run(name,i));
});
const stmtGetAllSettings = db.prepare('SELECT key,value,updatedAt FROM settings ORDER BY key');
const stmtGetSetting = db.prepare('SELECT key,value,updatedAt FROM settings WHERE key=?');
const stmtUpsertSetting = db.prepare('INSERT INTO settings (key,value,updatedAt) VALUES (@key,@value,@updatedAt) ON CONFLICT(key) DO UPDATE SET value=@value, updatedAt=@updatedAt');
const stmtGetDashboardRowsFrom = db.prepare(`SELECT id,tableId,items,status,totalPrice,createdAt,extra FROM orders WHERE createdAt>=? AND status IN (${DASHBOARD_DB_STATUSES.map(() => '?').join(',')})`);
const stmtGetDashboardRowsRange = db.prepare(`SELECT id,tableId,items,status,totalPrice,createdAt,extra FROM orders WHERE createdAt>=? AND createdAt<? AND status IN (${DASHBOARD_DB_STATUSES.map(() => '?').join(',')})`);
const stmtGetCommissionRowsRange = db.prepare(`SELECT id,tableId,items,status,totalPrice,createdAt,extra FROM orders WHERE createdAt>=? AND createdAt<? AND status IN (${COMMISSION_DB_STATUSES.map(() => '?').join(',')})`);
const stmtGetReportByDay = db.prepare('SELECT * FROM daily_reports WHERE day=?');
const stmtGetReportsFrom = db.prepare('SELECT * FROM daily_reports WHERE startAt>=? ORDER BY startAt');
const stmtGetAllReports = db.prepare('SELECT * FROM daily_reports ORDER BY startAt');
const stmtUpsertDailyReport = db.prepare(`
  INSERT INTO daily_reports (day,startAt,endAt,summary,hourly,topItems,categoryBreakdown,payMethodBreakdown,orderCount,revenue,updatedAt)
  VALUES (@day,@startAt,@endAt,@summary,@hourly,@topItems,@categoryBreakdown,@payMethodBreakdown,@orderCount,@revenue,@updatedAt)
  ON CONFLICT(day) DO UPDATE SET
    startAt=@startAt, endAt=@endAt, summary=@summary, hourly=@hourly,
    topItems=@topItems, categoryBreakdown=@categoryBreakdown, payMethodBreakdown=@payMethodBreakdown,
    orderCount=@orderCount, revenue=@revenue, updatedAt=@updatedAt
`);



const statements = {
  stmtInsert,
  stmtUpsertOrder,
  stmtUpdateStatusWithExtra,
  stmtUpdateItemsWithExtra,
  stmtGetActive,
  stmtGetPreparing,
  stmtGetAll,
  stmtGetByStatus,
  stmtGetActivePaged,
  stmtGetPreparingPaged,
  stmtGetAllPaged,
  stmtGetByStatusPaged,
  stmtGetByCreatedRange,
  stmtGetByStatusCreatedRange,
  stmtGetActiveCreatedRange,
  stmtGetPreparingCreatedRange,
  stmtGetById,
  stmtGetByTableActive,
  stmtSoftDeleteOrder,
  stmtCountByCreatedAtRange,
  stmtHasOrderId,
  stmtGetAllUsers,
  stmtGetUserById,
  stmtInsertUser,
  stmtUpdateUser,
  stmtDeleteUser,
  stmtGetAllMenu,
  stmtGetMenuById,
  stmtInsertMenu,
  stmtUpdateMenu,
  stmtDeleteMenu,
  stmtGetAllCats,
  stmtReplaceCats,
  stmtGetAllSettings,
  stmtGetSetting,
  stmtUpsertSetting,
  stmtGetDashboardRowsFrom,
  stmtGetDashboardRowsRange,
  stmtGetCommissionRowsRange,
  stmtGetReportByDay,
  stmtGetReportsFrom,
  stmtGetAllReports,
  stmtUpsertDailyReport,
};

module.exports = {
  PORT,
  db,
  statements,
  paths: { DB_DIR, DB_FILE, UPLOAD_ROOT, MENU_UPLOAD_DIR },
  constants: {
    DEFAULT_STATION_THRESHOLDS,
    DEFAULT_TABLE_IDS,
    RESERVED_TABLE_IDS,
    COMMISSION_ROLES,
    MENU_IMAGE_MIME_EXT,
    MAX_MENU_IMAGE_BYTES,
    ACTIVE_DB_STATUSES,
    OPEN_DB_STATUSES,
    DASHBOARD_DB_STATUSES,
    COMMISSION_DB_STATUSES,
  },
};
