# Ejercicio 5.1 - Inventario de servidores

## Objetivo
Diseñar y poblar una base de datos relacional para gestionar un inventario de servidores, los servicios que corren en cada uno y las incidencias asociadas. Configurar un backup automatico con `cron` y dejar todo en scripts versionables.

## Entregables

| Pieza | Ruta en el repo |
|---|---|
| Script SQL de creacion (DDL) | [`configs/sql/inventario/01-schema.sql`](https://github.com/) |
| Script SQL con datos ficticios | [`configs/sql/inventario/02-seed.sql`](https://github.com/) |
| Script SQL con consultas | [`configs/sql/inventario/03-consultas.sql`](https://github.com/) |
| Script de backup | [`scripts/backup-inventario.sh`](https://github.com/) |
| Documento con consultas | este fichero |

## Entorno

| Recurso | Valor |
|---|---|
| Host | cliente1 (10.160.218.20) |
| SGBD | PostgreSQL 17.9 |
| Base de datos | `inventario` |
| Owner | `danny` |
| Conexion | `psql -h 127.0.0.1 -U danny -d inventario` |

## Diseño del esquema

Tres tablas con dos relaciones 1:N (un servidor tiene muchos servicios y muchas incidencias).

```
                     servidores
                     ----------
                      id PK
                      nombre UNIQUE
                      ip INET
                      os
                      ram_gb
                      cpu_cores
                      estado (activo|mantenimiento|inactivo)
                      ubicacion
                      created_at
                          |
                          | 1:N
              +-----------+-----------+
              |                       |
        servicios               incidencias
        ---------               -----------
         id PK                   id PK
         servidor_id FK          servidor_id FK
         nombre                  titulo
         puerto                  descripcion
         protocolo (tcp|udp)     severidad (baja..critica)
         estado                  estado (abierta|en_proceso|cerrada)
                                 abierta_en
                                 cerrada_en NULL
```

### Decisiones de diseño

- **Tipo `INET` para IP**: PostgreSQL valida el formato y permite consultas con operadores especificos (`<<`, `>>`). Equivalente en MariaDB seria `VARCHAR(45)`, sin validacion.
- **`CHECK` constraints en `estado` y `severidad`**: documentan los valores validos en el propio schema. Si en el futuro se quiere ampliar, se hace con `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT ...`.
- **`ON DELETE CASCADE` en las FK**: si se borra un servidor, sus servicios e incidencias se eliminan automaticamente. Razonable para un inventario; en un sistema productivo se preferiria un *soft delete*.
- **Coherencia entre `estado='cerrada'` y `cerrada_en`**: un `CHECK` a nivel de tabla garantiza que las incidencias cerradas tienen fecha de cierre y las abiertas no.
- **Indices**: `idx_servicios_servidor`, `idx_incidencias_servidor` y `idx_incidencias_estado` para acelerar las consultas tipicas (servicios de un servidor, listar abiertas).
- **`SELECT id FROM servidores WHERE nombre=...` en los INSERTs del seed**: hace el seed independiente de los IDs asignados por la `SERIAL`, lo que permite reaplicar el seed sobre un schema recien recreado sin romper las FKs.

## Aplicar el esquema

```bash
# Crear la BD (como superuser)
sudo -u postgres psql -c "CREATE DATABASE inventario OWNER danny;"

# Aplicar schema + seed
psql -h 127.0.0.1 -U danny -d inventario -f configs/sql/inventario/01-schema.sql
psql -h 127.0.0.1 -U danny -d inventario -f configs/sql/inventario/02-seed.sql
```

Si ya esta aplicado y se quiere repoblar, el `01-schema.sql` empieza con `DROP TABLE IF EXISTS ... CASCADE` de las tres tablas, asi que se puede reejecutar sin pasos manuales.

## Consultas obligatorias y resultados

Los resultados que se muestran corresponden a la ejecucion sobre el seed proporcionado (6 servidores, 14 servicios, 7 incidencias).

### 1. Servidores activos

```sql
SELECT id, nombre, ip, os, ram_gb, cpu_cores, ubicacion
  FROM servidores
 WHERE estado = 'activo'
 ORDER BY nombre;
```

```
 id | nombre |      ip       |      os      | ram_gb | cpu_cores | ubicacion
----+--------+---------------+--------------+--------+-----------+-----------
  5 | cache1 | 10.160.132.30 | Ubuntu 22.04 |      2 |         2 | rack-c
  3 | db01   | 10.160.132.20 | Debian 13    |     16 |         8 | rack-b
  1 | web01  | 10.160.132.10 | Debian 12    |      8 |         4 | rack-a
  2 | web02  | 10.160.132.11 | Debian 12    |      4 |         2 | rack-a
(4 filas)
```

### 2. Servicios por servidor

Dos vistas: resumen agregado y detalle completo.

```sql
SELECT s.nombre        AS servidor,
       COUNT(sv.id)    AS total_servicios,
       COUNT(*) FILTER (WHERE sv.estado = 'activo')   AS activos,
       COUNT(*) FILTER (WHERE sv.estado = 'detenido') AS detenidos
  FROM servidores s
  LEFT JOIN servicios sv ON sv.servidor_id = s.id
 GROUP BY s.nombre
 ORDER BY s.nombre;
```

```
 servidor | total_servicios | activos | detenidos
----------+-----------------+---------+-----------
 backup1  |               1 |       0 |         1
 cache1   |               2 |       2 |         0
 db01     |               3 |       3 |         0
 db02     |               2 |       1 |         1
 web01    |               3 |       3 |         0
 web02    |               3 |       2 |         1
(6 filas)
```

Detalle servicio a servicio:

```sql
SELECT s.nombre        AS servidor,
       sv.nombre       AS servicio,
       sv.puerto,
       sv.protocolo,
       sv.estado
  FROM servidores s
  JOIN servicios sv ON sv.servidor_id = s.id
 ORDER BY s.nombre, sv.puerto;
```

```
 servidor | servicio | puerto | protocolo |  estado
----------+----------+--------+-----------+----------
 backup1  | ssh      |     22 | tcp       | detenido
 cache1   | ssh      |     22 | tcp       | activo
 cache1   | redis    |   6379 | tcp       | activo
 db01     | ssh      |     22 | tcp       | activo
 db01     | mariadb  |   3306 | tcp       | activo
 db01     | postgres |   5432 | tcp       | activo
 db02     | ssh      |     22 | tcp       | activo
 db02     | postgres |   5432 | tcp       | detenido
 web01    | ssh      |     22 | tcp       | activo
 web01    | nginx    |     80 | tcp       | activo
 web01    | nginx    |    443 | tcp       | activo
 web02    | ssh      |     22 | tcp       | activo
 web02    | nginx    |     80 | tcp       | activo
 web02    | nginx    |    443 | tcp       | detenido
(14 filas)
```

### 3. Incidencias abiertas

Se incluyen los estados `abierta` y `en_proceso` (las cerradas se filtran). Ordenadas por severidad (critica → baja) y, dentro de cada nivel, por antiguedad.

```sql
SELECT i.id,
       s.nombre        AS servidor,
       i.titulo,
       i.severidad,
       i.estado,
       i.abierta_en,
       NOW() - i.abierta_en AS tiempo_abierta
  FROM incidencias i
  JOIN servidores s ON s.id = i.servidor_id
 WHERE i.estado IN ('abierta', 'en_proceso')
 ORDER BY CASE i.severidad
            WHEN 'critica' THEN 1
            WHEN 'alta'    THEN 2
            WHEN 'media'   THEN 3
            WHEN 'baja'    THEN 4
          END,
          i.abierta_en;
```

```
 id | servidor |               titulo               | severidad |   estado   |         abierta_en         |     tiempo_abierta
----+----------+------------------------------------+-----------+------------+----------------------------+------------------------
  1 | web02    | HTTPS caido                        | alta      | abierta    | 2026-05-13 09:48:19.802902 | 02:04:40.415926
  2 | db02     | Actualizacion PostgreSQL pendiente | media     | en_proceso | 2026-05-12 11:48:19.802902 | 1 day 00:04:40.415926
  3 | web01    | Uso de CPU elevado                 | media     | abierta    | 2026-05-13 05:48:19.802902 | 06:04:40.415926
  4 | cache1   | Memoria casi llena                 | baja      | abierta    | 2026-05-10 11:48:19.802902 | 3 days 00:04:40.415926
(4 filas)
```

## Consultas extra

### Resumen por estado de servidor

```sql
SELECT estado, COUNT(*) AS total
  FROM servidores
 GROUP BY estado
 ORDER BY total DESC;
```

```
    estado     | total
---------------+-------
 activo        |     4
 mantenimiento |     1
 inactivo      |     1
(3 filas)
```

### Servidores con incidencias abiertas

```sql
SELECT s.nombre, s.ip, COUNT(i.id) AS incidencias_abiertas
  FROM servidores s
  JOIN incidencias i ON i.servidor_id = s.id
 WHERE i.estado IN ('abierta', 'en_proceso')
 GROUP BY s.nombre, s.ip
 ORDER BY incidencias_abiertas DESC;
```

```
 nombre |      ip       | incidencias_abiertas
--------+---------------+----------------------
 cache1 | 10.160.132.30 |                    1
 db02   | 10.160.132.21 |                    1
 web01  | 10.160.132.10 |                    1
 web02  | 10.160.132.11 |                    1
(4 filas)
```

### Tiempo medio de resolucion

```sql
SELECT severidad,
       COUNT(*) AS total,
       AVG(cerrada_en - abierta_en) AS tiempo_medio_resolucion
  FROM incidencias
 WHERE estado = 'cerrada'
 GROUP BY severidad
 ORDER BY total DESC;
```

```
 severidad | total | tiempo_medio_resolucion
-----------+-------+-------------------------
 alta      |     1 | 00:00:00
 critica   |     1 | 1 day
 media     |     1 | 2 days
(3 filas)
```

## Backup automatico

### Script `/usr/local/bin/backup-inventario.sh`

```bash
#!/bin/bash
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
pg_dump -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" | gzip > "$FICHERO"
find "$DEST_DIR" -name "inventario_*.sql.gz" -mtime +"$RETAIN_DAYS" -delete

echo "Backup OK: $FICHERO ($(du -h "$FICHERO" | cut -f1))"
```

Diferencias respecto al script del Dia 4:

- Usa `set -eu` + `pipefail` para que un fallo de `pg_dump` aborte el script.
- Centraliza la BD, usuario y retencion en variables al inicio.
- El nombre de los ficheros lleva prefijo `inventario_` para no mezclarse con los de `practicas_`.
- Imprime el tamaño del backup en stdout (queda registrado en el log del cron).

### Credenciales (`/root/.pgpass`)

```
127.0.0.1:5432:practicas:danny:_Zataca2026_
127.0.0.1:5432:inventario:danny:_Zataca2026_
```

Permisos 600, owner root. Una linea por BD.

### Cron (`/etc/cron.d/backup-inventario`)

```
# Backup diario de la BD inventario a las 03:15
15 3 * * * root /usr/local/bin/backup-inventario.sh
```

Se programa a las 03:15 para no solapar con el de `practicas` (03:00). En produccion se podria escalonar mas si hubiera mas BDs o monitorizar la duracion para ajustar.

### Verificacion

```bash
sudo /usr/local/bin/backup-inventario.sh   # ejecucion manual
ls -lh /backup/inventario_*.sql.gz         # listar backups
gunzip -t /backup/inventario_*.sql.gz      # verificar integridad gzip
```

Para restaurar:

```bash
# Crear BD vacia (si no existe)
sudo -u postgres psql -c "CREATE DATABASE inventario_test OWNER danny;"

# Restaurar
gunzip -c /backup/inventario_*.sql.gz | psql -h 127.0.0.1 -U danny -d inventario_test
```

## Conclusiones del ejercicio

- El uso de `CHECK` constraints y `FOREIGN KEY ... ON DELETE CASCADE` permite expresar reglas de negocio en el propio esquema, en vez de delegarlas a la aplicacion.
- El tipo `INET` de PostgreSQL aporta validacion y consultas espaciales (`<<`, `>>`) que en MariaDB requieren funciones manuales.
- `COUNT(*) FILTER (WHERE ...)` es una sintaxis SQL estandar muy comoda para sustituir `CASE WHEN ... END` dentro de agregados.
- El backup automatico se beneficia mucho del fichero `~/.pgpass`: una sola linea por BD evita pasar passwords en argumentos o variables de entorno.
- Mantener los SQL como scripts versionados (no como dumps) hace el entregable reproducible: cualquiera puede clonar el repo y reconstruir la BD desde cero con dos `psql -f`.
