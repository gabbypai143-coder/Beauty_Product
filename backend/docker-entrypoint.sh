#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "[backend-entrypoint] Synchronizing database schema with Prisma..."
  for i in $(seq 1 15); do
    if npx prisma db push --skip-generate; then
      echo "[backend-entrypoint] Database schema synchronized successfully."
      break
    else
      echo "[backend-entrypoint] Database not ready yet, retrying in 3 seconds ($i/15)..."
      sleep 3
    fi
  done
fi

exec "$@"
