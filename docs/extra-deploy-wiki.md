# Extra: Script de despliegue de la wiki

## Objetivo
Desplegar la wiki con un solo comando: `wiki`.

## Script (scripts/deploy-wiki.sh)

```bash
#!/bin/bash
set -euo pipefail

SERVIDOR="soltecsis@10.160.218.20"
REPO_DIR="/home/danny/formacion-danny"
REMOTE_PATH="/var/www/wiki"

echo "=== Desplegando wiki ==="

echo "[1/3] Generando sitio con mkdocs..."
cd "$REPO_DIR"
mkdocs build --quiet

echo "[2/3] Subiendo al servidor..."
scp -r site/ "$SERVIDOR:/tmp/wiki"

echo "[3/3] Activando en Nginx..."
ssh "$SERVIDOR" "sudo rm -rf $REMOTE_PATH && sudo mv /tmp/wiki $REMOTE_PATH"

echo "=== Wiki desplegada en http://wiki.practicas.local ==="
```

## Alias

En `~/.bashrc`:
```bash
alias wiki="/home/danny/formacion-danny/scripts/deploy-wiki.sh"
```

## Uso

```bash
wiki
```

Genera el sitio con mkdocs, lo sube por SCP y lo activa en Nginx en un solo paso.

!!! tip "Mejora tonta"
    Si quieres un cierre solemne, pipea el último echo por `cowsay`: `echo "Wiki desplegada" | cowsay`. La vaca certifica el despliegue.
