#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker non trovato. Installa Docker prima di continuare." >&2
  exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose non trovato. Installa Docker Compose prima di continuare." >&2
  exit 1
fi

echo "[1/2] Arresto stack e rimozione container + immagini del progetto..."
docker compose down --remove-orphans --rmi local

echo "[2/2] Avvio stack..."
docker compose up --build
