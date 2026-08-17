#!/bin/bash
set -euo pipefail
echo "GODZ POS EC2 helper — Ubuntu 22.04"

sudo apt update && sudo apt install -y git curl build-essential nginx redis-server

if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

if ! command -v mongod >/dev/null; then
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
  echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
  sudo apt update && sudo apt install -y mongodb-org
  sudo systemctl enable --now mongod
fi

sudo systemctl enable --now redis-server
sudo npm i -g pm2
echo "Base ready. See DEPLOY-EC2.md"

