# Teoria - MariaDB / MySQL

## Objetivo
Conocer el otro gran SGBD relacional libre (MariaDB), entender las diferencias practicas con PostgreSQL y manejar las operaciones basicas: instalacion, autenticacion, SQL y backups con `mysqldump`.

## MariaDB vs MySQL

MariaDB es un fork de MySQL creado en 2009 por el autor original (Monty Widenius) tras la compra de MySQL por Oracle. Mantiene compatibilidad de protocolo y sintaxis pero diverge en algunos puntos (motores, optimizador, tipos). En Debian/Ubuntu, el paquete `mariadb-server` es el "MySQL" por defecto desde hace varios años.

Para la mayoria de operaciones diarias da igual cual uses: los comandos `mysql`, `mysqldump`, etc. existen en ambos. En MariaDB 11 los binarios oficiales son `mariadb`, `mariadb-dump`, `mariadb-secure-installation`; los nombres viejos (`mysql`, `mysqldump`, `mysql_secure_installation`) **ya no existen en MariaDB 11** salvo como compatibilidad opcional, asi que conviene aprender los nuevos.

## MariaDB vs PostgreSQL

| Concepto | PostgreSQL | MariaDB |
|---|---|---|
| Tipo entero autoincremental | `SERIAL`, `BIGSERIAL` | `INT AUTO_INCREMENT` |
| Tipo IP nativo | `INET`, `CIDR` (validado) | `VARCHAR(45)` (texto plano) |
| Funcion timestamp actual | `NOW()` | `CURRENT_TIMESTAMP` / `NOW()` |
| Listar bases | `\l` | `SHOW DATABASES;` |
| Listar tablas | `\dt` | `SHOW TABLES;` |
| Describir tabla | `\d tabla` | `DESCRIBE tabla;` |
| Listar usuarios | `\du` | `SELECT user, host FROM mysql.user;` |
| Salir del prompt | `\q` | `exit` / `quit` |
| Usuario | rol (1 nivel) | `'user'@'host'` (2 niveles) |
| Auth root nuevo | password local | `unix_socket` (root del SO = root SGBD) |
| Motor de almacenamiento | unico | varios (InnoDB, Aria, MyISAM, MEMORY...) |
| Backup binario | `pg_dump -Fc` | no nativo (siempre SQL) |
| Backup global | `pg_dumpall` | `mysqldump --all-databases` |
| Restore parcial | `pg_restore -t` | filtrar el `.sql` o `--tables` en dump |
| Fichero credenciales | `~/.pgpass` (600) | `~/.my.cnf` o `--defaults-extra-file` |

## Conceptos clave

### Usuario `'user'@'host'`
En MariaDB la identidad de usuario incluye **el host desde el que conecta**. `'danny'@'localhost'` y `'danny'@'%'` son dos cuentas distintas con privilegios independientes. El asterisco `%` significa cualquier host (acceso de red abierto, no recomendado sin firewall).

```sql
CREATE USER 'danny'@'localhost' IDENTIFIED BY '_Zataca2026_';
GRANT ALL ON practicas_mysql.* TO 'danny'@'localhost';
FLUSH PRIVILEGES;
```

`FLUSH PRIVILEGES` no siempre es necesario (cuando se usa `CREATE USER`/`GRANT` se aplica solo), pero esta en la guia historica y no hace daño ejecutarlo.

### Autenticacion unix_socket
En Debian, MariaDB configura el usuario `root` por defecto con plugin `unix_socket`: solo el usuario `root` del sistema operativo puede entrar como `root` SGBD, y lo hace **sin password**. Esto es por que `sudo mariadb` funciona sin pedir nada.

```bash
sudo mariadb         # entra como root SGBD via socket
mariadb -u root -p   # pediria password (que no hay) y fallaria
```

### Motores de almacenamiento
A diferencia de Postgres (motor unico), MariaDB permite elegir motor por tabla:

- **InnoDB** (default): transacciones ACID, row-level locking, foreign keys
- **Aria**: mejora de MyISAM con crash recovery
- **MEMORY**: tabla en RAM, se pierde al reiniciar
- **CSV**: tabla como fichero CSV

En la practica casi siempre se usa InnoDB.

## Instalacion en Debian 13

```bash
sudo apt install -y mariadb-server mariadb-client
sudo systemctl enable --now mariadb
sudo mariadb-secure-installation
```

`mariadb-secure-installation` pregunta varias cosas. Respuestas seguras para este lab:

| Pregunta | Respuesta |
|---|---|
| Enter current password for root | (vacio) |
| Switch to unix_socket authentication | Y |
| Change the root password? | n |
| Remove anonymous users? | Y |
| Disallow root login remotely? | Y |
| Remove test database? | Y |
| Reload privilege tables? | Y |

## Creacion de usuario y base de datos

```bash
sudo mariadb
```

```sql
CREATE USER 'danny'@'localhost' IDENTIFIED BY '_Zataca2026_';
CREATE DATABASE practicas_mysql;
GRANT ALL ON practicas_mysql.* TO 'danny'@'localhost';
FLUSH PRIVILEGES;
exit
```

Prueba de conexion:

```bash
mariadb -u danny -p practicas_mysql
```

## SQL basico (tabla servidores en MariaDB)

```sql
CREATE TABLE servidores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    os VARCHAR(50),
    ram_gb INT,
    estado VARCHAR(20) DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO servidores (nombre, ip, os, ram_gb) VALUES
  ('web01',  '10.160.132.10', 'Debian 12',  8),
  ('web02',  '10.160.132.11', 'Debian 12',  4),
  ('db01',   '10.160.132.20', 'Debian 13', 16),
  ('cache1', '10.160.132.30', 'Ubuntu 22',  2);

SHOW TABLES;
DESCRIBE servidores;
SELECT * FROM servidores WHERE estado = 'activo';
SELECT nombre, ip FROM servidores WHERE ram_gb > 4 ORDER BY nombre;
SELECT os, COUNT(*) FROM servidores GROUP BY os;
UPDATE servidores SET estado = 'mantenimiento' WHERE nombre = 'web01';
DELETE FROM servidores WHERE estado = 'inactivo';
```

Comportamiento equivalente a Postgres salvo:

- `int(11)` en `DESCRIBE`: el `11` es ancho de visualizacion historico, no afecta al rango
- `current_timestamp()` aparece con parentesis en la salida
- IP almacenada como `VARCHAR(45)`: no hay validacion automatica (45 = longitud max de IPv6 incluyendo mascara)

## Backups con `mysqldump`

```bash
# Backup de una BD
mysqldump -u danny -p practicas_mysql > backup_practicas_mysql.sql

# Backup de todas las BDs (necesita usuario con privilegios globales)
sudo mysqldump --all-databases > backup_all_mysql.sql

# Backup solo estructura (sin datos)
mysqldump -u danny -p --no-data practicas_mysql > schema.sql

# Backup solo datos (sin estructura)
mysqldump -u danny -p --no-create-info practicas_mysql > datos.sql

# Restaurar (es solo SQL plano)
mariadb -u danny -p practicas_mysql < backup_practicas_mysql.sql
```

### Credenciales sin interactividad

Para cron o scripts, lo correcto es `~/.my.cnf`:

```ini
[client]
user=danny
password=_Zataca2026_

[mysqldump]
user=danny
password=_Zataca2026_
```

```bash
chmod 600 ~/.my.cnf
mysqldump practicas_mysql > backup.sql   # ya no pide password
```

**No usar `-p<password>` pegado** salvo en pruebas: queda en `history` y se ve con `ps`.

## Comandos `mariadb` (cliente) utiles

```
SHOW DATABASES;
USE practicas_mysql;
SHOW TABLES;
DESCRIBE servidores;
SHOW CREATE TABLE servidores;   -- DDL completo
SHOW PROCESSLIST;               -- conexiones activas
SHOW STATUS;                    -- contadores del servidor
SHOW VARIABLES LIKE 'max_%';    -- variables de configuracion
\!  ls                          -- ejecutar comando shell desde el prompt
\W                              -- mostrar warnings tras cada query
quit;                           -- salir
```

## Particularidades de este lab

- **Puerto**: MariaDB escucha por defecto solo en `127.0.0.1:3306`. Para acceso de red habria que editar `bind-address` en `/etc/mysql/mariadb.conf.d/50-server.cnf` (no se ha hecho en este lab).
- **Renombrado de binarios**: `mysql_secure_installation` ya no existe en MariaDB 11; usar `mariadb-secure-installation`.
- **Coexistencia con PostgreSQL**: ambos servicios corren en cliente1 sin conflictos (puertos diferentes, recursos modestos).
