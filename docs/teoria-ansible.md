# Teoria - Automatizacion con Ansible

## Objetivo

Entender que es Ansible, por que se elige frente a alternativas (Chef, Puppet, scripts a mano), y los cuatro conceptos que estructuran cualquier proyecto: **inventario**, **playbooks**, **roles** y **templates**. El objetivo no es memorizar opciones de cada modulo, sino interiorizar el modelo mental: declaras el estado final, Ansible se encarga del como.

## Por que Ansible

Cuando administras mas de un servidor, repetir comandos a mano es:

- **Lento**: 5 minutos por servidor x 10 servidores = 50 minutos cada vez.
- **Error-prone**: una tipo en el sexto y el resultado diverge.
- **No reproducible**: a la semana ya no recuerdas el orden exacto.

Una herramienta de gestion de configuracion automatiza esa repeticion **describiendo el estado deseado** en lugar de los pasos. Ansible se diferencia de las alternativas en tres puntos:

| Aspecto | Ansible | Chef / Puppet |
|---------|---------|---------------|
| Agente | **No requiere agente**: solo SSH y Python en el nodo objetivo | Agente instalado y corriendo en cada nodo |
| Lenguaje | YAML declarativo | DSL propio (Ruby DSL en Chef) |
| Curva | Plana: si entiendes YAML, lees un playbook en 30s | Mas alta |
| Donde corre | Push desde un control node | Pull desde el agente |

El precio: Ansible es mas lento que un agente local porque cada tarea abre una conexion SSH (mitigado con `pipelining = True` y `ControlPersist`). Para flotas de cientos de nodos hay que pensar en bastones intermedios.

## Idempotencia

El concepto clave. Una tarea idempotente puede ejecutarse N veces y el resultado es el mismo que ejecutarla una sola vez. Ejemplo:

```yaml
- name: Asegurar que nginx esta instalado
  apt:
    name: nginx
    state: present
```

Primera ejecucion: `nginx` no esta -> apt lo instala -> reporta `changed`.
Segunda ejecucion: `nginx` ya esta -> apt no hace nada -> reporta `ok`.

Esto importa porque te permite **ejecutar el mismo playbook periodicamente** sin miedo. Tambien te permite recuperarte de un fallo a medio camino: re-lanzas el playbook y solo se aplican las tareas que faltaron.

Si una tarea no es idempotente (por ejemplo un `command:` que no comprueba estado antes), tu playbook es fragil y dificil de re-ejecutar.

## Estructura de un proyecto Ansible

```
modulo7-ansible/
├── ansible.cfg              # Config del proyecto (inventory por defecto, callbacks...)
├── inventory.ini            # Lista de hosts agrupados
├── site.yml                 # Playbook top-level
├── ejercicio-7.1.yml        # Otro playbook (composicion de roles)
└── roles/
    ├── webserver/
    │   ├── defaults/main.yml    # Valores por defecto, sobreescribibles
    │   ├── tasks/main.yml       # Lista de tareas
    │   ├── handlers/main.yml    # Tareas disparadas por `notify:`
    │   └── templates/*.j2       # Plantillas Jinja2
    └── postgres/
        └── ...
```

Cada pieza tiene un rol claro y se conoce de memoria tras tres playbooks. Esa convencion es la que permite leer cualquier proyecto Ansible (incluso de terceros) sin documentacion.

## Inventario

Lista los hosts agrupados por funcion. Formato INI clasico (tambien YAML):

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

Notas:

- Un host puede pertenecer a varios grupos. `cliente1` esta en `webservers` y `dbservers` porque cumple ambos papeles.
- `ansible_connection=local` evita SSH a si mismo cuando el control node es el propio target.
- Variables de grupo en `[grupo:vars]`, variables globales en `[all:vars]`.

## Comandos ad-hoc

Para acciones puntuales que no merecen un playbook:

```bash
# Comprobar que todos los hosts responden
ansible all -m ping

# Ejecutar shell command en un grupo
ansible webservers -m shell -a "uptime"

# Instalar un paquete escalando privilegios
ansible dbservers -m apt -a "name=htop state=present" --become
```

Sintaxis: `ansible <patron> -m <modulo> -a "<argumentos>"`. Los modulos son los mismos que en playbooks (`apt`, `service`, `copy`, `file`, ...).

## Playbooks

Un playbook es un YAML con uno o varios plays. Cada play aplica una lista de tareas a un grupo de hosts:

```yaml
- name: Configurar servidor web
  hosts: webservers
  become: yes
  vars:
    paquetes: [nginx, curl, htop, ufw]
  tasks:
    - name: Instalar paquetes
      apt:
        name: "{{ paquetes }}"
        state: present
    - name: Habilitar UFW
      community.general.ufw:
        state: enabled
  handlers:
    - name: Reiniciar Nginx
      service:
        name: nginx
        state: restarted
```

Conceptos clave:

- `hosts:` selector contra el inventario.
- `become: yes` escala a root (via sudo por defecto).
- `vars:` variables del play. Tambien pueden venir de `defaults/main.yml` del rol, `group_vars/`, `host_vars/` o `-e clave=valor` en la linea de comandos.
- `tasks:` lista ordenada de modulos a aplicar.
- `handlers:` tareas que solo se ejecutan si una task con `notify:` cambia.

## Handlers

Un handler es como una tarea normal pero **solo se dispara una vez al final del play** y **solo si alguna task lo notifica con un cambio real**:

```yaml
tasks:
  - name: Copiar config Nginx
    template:
      src: nginx.conf.j2
      dest: /etc/nginx/sites-available/default
    notify: Reiniciar Nginx     # <- nombre exacto del handler

handlers:
  - name: Reiniciar Nginx
    service:
      name: nginx
      state: restarted
```

Si la template no cambia, el handler no se ejecuta -> nginx no se reinicia. Solo cuando la config cambia de verdad se reinicia el servicio. Esto evita reinicios innecesarios.

Para PostgreSQL en este modulo se uso `state: reloaded` en lugar de `restarted`: `reload` hace que postgres re-lea sus configs sin cortar las conexiones activas. Conservador y suele bastar para cambios en `pg_hba.conf`.

## Roles

Un rol agrupa tasks + handlers + templates + variables de una "responsabilidad" del sistema (un webserver, una base de datos, un proxy). Estructura estandar:

```
roles/webserver/
├── tasks/main.yml          # tareas
├── handlers/main.yml       # handlers
├── templates/*.j2          # plantillas
├── files/                  # ficheros estaticos a copiar
├── vars/main.yml           # variables de alta prioridad
└── defaults/main.yml       # variables de baja prioridad (sobreescribibles)
```

Un playbook que aplica el rol:

```yaml
- name: Configurar servidor web
  hosts: webservers
  become: yes
  roles:
    - webserver
```

Ventaja vs un playbook plano:

- **Reutilizable**: el rol `webserver` se aplica a varios entornos cambiando solo el inventario y las variables.
- **Componible**: un playbook puede aplicar varios roles al mismo host (`roles: [webserver, postgres]`).
- **Testeable**: los roles se publican en Ansible Galaxy y se reusan en distintos proyectos.

`defaults/main.yml` vs `vars/main.yml`:

- `defaults`: valores **por defecto** que el usuario del rol puede sobreescribir desde el playbook. Baja prioridad.
- `vars`: variables fijas del rol que **no se deberian sobreescribir**. Alta prioridad.

Regla practica: lo que es razonable cambiar va a `defaults`, lo que rompe el rol si se toca va a `vars`.

## Templates Jinja2

Plantillas con sintaxis `{{ variable }}` que se renderizan con las variables del play:

```jinja
server {
    listen 80;
    server_name {{ domain }};
    root {{ web_root }};
}
```

Con `vars: { domain: demoapp.practicas.local, web_root: /var/www/demoapp }` se renderiza:

```nginx
server {
    listen 80;
    server_name demoapp.practicas.local;
    root /var/www/demoapp;
}
```

Jinja2 soporta condicionales, bucles y filtros:

```jinja
{% if ssl_enabled %}
listen 443 ssl;
ssl_certificate {{ cert_path }};
{% endif %}

{% for ip in trusted_ips %}
allow {{ ip }};
{% endfor %}
```

Para el modulo basta con sustitucion simple de variables. Bucles y condicionales se ven en proyectos mas complejos.

## Modos de ejecucion

```bash
# Dry run: predice cambios sin aplicarlos
ansible-playbook site.yml --check

# Mostrar diffs de los ficheros que cambiarian
ansible-playbook site.yml --diff

# Combinar ambos: la opcion mas util para auditar
ansible-playbook site.yml --check --diff

# Aplicar de verdad y ver diffs
ansible-playbook site.yml --diff
```

Limites de `--check`: si una tarea depende del estado que dejaria otra (ej. `apt install python3-psycopg2` y luego un modulo que `import psycopg2`), `--check` falla porque la dependencia no se aplica de verdad. En esos casos el dry-run es informativo solo hasta esa task; el run real funciona.

## Mejores practicas

1. **Usa nombres descriptivos** en cada task. `- name: Instalar nginx` rinde mas que `- name: Task 1`.
2. **No mezcles `command:` y `apt:`** cuando hay modulo dedicado. El modulo dedicado es idempotente; `command:` no.
3. **No commitees credenciales en plain text**. Usa `ansible-vault` para cifrar ficheros con secrets.
4. **Estructura por roles** desde el principio. Refactorizar de playbook plano a roles cuando el proyecto crece es tedioso.
5. **Ejecuta `--check --diff`** antes de aplicar en produccion. Las sorpresas se ven antes del cambio real.

## Referencias

- Documentacion oficial: https://docs.ansible.com/
- Ansible Galaxy (roles publicos): https://galaxy.ansible.com/
- Coleccion `community.general` y `community.postgresql`: incluidas en el bundle `ansible 12.x`.
