# Extra: Script de despliegue del dashboard

## Objetivo
Desplegar el dashboard con un solo comando: `dashboard`.

## Problema

Para actualizar el dashboard habia que ejecutar 4 comandos manualmente:

```bash
scp ~/dashboard-server.js soltecsis@10.160.218.20:/tmp/
scp ~/dashboard-index.html soltecsis@10.160.218.20:/tmp/
ssh wiki "sudo mv /tmp/dashboard-server.js /opt/miapi/server.js && sudo mv /tmp/dashboard-index.html /var/www/dashboard/index.html"
ssh wiki "sudo systemctl restart miapi"
```

Facil de equivocarse y de olvidar algun paso.

## Solucion: scripts/deploy-dashboard.sh

```bash
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
```

## Que hace cada paso

| Paso | Accion | Descripcion |
|------|--------|-------------|
| 1/3 | `scp` a /tmp | Sube los dos ficheros al servidor (a /tmp porque no hay permisos directos) |
| 2/3 | `sudo mv` | Mueve los ficheros a su destino final (/opt/miapi y /var/www/dashboard) |
| 3/3 | `systemctl restart` | Reinicia la API para que cargue el nuevo server.js |

!!! note "El HTML no necesita reinicio"
    El `index.html` se sirve directamente por Nginx, asi que los cambios de frontend se ven solo con refrescar el navegador. El reinicio de miapi solo es necesario cuando se modifica `server.js`.

## Alias

En `~/.bashrc`:
```bash
alias dashboard="/home/danny/formacion-danny/scripts/deploy-dashboard.sh"
```

## Ficheros locales

El dashboard se edita en el PC local y se despliega al servidor:

| Fichero local | Destino en servidor | Funcion |
|---------------|-------------------|---------|
| ~/dashboard-server.js | /opt/miapi/server.js | API Express (backend) |
| ~/dashboard-index.html | /var/www/dashboard/index.html | Panel web (frontend) |

## Uso

```bash
dashboard
```

## Comparacion con el deploy de la wiki

| | Wiki | Dashboard |
|--|------|-----------|
| Comando | `wiki` | `dashboard` |
| Ficheros | docs/*.md (muchos) | 2 ficheros (server.js + index.html) |
| Build local | Si (mkdocs build) | No |
| Reinicio servicio | No | Si (miapi) |
| Destino | /var/www/wiki | /opt/miapi + /var/www/dashboard |

## Resultado
- Dashboard desplegable con un solo comando
- Valida que los ficheros existen antes de subir
- Sube via /tmp para evitar problemas de permisos
- Reinicia la API automaticamente
