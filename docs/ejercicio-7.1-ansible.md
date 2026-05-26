# Ejercicio 7.1 - Playbook Ansible (Nginx + PostgreSQL)

## Objetivo

Escribir un playbook Ansible que deje un servidor configurado con Nginx y PostgreSQL de forma idempotente y reproducible: instala paquetes, despliega una configuracion de Nginx parametrizada con Jinja2 y crea una base de datos con su usuario en PostgreSQL. Refactorizar el playbook en **roles** para mostrar la estructura estandar de un proyecto Ansible.

## Entregables

| Pieza | Ruta en el repo |
|---|---|
| Inventario | [`modulo7-ansible/inventory.ini`](https://github.com/) |
| Configuracion del proyecto | [`modulo7-ansible/ansible.cfg`](https://github.com/) |
| Playbook plano (Dia 2-3) | [`modulo7-ansible/setup-servidor.yml`](https://github.com/) |
| Playbook refactorizado a rol (Dia 4) | [`modulo7-ansible/site.yml`](https://github.com/) |
| Playbook del ejercicio | [`modulo7-ansible/ejercicio-7.1.yml`](https://github.com/) |
| Rol `webserver` | [`modulo7-ansible/roles/webserver/`](https://github.com/) |
| Rol `postgres` | [`modulo7-ansible/roles/postgres/`](https://github.com/) |
| Teoria del modulo | [teoria-ansible.md](teoria-ansible.md) |

## Entorno

| Recurso | Valor |
|---|---|
| Control node + target | cliente1 (10.160.218.20) |
| Ansible | 12.x (Debian 13, paquete `ansible`) |
| Python en el target | `/usr/bin/python3` |
| PostgreSQL existente | 17.9 (BDs `practicas` e `inventario`) |
| Nginx existente | 1.x sirviendo `miweb.practicas.local`, `wiki.practicas.local`, `dashboard.practicas.local` |
| Coleccion adicional | `community.postgresql` (incluida en el bundle `ansible 12.x`) |

`cliente1` es a la vez control node y nodo objetivo. Se declara con `ansible_connection=local` en el inventario para que Ansible no abra una conexion SSH contra si mismo.

## Decisiones de diseño

### Por que dos playbooks (`setup-servidor.yml` y `ejercicio-7.1.yml`)

El doc del curso pide primero un playbook con tasks + handlers + vars (Dia 2-3) y despues refactorizarlo en roles (Dia 4). Para mantener trazable el progreso del modulo:

- `setup-servidor.yml`: playbook **plano**, todas las tasks inline. Util para leer el flujo completo de arriba a abajo. Se conserva como referencia.
- `site.yml`: mismo objetivo que `setup-servidor.yml` pero usando el rol `webserver`. Demuestra que la salida es equivalente con la estructura refactorizada.
- `ejercicio-7.1.yml`: la entrega del ejercicio. Aplica **dos roles** (`webserver` + `postgres`) sobre `cliente1`, parametrizados via `vars:` del play.

### `defaults/` vs `vars:` del play

Cada rol define sus valores por defecto en `defaults/main.yml` (baja prioridad). El playbook del ejercicio sobreescribe los que tienen sentido cambiar por entorno:

```yaml
# ejercicio-7.1.yml
vars:
  domain: demoapp.practicas.local
  web_root: /var/www/demoapp
  db_name: demoapp
  db_user: demoapp
  db_password: "demo_{{ ansible_hostname }}_2026"
```

`db_password` se compone con la variable magica `ansible_hostname` para que cada host objetivo tenga su propia password. En produccion esto se sustituiria por `ansible-vault` y un fichero cifrado.

### Idempotencia y handlers

- **Paquetes**: `ansible.builtin.apt` con `state: present` solo instala si falta. Si ya esta, reporta `ok`.
- **UFW**: las reglas `community.general.ufw` no se aplican dos veces; si la regla existe, `ok`.
- **Template Nginx**: si el render del template Jinja2 coincide byte a byte con `/etc/nginx/sites-available/default`, el modulo no toca el fichero y el handler `Reiniciar Nginx` no se dispara. Evita reinicios innecesarios.
- **PostgreSQL**: `postgresql_db`, `postgresql_user` y `postgresql_privs` son idempotentes. La rule de `pg_hba.conf` se inserta con `blockinfile` y `marker:`, lo que la hace identificable y reaplicable sin duplicar.

### `service: state=reloaded` vs `restarted` para PostgreSQL

El handler de PostgreSQL hace `reloaded` (no `restarted`). Razon: las BDs `practicas` e `inventario` ya tienen conexiones productivas (cron de backups, dashboard de monitorizacion). Un `restart` cortaria las conexiones; `reload` basta para que PostgreSQL relea `pg_hba.conf` y `postgresql.conf` sin cerrar sesiones.

### `pg_hba.conf` con `blockinfile`

El fichero `pg_hba.conf` ya tiene reglas de los modulos previos (usuario `danny` con `scram-sha-256`). Modificarlo con `lineinfile` por rule seria fragil. `blockinfile` con un `marker` idempotente:

```yaml
- name: Permitir login local de {{ db_user }} en pg_hba.conf
  ansible.builtin.blockinfile:
    path: "{{ pg_hba_path }}"
    marker: "# {mark} ANSIBLE MANAGED demoapp rule"
    block: |
      local   {{ db_name }}   {{ db_user }}                              scram-sha-256
      host    {{ db_name }}   {{ db_user }}   127.0.0.1/32               scram-sha-256
    insertafter: '^# TYPE'
  notify: Recargar PostgreSQL
```

Resultado: el bloque se mete justo despues de la cabecera `# TYPE` con un marcador que permite reaplicarlo o quitarlo sin tocar lo demas.

## Estructura del proyecto

```
modulo7-ansible/
├── ansible.cfg
├── inventory.ini
├── setup-servidor.yml          # Dia 2-3: playbook plano
├── site.yml                    # Dia 4: refactor a rol
├── ejercicio-7.1.yml           # entrega del ejercicio
├── templates/
│   └── nginx.conf.j2           # usada por setup-servidor.yml (legacy)
└── roles/
    ├── webserver/
    │   ├── defaults/main.yml
    │   ├── tasks/main.yml
    │   ├── handlers/main.yml
    │   └── templates/nginx.conf.j2
    └── postgres/
        ├── defaults/main.yml
        ├── tasks/main.yml
        └── handlers/main.yml
```

## Inventario

```ini
[webservers]
cliente1 ansible_connection=local

[dbservers]
cliente1 ansible_connection=local

[clients]
cliente2 ansible_host=10.160.218.100 ansible_user=soltecsis

[all:vars]
ansible_python_interpreter=/usr/bin/python3
```

`cliente1` aparece en `webservers` y `dbservers` porque cumple los dos roles (Nginx y PostgreSQL). `cliente2` esta en `clients` para futuros playbooks que toquen la VM cliente.

## Roles

### Rol `webserver`

`roles/webserver/defaults/main.yml`:

```yaml
paquetes:
  - nginx
  - curl
  - htop
  - ufw

domain: demo.practicas.local
web_root: /var/www/html
```

`roles/webserver/tasks/main.yml` (resumen):

1. Update apt cache.
2. Instalar paquetes (`{{ paquetes }}`).
3. UFW: permitir 22/tcp.
4. UFW: permitir 80/tcp.
5. UFW: habilitar.
6. Template `nginx.conf.j2` a `/etc/nginx/sites-available/default` → notifica handler.

`roles/webserver/handlers/main.yml`:

```yaml
- name: Reiniciar Nginx
  ansible.builtin.service:
    name: nginx
    state: restarted
```

`roles/webserver/templates/nginx.conf.j2`:

```jinja
server {
    listen 80;
    server_name {{ domain }};
    root {{ web_root }};
}
```

### Rol `postgres`

`roles/postgres/defaults/main.yml`:

```yaml
db_name: demoapp
db_user: demoapp
db_password: cambia_esto_en_produccion
pg_hba_path: /etc/postgresql/17/main/pg_hba.conf
```

`roles/postgres/tasks/main.yml`:

1. Instalar `python3-psycopg2` (dependencia de `community.postgresql.*`).
2. `postgresql_db` → crear BD `{{ db_name }}` (peer auth via `postgres`).
3. `postgresql_user` → crear usuario `{{ db_user }}` con password.
4. `postgresql_privs` → `GRANT ALL PRIVILEGES` sobre `{{ db_name }}` a `{{ db_user }}`.
5. `blockinfile` → añadir reglas en `pg_hba.conf` con marcador idempotente → notifica handler.

`roles/postgres/handlers/main.yml`:

```yaml
- name: Recargar PostgreSQL
  ansible.builtin.service:
    name: postgresql
    state: reloaded
```

## Ejecucion

### Flujo de trabajo

El proyecto vive en el PC del alumno (`/home/danny/formacion-danny/modulo7-ansible/`) bajo control de git. Para ejecutarlo se sincroniza a cliente1 (donde esta instalado Ansible) y se lanza alli:

```bash
# En el PC: sincronizar
scp -r /home/danny/formacion-danny/modulo7-ansible/ wiki:/home/soltecsis/

# En cliente1
ssh wiki
sudo -i
cd /home/soltecsis/modulo7-ansible
```

### Verificacion inicial (Dia 1: comandos ad-hoc)

```bash
$ ansible --version
ansible [core 2.19.4]
  config file = /home/soltecsis/modulo7-ansible/ansible.cfg
  python version = 3.13.5
  jinja version = 3.1.6

$ ansible all -m ping
cliente1 | SUCCESS => {"changed": false, "ping": "pong"}
cliente2 | SUCCESS => {"changed": false, "ping": "pong"}
```

Cliente1 responde via `connection=local` y `cliente2` via SSH con la clave ya configurada en el Modulo 2.

### Dia 2-3: playbook plano

```bash
$ ansible-playbook setup-servidor.yml --check --diff
...
TASK [Copiar config Nginx (sites-available/default, demo)] ***
--- before: /etc/nginx/sites-available/default
+++ after: .../nginx.conf.j2
@@ -1,5 +1,5 @@
 server {
     listen 80;
-    server_name demoapp.practicas.local;
-    root /var/www/demoapp;
+    server_name demo.practicas.local;
+    root /var/www/html;
 }
changed: [cliente1]

RUNNING HANDLER [Reiniciar Nginx] ***
changed: [cliente1]

PLAY RECAP ***
cliente1                   : ok=8    changed=3    unreachable=0    failed=0
```

El diff muestra que el `/etc/nginx/sites-available/default` ya contenia `demoapp.practicas.local` (residuo de una ejecucion anterior del Ejercicio 7.1 en la misma sesion de pruebas). El playbook plano revierte el dominio a `demo.practicas.local` segun sus propias `vars:`.

### Dia 4: `site.yml` con rol

```bash
$ ansible-playbook site.yml --check --diff
...
PLAY RECAP ***
cliente1                   : ok=8    changed=3    unreachable=0    failed=0

$ ansible-playbook site.yml --diff
...
TASK [webserver : Copiar config Nginx (sites-available/default, demo)] ***
changed: [cliente1]

RUNNING HANDLER [webserver : Reiniciar Nginx] ***
changed: [cliente1]

PLAY RECAP ***
cliente1                   : ok=8    changed=3    unreachable=0    failed=0
```

Misma salida que `setup-servidor.yml` pero con las tasks prefijadas por `webserver :` (indicador de que vienen del rol). Comportamiento equivalente.

### Ejercicio 7.1: playbook completo

```bash
$ ansible-galaxy collection list | grep -i postgres
community.postgresql                     4.1.0

$ ansible-playbook ejercicio-7.1.yml --check --diff
...
TASK [webserver : Copiar config Nginx (sites-available/default, demo)] ***
--- before: /etc/nginx/sites-available/default
+++ after: .../nginx.conf.j2
@@ -1,5 +1,5 @@
 server {
     listen 80;
-    server_name demo.practicas.local;
-    root /var/www/html;
+    server_name demoapp.practicas.local;
+    root /var/www/demoapp;
 }
changed: [cliente1]

TASK [postgres : Instalar dependencia python para PostgreSQL] *** ok
TASK [postgres : Crear BD demoapp si no existe] *** ok
TASK [postgres : Crear usuario demoapp con password] *** ok
TASK [postgres : Conceder ALL PRIVILEGES de demoapp a demoapp] *** ok
TASK [postgres : Permitir login local de demoapp en pg_hba.conf] *** ok

RUNNING HANDLER [webserver : Reiniciar Nginx] *** changed

PLAY RECAP ***
cliente1                   : ok=13   changed=2    unreachable=0    failed=0
```

Nota: el `--check --diff` **no fallo** en las tareas de PostgreSQL como predeciamos en la teoria, porque `python3-psycopg2` ya estaba instalado en cliente1 del Modulo 5. La limitacion de `--check` con dependencias instalables solo aparece en hosts nuevos.

Aplicacion real:

```bash
$ ansible-playbook ejercicio-7.1.yml --diff
...
PLAY RECAP ***
cliente1                   : ok=13   changed=2    unreachable=0    failed=0
```

**Segunda aplicacion inmediata para verificar idempotencia:**

```bash
$ ansible-playbook ejercicio-7.1.yml --diff
...
PLAY RECAP ***
cliente1                   : ok=12   changed=0    unreachable=0    failed=0
```

`ok=12` (no 13) porque el handler `Reiniciar Nginx` no se ejecuta cuando no hay cambios. `changed=0` confirma que la configuracion ya esta en el estado deseado: re-aplicar no toca nada. Esta es la prueba de oro de la idempotencia.

### Comprobaciones post-aplicacion

```bash
$ curl -s -H "Host: demoapp.practicas.local" http://127.0.0.1 -o /dev/null -w "%{http_code}\n"
200

$ sudo -u postgres psql -l | grep demoapp
 demoapp    | postgres | UTF8         | libc                | es_ES.UTF-8 | es_ES.UTF-8 |          |  | =Tc/postgres         +
            |          |              |                     |             |             |          |  | demoapp=CTc/postgres

$ PGPASSWORD="demo_debian13_2026" psql -h 127.0.0.1 -U demoapp -d demoapp -c '\conninfo'
Esta conectado a la base de datos «demoapp» como el usuario «demoapp» en el servidor «127.0.0.1» port «5432».
Conexion SSL (protocolo: TLSv1.3, cifrado: TLS_AES_256_GCM_SHA384, ALPN: postgresql)

$ grep -A2 "ANSIBLE MANAGED demoapp" /etc/postgresql/17/main/pg_hba.conf
# BEGIN ANSIBLE MANAGED demoapp rule
local   demoapp   demoapp                              scram-sha-256
host    demoapp   demoapp   127.0.0.1/32               scram-sha-256
# END ANSIBLE MANAGED demoapp rule
```

Estado de los servicios afectados:

```
$ sudo systemctl status nginx --no-pager | head -5
● nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/usr/lib/systemd/system/nginx.service; enabled)
     Active: active (running) since Tue 2026-05-26 09:08:21 CEST

$ sudo systemctl status postgresql --no-pager | head -5
● postgresql.service - PostgreSQL RDBMS
     Loaded: loaded (/usr/lib/systemd/system/postgresql.service; enabled)
     Active: active (exited) since Mon 2026-05-25 14:18:00 CEST
```

`postgresql.service` aparece como `active (exited)`: es la unit de arranque del paquete, que solo dispara los `postgresql@17-main.service` reales. Estado normal en Debian.

### Notas de la ejecucion

- **`ansible_hostname` ≠ alias del inventario.** El hostname real del sistema es `debian13` (lo que devuelve `uname -n`), no `cliente1` (alias del inventario). La variable magica `{{ ansible_hostname }}` se resuelve al hostname del SO, asi que la password final es `demo_debian13_2026`. Es la diferencia entre **facts** (datos del sistema) y **inventory names** (etiquetas internas de Ansible). Confusion habitual; el playbook funciona, solo hay que tener claro que un host puede tener varios "nombres" segun el contexto.
- **Deprecation warning en `postgresql_privs`.** En `community.postgresql 4.1.0` tanto el alias `database` como `db` estan marcados como deprecated:
  ```
  [DEPRECATION WARNING]: Alias 'db' is deprecated. ... will be removed
  from collection 'community.postgresql' version 5.0.0.
  ```
  El nombre canonico aun no esta claro en esta version. Posible solucion temporal: añadir `deprecation_warnings = False` a la seccion `[defaults]` de `ansible.cfg`. Se revisara al actualizar a 5.x.

### Rollback manual

El playbook no incluye `state: absent` para retirar la BD ni el bloque de `pg_hba.conf`. Si se quiere limpiar:

```bash
sudo -u postgres psql -c "DROP DATABASE demoapp;"
sudo -u postgres psql -c "DROP USER demoapp;"
sudo sed -i '/ANSIBLE MANAGED demoapp/,/ANSIBLE MANAGED demoapp/d' \
  /etc/postgresql/17/main/pg_hba.conf
sudo systemctl reload postgresql
```

## Conclusiones del ejercicio

- El modelo de **estado deseado** de Ansible elimina el problema del "orden exacto de comandos": el playbook se puede re-ejecutar las veces que haga falta y el sistema converge al mismo estado.
- La composicion **playbook → roles** permite reutilizar `webserver` y `postgres` en otros entornos cambiando solo el inventario y las variables.
- Los **handlers** evitan reinicios innecesarios: nginx solo se reinicia si la template cambia de verdad, PostgreSQL solo se recarga si `pg_hba.conf` cambia.
- `--check --diff` es la combinacion mas util en operacion real: predice cambios y muestra los diffs sin aplicar nada, lo que permite auditar el playbook antes de tocar produccion.
- `blockinfile` con `marker:` es preferible a `lineinfile` cuando se gestionan varias lineas relacionadas (reglas pg_hba, fragmentos de config). Mantiene la idempotencia y permite localizar el bloque para retirarlo.
- `defaults/` vs `vars:` del playbook es la pieza que hace los roles reutilizables: los defaults son razonables fuera de la caja, y el usuario del rol solo sobreescribe lo que cambia por entorno.
