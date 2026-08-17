# GODZ POS — Deploy on AWS EC2

## 1) EC2 setup

- Ubuntu 22.04 LTS
- Security group: open **22** (SSH), **80**, **443**, **3001** (optional if reverse proxy)
- Elastic IP recommended

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential nginx

# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MongoDB 7
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod

# Redis (optional)
sudo apt install -y redis-server
sudo systemctl enable --now redis-server
```

## 2) App

```bash
cd /opt
sudo git clone https://github.com/YOUR_USER/cafe-pos.git
sudo chown -R $USER:$USER /opt/cafe-pos
cd /opt/cafe-pos

cp .env.example backend/.env
nano backend/.env
```

Set at least:

```
PORT=3001
NODE_ENV=production
MONGO_URI=mongodb://127.0.0.1:27017/godz_pos
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=PUT_A_LONG_RANDOM_SECRET_HERE
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://YOUR_DOMAIN_OR_IP
```

```bash
cd backend && npm ci --omit=dev
cd ../frontend && npm ci && npm run build
# copy dist into backend for single-host serve
mkdir -p ../backend/frontend
cp -r dist ../backend/frontend/dist

cd ../backend
node seed.js   # first time only
```

## 3) Process manager (PM2)

```bash
sudo npm i -g pm2
cd /opt/cafe-pos/backend
pm2 start server.js --name godz-pos
pm2 save
pm2 startup
```

## 4) Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/godz-pos
```

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/godz-pos /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Optional SSL:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

## 5) After deploy — Kashier tokens

Plug real payment keys into backend pay-gateway handlers when you have them.

