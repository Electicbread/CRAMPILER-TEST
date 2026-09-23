#!/usr/bin/env bash
# Starts the Spring Boot backend and the Vite frontend together.
# Ctrl+C stops both.

set -e

echo "Starting backend (Spring Boot) on :8080..."
(cd "$(dirname "$0")/backend" && mvn spring-boot:run) &
BACKEND_PID=$!

echo "Starting frontend (Vite) on :5173..."
(cd "$(dirname "$0")/frontend" && npm run dev) &
FRONTEND_PID=$!

trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM

wait
