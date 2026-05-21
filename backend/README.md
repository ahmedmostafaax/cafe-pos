# POS 后端部署指南

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 启动服务（生产）
npm start

# 3. 开发模式（自动重启，需 Node ≥ 18.11）
npm run dev
```

服务启动后监听 `0.0.0.0:3001`，局域网设备可通过 `http://localhost:3001` 访问。

---

## SQLite 文件持久化说明

### 默认路径

数据库默认存放在项目目录下的 `data/pos.db`：

```
cafe-pos-demo-backend/
├── server.js
├── package.json
└── data/
    └── pos.db          ← 自动创建
```

### 自定义路径（推荐生产环境使用）

通过环境变量 `DB_PATH` 指定数据目录：

```bash
# 例如存放到 /opt/cafe-pos-demo/data/ 下
DB_PATH=/opt/cafe-pos-demo/data node server.js
```

### 1Panel 部署建议

在 1Panel 中创建 Node.js 应用时：

1. **项目路径**：将 `server.js` 和 `package.json` 放到 `/opt/cafe-pos-demo/` 目录
2. **数据持久化**：设置环境变量 `DB_PATH=/opt/cafe-pos-demo/data`，确保该目录不会在应用重启时被清除
3. **启动命令**：`npm start`
4. **端口**：填写 `3001`

如果使用 Docker 部署，挂载数据卷：

```bash
docker run -d \
  -p 3001:3001 \
  -v /opt/cafe-pos-demo/data:/app/data \
  -e DB_PATH=/app/data \
  cafe-pos-demo-backend
```

### WAL 模式说明

程序启用了 SQLite 的 WAL (Write-Ahead Logging) 模式，会在 `pos.db` 旁边生成两个辅助文件：

```
data/
├── pos.db
├── pos.db-wal      ← WAL 日志
└── pos.db-shm      ← 共享内存索引
```

**备份时必须同时复制这三个文件**，否则可能丢失最近写入的数据。

---

## Socket.io 事件协议

### 客户端 → 服务端

| 事件名           | 数据格式                                      | 说明                   |
|------------------|-----------------------------------------------|------------------------|
| `get_initial_data` | 无参数                                       | 请求当前所有活跃订单   |
| `new_order`      | `{ id, tableNo, items, total, status, ... }`  | 提交新订单             |
| `update_status`  | `{ id, status }`                              | 更新订单状态           |
| `update_items`   | `{ id, items, status }`                       | 更新订单菜品明细       |

### 服务端 → 客户端

| 事件名           | 数据格式                          | 说明                       |
|------------------|-----------------------------------|----------------------------|
| `initial_data`   | `{ orders: [...] }`              | 返回所有活跃订单           |
| `order_created`  | `{ id, tableNo, items, ... }`    | 广播新订单（所有客户端）   |
| `order_updated`  | `{ id, tableNo, items, ... }`    | 广播订单更新（所有客户端） |
| `error`          | `{ message, detail }`           | 错误信息（仅发送给当事人） |

### 状态映射

前端使用 `preparing / archived`，数据库存储 `active / archived`。服务端会自动做双向转换，前端无需关心。

---

## REST 接口（备用）

| 方法   | 路径                          | 说明               |
|--------|-------------------------------|--------------------|
| GET    | `/api/health`                 | 健康检查           |
| GET    | `/api/orders`                 | 所有订单           |
| GET    | `/api/orders?status=active`   | 按状态筛选         |
| GET    | `/api/orders/table/:tableId`  | 按桌号查询活跃订单 |
| GET    | `/api/orders/:id`             | 查询单个订单       |

---

## 前端接入示例

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

// 连接成功后获取初始数据
socket.on('connect', () => {
  socket.emit('get_initial_data');
});

// 接收初始数据
socket.on('initial_data', ({ orders }) => {
  console.log('当前活跃订单：', orders);
});

// 监听新订单广播
socket.on('order_created', (order) => {
  console.log('新订单：', order);
});

// 监听订单更新广播
socket.on('order_updated', (order) => {
  console.log('订单已更新：', order);
});

// 提交新订单
socket.emit('new_order', {
  id: 'ORD-005',
  tableNo: '3',
  items: [{ menuId: 1, name: '红烧肉', station: 'kitchen', price: 68, qty: 1, status: 'pending' }],
  total: 68,
  status: 'preparing',
  createdAt: Date.now(),
  guests: 2,
  dineIn: true,
  payMethod: '微信',
  discount: 1,
});

// 更新订单状态
socket.emit('update_status', { id: 'ORD-005', status: 'archived' });
```
