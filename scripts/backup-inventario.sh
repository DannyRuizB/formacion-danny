#!/bin/bash
# Ejercicio 5.1 - Backup automatico de la BD "inventario"
# Destino: cliente1 (PostgreSQL 17), instalar en /usr/local/bin/
# Cron: ejemplo en /etc/cron.d/backup-inventario
#
# Requiere /root/.pgpass con la entrada:
#   127.0.0.1:5432:inventario:danny:<password>
# y permisos 600.
#
# Genera backups comprimidos en /backup/ con rotacion de 7 dias.

set -eu
set -o pipefail

DB_HOST="127.0.0.1"
DB_USER="danny"
DB_NAME="inventario"
DEST_DIR="/backup"
RETAIN_DAYS=7
FECHA=$(date +%Y%m%d_%H%M)
FICHERO="${DEST_DIR}/inventario_${FECHA}.sql.gz"

mkdir -p "$DEST_DIR"

# Volcado comprimido. set -o pipefail garantiza que un fallo de pg_dump aborte.
pg_dump -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" | gzip > "$FICHERO"

# Rotacion: borra ficheros con mtime mayor a RETAIN_DAYS dias
find "$DEST_DIR" -name "inventario_*.sql.gz" -mtime +"$RETAIN_DAYS" -delete

echo "Backup OK: $FICHERO ($(du -h "$FICHERO" | cut -f1))"
