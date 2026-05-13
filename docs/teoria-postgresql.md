# Teoria - PostgreSQL

## Objetivo
Entender los conceptos fundamentales de PostgreSQL como sistema gestor de bases de datos relacionales, el modelo de roles y autenticacion, la configuracion del servicio en Debian y el uso de SQL para crear, consultar y mantener datos.

## Por que PostgreSQL

PostgreSQL es un SGBD relacional libre, maduro (desarrollo continuo desde 1996) y con soporte para caracteristicas avanzadas: transacciones ACID, MVCC, indices GIN/GiST, replicacion, JSON nativo, tipos de datos extensibles. Comparado con MariaDB / MySQL en el mismo escenario:

| Caracteristica | PostgreSQL | MariaDB / MySQL |
|---|---|---|
| Licencia | PostgreSQL License (BSD-like) | GPL (MariaDB) / GPL+EE (MySQL) |
| Motor por defecto | Unico | InnoDB / Aria / MyISAM... |
| MVCC | Si (snapshot por tx) | Si (en InnoDB) |
| JSON | `jsonb` indexable | JSON funcional |
| Tipos de datos | Muchos (INET, ARRAY, RANGE...) | Tradicionales |
| Procedimientos | PL/pgSQL, Python, Perl... | PL/SQL, stored procedures |
| Escalado lectura | Replicas streaming | Replicas master-slave |

Para este lab se elige PostgreSQL porque el doc del curso lo pide y porque encaja con el resto del stack (en el ejercicio 4.4 ya se uso postgres:16 en Docker para el backend del API).

## Conceptos clave

### Cluster
En PostgreSQL un *cluster* no es un grupo de servidores: es **una instancia del servicio** corriendo sobre un directorio de datos (`PGDATA`). Un cluster contiene varias bases de datos, comparte usuarios (roles), parametros globales (`postgresql.conf`) y reglas de acceso (`pg_hba.conf`).

En Debian se pueden gestionar varios clusters con `pg_lsclusters`, `pg_createcluster` y `pg_dropcluster`. En este lab solo hay uno: version `17`, nombre `main`.

### Base de datos
Contenedor logico dentro del cluster. Cada conexion se asocia a una base de datos. Tres bases existen siempre por defecto:

- **postgres**: base administrativa por defecto, ideal para conectar sin tener que crear nada
- **template0**: plantilla "limpia" inmutable, sirve para hacer `CREATE DATABASE ... TEMPLATE template0`
- **template1**: plantilla por defecto al hacer `CREATE DATABASE` (lo que pongas aqui se hereda en las nuevas BDs)

### Schema
Espacio de nombres dentro de una base de datos. El schema por defecto es `public`. Una misma BD puede tener varios schemas (`public`, `auth`, `metrics`...).

**Importante (cambio en PG15+)**: antes, cualquier usuario podia crear objetos en `public`. Desde PG15, solo el dueño del schema puede crear. Si el usuario es el dueño de la base de datos pero no del schema, el `CREATE TABLE` puede fallar con `permission denied for schema public`. En este lab no se ha dado porque al crear `practicas OWNER danny` el schema `public` quedo accesible para danny.

### Rol (role / user)
Un *rol* es un usuario o un grupo (PostgreSQL unifica ambos conceptos). Los roles tienen atributos como `LOGIN`, `SUPERUSER`, `CREATEDB`, etc. y password opcional.

```sql
CREATE USER danny WITH PASSWORD 'segura';     -- alias de CREATE ROLE ... LOGIN
GRANT ALL PRIVILEGES ON DATABASE practicas TO danny;
ALTER USER danny WITH CREATEDB;
DROP USER danny;
```

### Autenticacion (pg_hba.conf)
El fichero `pg_hba.conf` define **quien puede conectar y como**. Cada linea tiene la forma:

```
TYPE  DATABASE  USER  ADDRESS         METHOD
```

- **TYPE**: `local` (socket Unix), `host` (TCP), `hostssl`, `hostnossl`
- **DATABASE**: `all`, nombre concreto, o lista
- **USER**: `all`, nombre concreto, o lista
- **ADDRESS**: CIDR (`127.0.0.1/32`, `10.160.0.0/16`) - solo para `host*`
- **METHOD**: `trust`, `peer`, `md5`, `scram-sha-256`, `reject`, ...

Las lineas se evaluan **en orden** y la primera que casa decide. `peer` mapea el usuario del sistema operativo al rol PostgreSQL (es lo que permite `sudo -u postgres psql`). `md5` y `scram-sha-256` piden contraseña.

### MVCC (Multi-Version Concurrency Control)
Una sentencia `SELECT` ve un *snapshot* consistente de la base. Los `UPDATE` y `DELETE` no sobreescriben filas: crean nuevas versiones y marcan las antiguas como obsoletas. Esto evita bloqueos entre lectores y escritores. El proceso `VACUUM` (automatico via `autovacuum`) limpia las versiones obsoletas.

## Arquitectura (Debian)

```
+---------------------------------------+
|  Cliente (psql, app, pgAdmin)         |
+---------------------------------------+
        | socket Unix /var/run/postgresql/.s.PGSQL.5432
        | o TCP 0.0.0.0:5432
+---------------------------------------+
|  postgres (proceso principal)         |
|   - autovacuum launcher               |
|   - background writer                 |
|   - WAL writer                        |
|   - checkpointer                      |
|   - workers por conexion (1 por sesion)|
+---------------------------------------+
        |
+---------------------------------------+
|  /var/lib/postgresql/17/main          |
|   - base/      datos por BD           |
|   - global/    catalogo global        |
|   - pg_wal/    write-ahead logs       |
+---------------------------------------+
```

### Layout en Debian

| Ruta | Contenido |
|---|---|
| `/etc/postgresql/17/main/` | Config: `postgresql.conf`, `pg_hba.conf`, `pg_ident.conf` |
| `/var/lib/postgresql/17/main/` | Datos del cluster |
| `/var/log/postgresql/postgresql-17-main.log` | Logs |
| `/usr/lib/postgresql/17/bin/` | Binarios (`postgres`, `pg_dump`, ...) |

## Instalacion en cliente1

```bash
sudo apt update
sudo apt install -y postgresql postgresql-client
sudo systemctl enable --now postgresql
```

Si el cluster recien creado quedo incompleto (caso real en este lab), se recrea limpio:

```bash
sudo pg_dropcluster 17 main --stop
sudo pg_createcluster 17 main --start --locale=es_ES.UTF-8
```

Verificacion:

```bash
pg_lsclusters
sudo -u postgres psql -c "\l"   # postgres, template0, template1
```

## Creacion de usuario y base de datos

```bash
sudo -u postgres psql
```

```sql
CREATE USER danny WITH PASSWORD '_Zataca2026_';
CREATE DATABASE practicas OWNER danny;
GRANT ALL PRIVILEGES ON DATABASE practicas TO danny;
\q
```

Prueba de conexion desde la red (no via socket):

```bash
psql -h 127.0.0.1 -U danny -d practicas
```

## Configuracion de acceso

### pg_hba.conf

Estado final tras el doc (`/etc/postgresql/17/main/pg_hba.conf`):

```
local   all   postgres                peer
local   all   all                     peer
host    all   all   127.0.0.1/32      md5
host    all   all   ::1/128           md5
host    all   all   10.160.0.0/16     md5
local   replication   all             peer
host    replication   all   127.0.0.1/32   scram-sha-256
host    replication   all   ::1/128        scram-sha-256
```

Cambios respecto al default de Debian:

- Las dos lineas `host all all` cambian de `scram-sha-256` a `md5` (PG17 acepta md5 como wrapper compatible con scram, por lo que sigue funcionando con la password real almacenada como scram).
- Nueva linea para la red del lab: `host all all 10.160.0.0/16 md5`.

### postgresql.conf

```ini
listen_addresses = '*'      # antes: '#listen_addresses = 'localhost''
port = 5432
max_connections = 100
```

Cambiar `listen_addresses` requiere `systemctl restart postgresql` (no basta con `reload`).

Verificacion de que escucha en todas las interfaces:

```bash
sudo ss -tlnp | grep 5432
# LISTEN 0 200 0.0.0.0:5432 ...
# LISTEN 0 200 [::]:5432 ...
```

## SQL basico

### CREATE TABLE
```sql
CREATE TABLE servidores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ip INET NOT NULL,
    os VARCHAR(50),
    ram_gb INTEGER,
    estado VARCHAR(20) DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT NOW()
);
```

Tipos usados:

- `SERIAL`: entero autoincremental (alias de `INTEGER` + `SEQUENCE` + `DEFAULT nextval(...)`)
- `VARCHAR(n)`: cadena de longitud variable, max n
- `INET`: tipo nativo para direcciones IPv4/IPv6 con validacion
- `INTEGER`, `TIMESTAMP`: tipos estandar
- `DEFAULT NOW()`: valor por defecto evaluado en cada INSERT

### INSERT
```sql
INSERT INTO servidores (nombre, ip, os, ram_gb) VALUES
  ('web01',  '10.160.132.10', 'Debian 12',  8),
  ('web02',  '10.160.132.11', 'Debian 12',  4),
  ('db01',   '10.160.132.20', 'Debian 13', 16),
  ('cache1', '10.160.132.30', 'Ubuntu 22',  2);
```

Columnas no listadas (id, estado, created_at) toman su `DEFAULT`.

### SELECT
```sql
SELECT * FROM servidores WHERE estado = 'activo';
SELECT nombre, ip FROM servidores WHERE ram_gb > 4 ORDER BY nombre;
SELECT os, COUNT(*) FROM servidores GROUP BY os;
```

- `WHERE` filtra filas
- `ORDER BY` ordena el resultado
- `GROUP BY` + funcion agregada (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) consolida por grupos

### UPDATE
```sql
UPDATE servidores SET estado = 'mantenimiento' WHERE nombre = 'web01';
```

Sin `WHERE`, el `UPDATE` afecta a **todas** las filas. Conviene probar primero la clausula con un `SELECT` equivalente.

### DELETE
```sql
DELETE FROM servidores WHERE estado = 'inactivo';
```

Misma advertencia: sin `WHERE`, vacia la tabla. Para *vaciar* una tabla explicitamente es mas rapido `TRUNCATE servidores;`.

## Backups y restauracion

PostgreSQL ofrece tres herramientas para volcar datos, cada una con su caso de uso:

| Herramienta | Genera | Restaura con | Ambito |
|---|---|---|---|
| `pg_dump` | SQL plano (`.sql`) | `psql < archivo.sql` | Una BD |
| `pg_dump -Fc` | Formato custom (`.dump`, binario) | `pg_restore archivo.dump` | Una BD |
| `pg_dumpall` | SQL plano con `CREATE DATABASE` y roles | `psql -f archivo.sql` | Cluster entero |

### Volcado manual

```bash
# SQL plano (legible, util para debug o migrar entre versiones)
pg_dump -h 127.0.0.1 -U danny practicas > backup_practicas.sql

# Formato custom (binario, comprimido, soporta restore parcial)
pg_dump -h 127.0.0.1 -U danny -Fc practicas > backup_practicas.dump

# Cluster entero (incluye roles, tablespaces, configuracion global)
sudo -u postgres pg_dumpall > backup_all.sql
```

### Restauracion

```bash
# Desde SQL plano: psql lo ejecuta linea a linea
psql -h 127.0.0.1 -U danny -d practicas < backup_practicas.sql

# Desde dump custom: pg_restore puede restaurar selectivamente
pg_restore -h 127.0.0.1 -U danny -d practicas backup_practicas.dump

# Solo una tabla
pg_restore -t servidores -d practicas backup_practicas.dump

# Listar contenido sin restaurar
pg_restore -l backup_practicas.dump
```

### Automatizacion con cron

Para que `pg_dump` no pida password en cron, se usa el fichero `~/.pgpass` con permisos `600`. Formato `host:port:db:user:password`:

```bash
echo "127.0.0.1:5432:practicas:danny:_Zataca2026_" > /root/.pgpass
chmod 600 /root/.pgpass
```

Script `/usr/local/bin/backup-practicas.sh`:

```bash
#!/bin/bash
FECHA=$(date +%Y%m%d_%H%M)
pg_dump -h 127.0.0.1 -U danny practicas | gzip > /backup/practicas_${FECHA}.sql.gz
find /backup -name "*.sql.gz" -mtime +7 -delete
```

Las dos lineas hacen:

1. Dump comprimido con nombre fechado (no machaca ejecuciones anteriores)
2. Rotacion: borra ficheros `.sql.gz` con mtime mayor de 7 dias

Entrada en `/etc/cron.d/backup-practicas` (preferible a `crontab -e` porque queda como fichero auditable):

```
# Backup diario de la BD practicas a las 03:00
0 3 * * * root /usr/local/bin/backup-practicas.sh
```

Verificacion:

```bash
sudo systemctl status cron               # cron corriendo
sudo /usr/local/bin/backup-practicas.sh  # ejecucion manual
ls -lh /backup/                          # ver backups acumulados
```

### Buenas practicas

- **No restauracion en produccion sin probar**: un backup que no se ha restaurado nunca es teorico. Conviene hacer una prueba periodica de restore en una BD aparte.
- **Verificar la integridad**: `gunzip -t practicas_*.sql.gz` confirma que el gzip no esta corrupto.
- **Almacenar fuera del host**: el cron de este lab guarda en `/backup/` local. En produccion habria que enviarlo tambien a otro servidor o storage externo (S3, rsync a un NAS, etc.).
- **Cifrado en reposo**: si los dumps tienen datos sensibles, cifrar con `gpg` o `age` antes de almacenar.

## Comandos psql utiles

```
\l           listar bases de datos
\c bd        conectar a otra base
\dt          listar tablas del schema actual
\dt+         ... con tamaño y descripcion
\d tabla     estructura de la tabla
\du          listar roles
\conninfo    info de la conexion
\timing on   mostrar tiempo de cada query
\pset pager off    desactivar el pager (less)
\x           toggle expanded display (util en filas anchas)
\q           salir
```

## Particularidad del lab

- **Sin VT-x**: en cliente1 el `pg_isready` puede decir *"ready"* unos segundos antes de aceptar consultas reales. En scripts conviene combinar `pg_isready` con un `psql -c "SELECT 1"` para confirmar.
- **Acceso desde el PC anfitrion**: por `ssh wiki -L 15432:127.0.0.1:5432` se puede usar `psql -h 127.0.0.1 -p 15432 -U danny -d practicas` desde el PC. Aun no configurado en este lab, pendiente para Dia 4 si se quiere automatizar backups desde el anfitrion.
