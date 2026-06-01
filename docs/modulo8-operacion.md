# Modulo 8 - Guia de operacion

Operacion diaria del stack Wiki.js: arranque/parada, backups, restauracion,
monitorizacion y mantenimiento. Para incidencias concretas, ver
[troubleshooting](modulo8-troubleshooting.md).

## Comandos del dia a dia

Todos desde `/opt/wikijs` y como usuario `danny` (esta en el grupo `docker`,
no hace falta `sudo`):

```bash
cd /opt/wikijs

docker-compose ps                  # estado de los 3 contenedores
docker-compose logs -f wiki        # logs en vivo del wiki
docker-compose restart wiki        # reiniciar un servicio
docker-compose up -d               # levantar (idempotente)
docker-compose down                # parar conservando volumenes
docker-compose down -v             # DESTRUCTIVO: borra BD y uploads
```

!!! danger "down -v"
    `docker-compose down -v` elimina los volumenes `wikijs_db_data` y
    `wikijs_wiki_data`: se pierde toda la wiki. No usarlo salvo para empezar de
    cero a proposito.

## Backups

### Que se respalda

| Pieza | Como | Fichero generado |
|---|---|---|
| Base de datos | `pg_dump` via `docker exec wikijs-db` | `db-AAAAMMDD-HHMM.sql.gz` |
| Datos del wiki | `tar` de `/wiki/data` via `docker exec wikijs-app` | `wiki_data-AAAAMMDD-HHMM.tar.gz` |

Ambos en `/opt/wikijs/backups/`. El script
[`backup-wikijs.sh`](https://github.com/DannyRuizB/wikijs-zataca/blob/main/scripts/backup-wikijs.sh):

1. Vuelca la BD (las credenciales se leen **dentro** del contenedor, no del
   `.env`).
2. Empaqueta `/wiki/data` desde dentro del contenedor `wikijs-app` (asi no
   necesita descargar ninguna imagen auxiliar, dado el DNS bloqueado).
3. Borra copias con mas de **7 dias** (retencion).
4. Escribe en `backup.log`.

### Backup manual

```bash
/opt/wikijs/backups/backup-wikijs.sh
tail /opt/wikijs/backups/backup.log
```

Salida tipica:

```
2026-06-01 08:52:25  === Inicio backup (20260601-0852) ===
2026-06-01 08:52:27  BD   OK -> db-20260601-0852.sql.gz (60K)
2026-06-01 08:52:28  WIKI OK -> wiki_data-20260601-0852.tar.gz (16K)
2026-06-01 08:52:28  Retencion: 0 fichero(s) con mas de 7 dias eliminado(s)
2026-06-01 08:52:28  === Backup completado ===
```

### Backup automatico (cron)

```cron
# crontab -l (usuario danny)
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 3 * * * /opt/wikijs/backups/backup-wikijs.sh >/dev/null 2>>/opt/wikijs/backups/backup.log
*/5 * * * * /opt/wikijs/backups/monitor-wikijs.sh >/dev/null 2>>/opt/wikijs/backups/monitor.log
```

Backup diario a las **03:30** (no solapa con los de cliente1, que van a 03:00 y
03:15). Retencion de 7 dias gestionada por el propio script.

## Restauracion

### Verificar un backup sin tocar produccion

Antes de confiar en un backup, conviene probar que restaura. Se hace contra una
base de datos **temporal**, sin afectar a la wiki en marcha:

```bash
cd /opt/wikijs/backups
DUMP=$(ls -1t db-*.sql.gz | head -1)

# 1. crear BD temporal
docker exec wikijs-db sh -c 'createdb -U "$POSTGRES_USER" wiki_restore_test'

# 2. restaurar el dump ahi
zcat "$DUMP" | docker exec -i wikijs-db sh -c 'psql -q -U "$POSTGRES_USER" -d wiki_restore_test'

# 3. comprobar contenido
docker exec wikijs-db sh -c 'psql -U "$POSTGRES_USER" -d wiki_restore_test -t -c "SELECT count(*) FROM pages;"'

# 4. limpiar
docker exec wikijs-db sh -c 'dropdb -U "$POSTGRES_USER" wiki_restore_test'
```

!!! success "Prueba realizada"
    Probado el 1 jun 2026: el dump restauro 1 pagina y 2 usuarios en la BD
    temporal, que despues se elimino. Produccion intacta.

### Restauracion real (recuperacion ante desastre)

!!! danger "Destructivo sobre la base actual"
    El dump incluye `--clean --if-exists`: al restaurar sobre la BD de
    produccion, elimina y recrea los objetos. Hacer solo en recuperacion real.

```bash
cd /opt/wikijs/backups

# Base de datos
zcat db-AAAAMMDD-HHMM.sql.gz \
  | docker exec -i wikijs-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

# Datos del wiki (uploads/content)
zcat wiki_data-AAAAMMDD-HHMM.tar.gz \
  | docker exec -i wikijs-app tar xzf - -C /wiki/data

# Reiniciar el wiki para que recargue
docker-compose restart wiki
```

## Monitorizacion

El script
[`monitor-wikijs.sh`](https://github.com/DannyRuizB/wikijs-zataca/blob/main/scripts/monitor-wikijs.sh)
corre por cron cada 5 minutos. Comprueba que los tres contenedores esten
`running` y, los que tienen healthcheck, `healthy`. **Solo** escribe en
`monitor.log` cuando hay un problema (no inunda el log de "OK"), y **no
reinicia** nada para no enmascarar fallos.

```bash
# ejecucion manual
/opt/wikijs/backups/monitor-wikijs.sh; echo "exit=$?"     # 0 = todo sano

# revisar alertas
tail /opt/wikijs/backups/monitor.log
```

Ejemplo de alerta (capturada al parar nginx en una prueba):

```
2026-06-01 09:02:02  ALERTA  wikijs-nginx  estado=exited  salud=sin-healthcheck
```

## Reset de la contrasenya del admin

Si se pierde la password del administrador, el repo incluye
[`reset-pass.sh`](https://github.com/DannyRuizB/wikijs-zataca/blob/main/scripts/reset-pass.sh):

```bash
cd /ruta/al/repo/wikijs-zataca
./scripts/reset-pass.sh                 # pide email y password por teclado
./scripts/reset-pass.sh admin@ejemplo   # o pasa el email como argumento
```

Regenera el hash bcrypt dentro del contenedor del wiki y lo aplica a la BD.
Valida que el usuario existe antes de tocar nada y exige confirmar la password.

## Mantenimiento

| Tarea | Comando |
|---|---|
| Ver uso de disco | `df -h /` (el monitor del boceto avisaba al 80%). |
| Espacio de los backups | `du -sh /opt/wikijs/backups` |
| Ver imagenes cargadas | `docker images` |
| Ver estado de Fail2Ban | `sudo fail2ban-client status sshd` |
| Ver reglas UFW | `sudo ufw status numbered` |
| Actualizar el wiki (futuro) | cargar nueva imagen `requarks/wiki:2` por `docker save/load` y `docker-compose up -d` |
