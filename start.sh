#!/bin/bash
echo "============================================"
echo "  ResultBondhu - রেজাল্ট বন্ধু"
echo "  HSC Grade Management System"
echo "============================================"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker not found. Install Docker first."
    exit 1
fi

echo "[1/3] Starting PostgreSQL..."
docker-compose up -d db
sleep 5

echo "[2/3] Starting FastAPI backend..."
docker-compose up -d backend
sleep 3

echo "[3/3] Starting React frontend..."
docker-compose up -d frontend

echo ""
echo "============================================"
echo "  ✅ ResultBondhu is running!"
echo "  🌐 Open: http://localhost"
echo "  📧 Login: admin@resultbondhu.com"
echo "  🔑 Password: admin123"
echo "============================================"
