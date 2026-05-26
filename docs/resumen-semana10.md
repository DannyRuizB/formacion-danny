# Entregable Semana 10 - Modulo 7: Automatizacion con Ansible

## Resumen

Modulo 7 (Automatizacion) cubre Ansible como herramienta de gestion de configuracion: inventario, comandos ad-hoc, playbooks, roles y templates Jinja2. El entregable es el [Ejercicio 7.1: playbook Nginx + PostgreSQL](ejercicio-7.1-ansible.md), aplicado sobre `cliente1` (control node y target a la vez).

| Dia | Contenido | Estado | Documento |
|-----|-----------|--------|-----------|
| 1 | Conceptos, instalacion, inventario, comandos ad-hoc | Completado | [teoria-ansible](teoria-ansible.md#inventario) |
| 2-3 | Playbooks: tasks, handlers, variables, idempotencia | Completado | [setup-servidor.yml](https://github.com/) |
| 4 | Roles y templates Jinja2 | Completado | [Roles](ejercicio-7.1-ansible.md#roles) |
| 5 | Documentacion tecnica del modulo | Completado | este fichero |
| Ej. | Playbook Nginx + PostgreSQL con vars y handlers | Completado | [Ejercicio 7.1](ejercicio-7.1-ansible.md) |

## Objetivo del modulo

Interiorizar el modelo mental de Ansible — "declaras el estado final, la herramienta se encarga del como" — y dejar la base del laboratorio reproducible: cualquiera que clone el repo puede aplicar el playbook sobre un host nuevo y obtener la misma configuracion.

## Entorno de laboratorio

| Equipo | IP | Rol en este modulo |
|--------|----|---------------------|
| cliente1 (VM 1002) | 10.160.218.20 | Control node + target (webserver + dbserver) |
| cliente2 (VM 1003) | 10.160.218.100 | En el inventario como `clients` (sin playbook por ahora) |
| PC anfitrion | - | Editar codigo + `scp` a cliente1 |

## Particularidades

### Ansible se instala y ejecuta en cliente1, no en el PC

El doc del curso pide instalar Ansible en una "maquina control". En este laboratorio se opto por **cliente1** como control node por dos motivos:

1. cliente1 ya tiene clave SSH para hablar con `cliente2`, `proxmox` y `practica4` (configurado en Modulo 2). Reutilizar esa cadena de confianza evita generar nuevas claves desde el PC.
2. El PC del alumno no tiene acceso directo a la red interna `10.160.218.0/24` (va via `ssh -J servidor`), asi que ejecutar playbooks desde el PC requeriria configurar ProxyJump en cada conexion de Ansible. Lanzar desde cliente1 elimina ese rodeo.

Coste: el codigo se edita en el PC pero se sincroniza con `scp -r ... wiki:/home/soltecsis/` antes de cada ejecucion. Para un proyecto real se usaria un repo git en cliente1 con `git pull`, pero para el modulo basta el flujo `scp`.

### `cliente1` como target de si mismo

cliente1 esta en los grupos `webservers` y `dbservers` del inventario. Ansible no puede SSH-earse contra si mismo facilmente, asi que se declara con `ansible_connection=local`:

```ini
[webservers]
cliente1 ansible_connection=local

[dbservers]
cliente1 ansible_connection=local
```

Ventaja: las tasks se ejecutan directamente con subprocess, sin abrir conexion SSH. Inconveniente: si el control node falla, no hay otro nodo desde el que recuperar.

### Idempotencia frente a la VM ya configurada

cliente1 lleva varias semanas en uso real: Nginx ya sirve `wiki.practicas.local`, PostgreSQL ya tiene las BDs `practicas` e `inventario`, UFW ya esta activa con sus reglas (Modulo 6). El playbook del ejercicio toca las **mismas** piezas, pero:

- Las tasks de `apt: state=present` reportan `ok` sin reinstalar (paquetes ya presentes).
- La task de UFW `enable` reporta `ok` (UFW ya activa).
- La template Nginx se aplica a `/etc/nginx/sites-available/default`, **distinto** de los virtual hosts productivos en `sites-enabled/`. No interfiere con la wiki ni el dashboard.
- PostgreSQL: se crea una BD nueva (`demoapp`) distinta de las productivas. El `reload` no corta conexiones activas.

Esto demuestra el valor de la idempotencia: el playbook se puede aplicar sobre un host con estado preexistente sin romper nada.

### `community.postgresql` y `python3-psycopg2`

Los modulos `postgresql_db`, `postgresql_user` y `postgresql_privs` requieren la libreria Python `psycopg2` en el target. La primera task del rol `postgres` instala `python3-psycopg2` antes de las tasks que la usan. Limitacion de `--check`: como en dry-run `python3-psycopg2` no se instala de verdad, las siguientes tasks que importan `psycopg2` fallan en el dry-run. La ejecucion real funciona sin problemas.

### Workflow `scp` vs git clone

Decidido lanzar desde cliente1 sincronizando con `scp -r` en lugar de `git clone` por dos razones:

1. cliente1 no tiene salida a github.com directa (DNS interno bloquea internet). Tendria que configurarse via `ssh wiki` con port-forward, o pasar el repo por `scp`.
2. El modulo es de aprendizaje, no de produccion: el flujo `editar en el PC → scp → ejecutar` es suficiente para iterar rapido.

En produccion lo correcto seria un mirror interno del repo o un runner CI con acceso al control node.

## Configuracion aplicada

### `ansible.cfg`

```ini
[defaults]
inventory = ./inventory.ini
host_key_checking = False
interpreter_python = /usr/bin/python3
stdout_callback = default
result_format = yaml

[ssh_connection]
pipelining = True
```

`pipelining = True` reduce el numero de operaciones SSH por task (Ansible no escribe ficheros temporales en el target). Con `cliente1` en local no aplica, pero queda preparado para cuando se añadan hosts remotos al inventario.

### Inventario

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

### Roles

Dos roles en `roles/`:

- `webserver`: instala Nginx + paquetes auxiliares, configura UFW para 22/80, despliega un site nginx parametrizado.
- `postgres`: crea BD + usuario + privilegios + rule en `pg_hba.conf` con `blockinfile`.

Detalle completo en [Ejercicio 7.1](ejercicio-7.1-ansible.md#roles).

## Comandos aprendidos

```bash
# Comandos ad-hoc
ansible all -m ping
ansible webservers -m shell -a "uptime"
ansible dbservers -m apt -a "name=htop state=present" --become

# Inventario
ansible-inventory --list                     # estructura completa
ansible-inventory --graph                    # arbol grupos -> hosts
ansible <patron> --list-hosts                # hosts que matchean

# Playbooks
ansible-playbook setup-servidor.yml --check --diff   # dry run con diff
ansible-playbook setup-servidor.yml --diff           # aplicar
ansible-playbook site.yml -l cliente1                # limitar a un host
ansible-playbook ejercicio-7.1.yml --start-at-task "Instalar paquetes"
ansible-playbook ejercicio-7.1.yml --tags "nginx"
ansible-playbook ejercicio-7.1.yml -v / -vv / -vvv   # verbose

# Roles y galaxy
ansible-galaxy role list                     # roles instalados
ansible-galaxy collection list               # colecciones instaladas

# Variables y vault
ansible-playbook site.yml -e "domain=otra.local"     # vars en cli
ansible-vault encrypt secrets.yml                    # cifrar fichero
ansible-vault edit secrets.yml                       # editar cifrado
```

## Estado al cierre de la semana

- Proyecto Ansible completo en `modulo7-ansible/`: `ansible.cfg`, `inventory.ini`, 3 playbooks (plano, refactor a rol, ejercicio), 2 roles (`webserver`, `postgres`).
- Teoria del modulo en [teoria-ansible.md](teoria-ansible.md): 9 secciones que cubren modelo mental, idempotencia, estructura, inventario, ad-hoc, playbooks, handlers, roles, templates Jinja2 y modos de ejecucion.
- Documentacion del ejercicio en [ejercicio-7.1-ansible.md](ejercicio-7.1-ansible.md).
- **Ejercicio aplicado en cliente1** (Ansible 2.19.4, community.postgresql 4.1.0):
  - `setup-servidor.yml` → `PLAY RECAP: ok=8 changed=3`.
  - `site.yml` (refactor a rol) → mismo resultado, tasks ahora prefijadas con `webserver :`.
  - `ejercicio-7.1.yml` primera aplicacion → `ok=13 changed=2` (template Nginx + handler).
  - **Segunda aplicacion → `ok=12 changed=0`**: idempotencia confirmada, handler no se dispara.
  - BD `demoapp` creada con owner `postgres`, usuario `demoapp` conecta via TLSv1.3 con la password generada por `ansible_hostname`.
  - Bloque marcado en `pg_hba.conf` insertado correctamente despues de la cabecera `# TYPE`.
- **Curiosidades observadas durante la aplicacion** (anotadas en el ejercicio):
  - `ansible_hostname` toma el valor `debian13` (hostname real del SO), no `cliente1` (alias del inventario). La password final fue `demo_debian13_2026`. Diferencia entre **facts** del sistema e **inventory names**.
  - `--check --diff` del ejercicio no fallo en las tareas `postgresql_*` como predeciamos: `python3-psycopg2` ya estaba instalado del Modulo 5, asi que la dependencia estaba resuelta.
  - `community.postgresql 4.1.0` marca como deprecated tanto `database` como `db` en `postgresql_privs`. El nombre canonico no esta claro en esta version; quedan los warnings pendientes de la 5.x.

Detalles teoricos y comparativa entre alternativas (Chef, Puppet) en [teoria-ansible.md](teoria-ansible.md).
