# Entregable Semana 8 - Modulo 5: Bases de datos

## Resumen

Modulo 5 completo (PostgreSQL y MariaDB). Esta semana cubre instalacion, configuracion, SQL basico, backups y restauracion de ambos SGBD relacionales. El entregable es el [Ejercicio 5.1: Inventario de servidores](ejercicio-5.1-inventario.md).

| Dia | Contenido | Estado | Documento |
|-----|-----------|--------|-----------|
| 1-2 | Instalacion PostgreSQL 17, cluster, usuarios, pg_hba.conf y postgresql.conf | Completado | [teoria-postgresql](teoria-postgresql.md) |
| 3 | SQL basico: CREATE TABLE, INSERT, SELECT, UPDATE, DELETE | Completado | [teoria-postgresql](teoria-postgresql.md#sql-basico) |
| 4 | Backups y restauracion con pg_dump, pg_restore, script + cron | Completado | [teoria-postgresql](teoria-postgresql.md#backups-y-restauracion) |
| 5 | MariaDB 11: instalacion, mariadb-secure-installation, SQL, mysqldump | Completado | [teoria-mariadb](teoria-mariadb.md) |
| - | Ejercicio 5.1: inventario de servidores (entregable) | Completado | [ejercicio-5.1](ejercicio-5.1-inventario.md) |

## Objetivo del modulo

Gestionar bases de datos PostgreSQL y MariaDB en entornos de produccion: instalacion, configuracion de acceso, consultas SQL, backups y restauracion.

## Entorno de laboratorio

| Equipo | IP | SO | Rol en esta semana |
|--------|----|----|-----|
| cliente1 (VM 1002) | 10.160.218.20 | Debian 13 Trixie | Host PostgreSQL 17 |
| PC anfitrion | - | Linux | Cliente psql via tunel SSH |

## Particularidades

### Cluster inicial incompleto

Tras `apt install postgresql`, el instalador reporto *"Configuring already existing cluster"* y al conectar con `sudo -u postgres psql` la base de datos `postgres` no existia (solo estaba `template1`). Era un cluster previo corrupto en `/var/lib/postgresql/17/main`.

Solucion: recrear el cluster desde cero.

```bash
sudo pg_dropcluster 17 main --stop
sudo pg_createcluster 17 main --start --locale=es_ES.UTF-8
```

Tras esto, las tres bases por defecto (`postgres`, `template0`, `template1`) aparecen como cabe esperar.

### PostgreSQL 17 vs el doc del curso

El doc del curso referencia rutas con `/etc/postgresql/16/main/`. En Debian 13 Trixie la version candidata es **PostgreSQL 17**, por lo que las rutas reales son `/etc/postgresql/17/main/`. El resto (comandos, sintaxis SQL) es identico.

### Metodo de autenticacion md5 con passwords scram-sha-256

El doc pide `md5` en `pg_hba.conf` pero PG17 almacena passwords con `scram-sha-256` por defecto. No es problema: en pg_hba.conf el valor `md5` actua como wrapper de compatibilidad y acepta ambos formatos (md5 y scram). Si en el futuro se quiere endurecer, se cambia a `scram-sha-256` directamente.

## Resumen de comandos aprendidos

```bash
# Gestion del cluster
pg_lsclusters
sudo pg_dropcluster 17 main --stop
sudo pg_createcluster 17 main --start --locale=es_ES.UTF-8
sudo systemctl restart postgresql

# Conexion
sudo -u postgres psql                                 # como superusuario via peer auth
psql -h 127.0.0.1 -U danny -d practicas               # como usuario via TCP/md5

# Dentro de psql
\l           # listar bases de datos
\dt          # listar tablas
\d tabla     # ver estructura de una tabla
\du          # listar roles
\conninfo    # info de la conexion actual
\pset pager off
\q           # salir
```

## Estado al cierre de la semana

**PostgreSQL 17**

- Escuchando en `0.0.0.0:5432`
- Usuario `danny` con password almacenado como scram-sha-256
- Base de datos `practicas` con owner `danny`
- Tabla `servidores` con 4 filas de prueba (web01 en mantenimiento, resto activos)
- Acceso permitido desde `127.0.0.1/32`, `::1/128` y la red `10.160.0.0/16` con autenticacion `md5`
- Backups diarios automatizados a `/backup/` mediante `/usr/local/bin/backup-practicas.sh` y `/etc/cron.d/backup-practicas` (rotacion de 7 dias)
- Credenciales para cron en `/root/.pgpass` (modo 600)

**MariaDB 11.8**

- Escuchando en `127.0.0.1:3306` (solo localhost, default de Debian)
- `mariadb-secure-installation` aplicado: sin anonimos, root local-only, sin BD test
- Usuario `'danny'@'localhost'` y BD `practicas_mysql`
- Tabla `servidores` replicada con `INT AUTO_INCREMENT` y `VARCHAR(45)` para IP (MariaDB no tiene `INET` nativo)
- Backup manual en `~/postgres-backups/backup_practicas_mysql.sql` con `mysqldump`

**Ejercicio 5.1 (entregable)**

- BD `inventario` con 3 tablas relacionadas (servidores, servicios, incidencias)
- Seed con 6 servidores, 14 servicios, 7 incidencias (4 abiertas/en_proceso, 3 cerradas)
- Scripts SQL versionados en `configs/sql/inventario/` (01-schema, 02-seed, 03-consultas)
- Script de backup `/usr/local/bin/backup-inventario.sh` con cron a las 03:15
- Doc completo con las 3 consultas obligatorias + extras en [ejercicio-5.1](ejercicio-5.1-inventario.md)

Detalles tecnicos y comandos completos en [teoria-postgresql.md](teoria-postgresql.md).
