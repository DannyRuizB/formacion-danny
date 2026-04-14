#!/bin/bash
set -euo pipefail

LOG="/var/log/monitor.log"
UMBRAL_DISCO=80

echo "=== Monitor $(date) ===" >> "$LOG"

# Disco
USO_DISCO=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$USO_DISCO" -gt "$UMBRAL_DISCO" ]; then
    echo "ALERTA: Disco al ${USO_DISCO}%" >> "$LOG"
else
    echo "OK: Disco al ${USO_DISCO}%" >> "$LOG"
fi

# Memoria
free -h | head -2 >> "$LOG"

# Servicios
for svc in nginx ssh cron; do
    if systemctl is-active --quiet "$svc"; then
        echo "OK: $svc activo" >> "$LOG"
    else
        echo "ALERTA: $svc caido" >> "$LOG"
    fi
done

echo "---" >> "$LOG"
