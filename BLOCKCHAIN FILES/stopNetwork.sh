#!/bin/bash

echo "🛑 Bringing down additional peer containers..."
docker rm -f peer1.org1.example.com peer1.org2.example.com 2>/dev/null || true

echo "🧹 Removing additional peer volumes..."
docker volume rm -f docker_peer1.org1.example.com docker_peer1.org2.example.com 2>/dev/null || true

echo "🛑 Stopping the main network..."
./network.sh down

echo "✅ Network completely stopped and cleaned."
