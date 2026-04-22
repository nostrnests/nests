#!/bin/bash
# Start the MoQ development stack without Docker.
#
# Prerequisites:
#   - Rust/cargo installed
#   - Node.js installed
#   - OpenSSL installed (for cert generation)
#
# This script runs:
#   1. moq-relay (compiled from source via cargo)
#   2. moq-auth (our NIP-98 -> JWT service)
#   3. NestsUI-v2 dev server (Vite)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Generate certs if needed
if [ ! -f "$SCRIPT_DIR/certs/fullchain.pem" ]; then
  echo "==> Generating TLS certificates..."
  "$SCRIPT_DIR/generate-certs.sh"
fi

CERT_FILE="$SCRIPT_DIR/certs/fullchain.pem"
KEY_FILE="$SCRIPT_DIR/certs/privkey.pem"

# Install moq-relay if not already installed
if ! command -v moq-relay &>/dev/null; then
  echo "==> Installing moq-relay via cargo (this may take a few minutes)..."
  cargo install moq-relay
fi

echo "==> Starting moq-auth on port 8090..."
cd "$PROJECT_DIR/moq-auth"
npm run build 2>/dev/null
PORT=8090 node dist/index.js &
MOQ_AUTH_PID=$!

# Wait for moq-auth to start
sleep 2

echo "==> Starting moq-relay on port 4443..."
moq-relay \
  --tls-cert "$CERT_FILE" \
  --tls-key "$KEY_FILE" \
  --bind 0.0.0.0:4443 \
  --auth-key "http://localhost:8090/.well-known/jwks.json" \
  --auth-refresh-interval 30 &
MOQ_RELAY_PID=$!

echo "==> Starting Vite dev server..."
cd "$PROJECT_DIR/NestsUI-v2"
npm run dev &
VITE_PID=$!

echo ""
echo "============================================"
echo "  MoQ Nests Dev Stack Running"
echo "============================================"
echo "  moq-relay:  https://localhost:4443"
echo "  moq-auth:   http://localhost:8090"
echo "  UI (Vite):  http://localhost:5173"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

# Cleanup on exit
cleanup() {
  echo "Shutting down..."
  kill $MOQ_AUTH_PID 2>/dev/null
  kill $MOQ_RELAY_PID 2>/dev/null
  kill $VITE_PID 2>/dev/null
  wait
}

trap cleanup EXIT INT TERM

# Wait for any child to exit
wait
