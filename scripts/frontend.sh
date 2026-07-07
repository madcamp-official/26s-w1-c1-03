#!/bin/bash

set -e

PROJECT_DIR="/root/MadCamp/Madmon"
FRONTEND_DIR="$PROJECT_DIR/front/Team_Evaluation_Platform"
DEPLOY_DIR="/var/www/madmon"

echo "======================================"
echo " MadMon Frontend Deploy"
echo "======================================"

cd "$PROJECT_DIR"

echo "[1/6] Pull latest source..."
git pull origin restart

echo "[2/6] Move to frontend..."
cd "$FRONTEND_DIR"

echo "[3/6] Install packages..."
npm install

echo "[4/6] Build..."
npm run build

echo "[5/6] Deploy..."
sudo rm -rf "$DEPLOY_DIR"/*
sudo cp -r dist/* "$DEPLOY_DIR"

echo "[6/6] Reload nginx..."
sudo systemctl reload nginx

echo
echo "✅ Frontend Deploy Complete!"