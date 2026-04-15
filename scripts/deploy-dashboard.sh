#!/bin/bash
set -euo pipefail

SERVIDOR="soltecsis@10.160.218.20"
API_LOCAL="$HOME/dashboard-server.js"
HTML_LOCAL="$HOME/dashboard-index.html"
API_REMOTE="/opt/miapi/server.js"
HTML_REMOTE="/var/www/dashboard/index.html"

echo "=== Desplegando dashboard ==="

# Verificar que los ficheros existen
if [ ! -f "$API_LOCAL" ]; then
    echo "Error: no se encuentra $API_LOCAL"
    exit 1
fi
if [ ! -f "$HTML_LOCAL" ]; then
    echo "Error: no se encuentra $HTML_LOCAL"
    exit 1
fi

echo "[1/3] Subiendo ficheros al servidor..."
scp "$API_LOCAL" "$SERVIDOR:/tmp/dashboard-server.js"
scp "$HTML_LOCAL" "$SERVIDOR:/tmp/dashboard-index.html"

echo "[2/3] Moviendo a destino..."
ssh "$SERVIDOR" "sudo mv /tmp/dashboard-server.js $API_REMOTE && sudo mv /tmp/dashboard-index.html $HTML_REMOTE"

echo "[3/3] Reiniciando API..."
ssh "$SERVIDOR" "sudo systemctl restart miapi"

echo "=== Dashboard desplegado en http://dashboard.practicas.local ==="
