#!/bin/bash

set -e

PROJECT_DIR="/root/MadCamp/Madmon"
BACKEND_DIR="$PROJECT_DIR/main"

echo "======================================"
echo " MadMon Backend Deploy"
echo "======================================"

cd "$PROJECT_DIR"

echo "[1/5] Pull latest source..."
git pull origin main

echo "[2/5] Move to backend..."
cd "$BACKEND_DIR"

echo "[3/5] Build..."
chmod +x gradlew
./gradlew build

echo "[4/5] Restart service..."
sudo systemctl restart madmon-backend

echo "[5/5] Check service..."
sudo systemctl --no-pager status madmon-backend

echo
echo "✅ Backend Deploy Complete!"