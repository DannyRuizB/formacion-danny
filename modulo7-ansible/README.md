# Módulo 7 — Ansible

Automatización y documentación. Semanas 9-10 del curso, 30 horas. Plantilla del
inventario y los playbooks vive aquí (`formacion-danny/modulo7-ansible/`) en el
PC del alumno; la ejecución se hace en **cliente1** (10.160.218.20), donde está
instalado Ansible.

## Flujo de trabajo

1. Editar archivos en este directorio del PC.
2. Sincronizar a cliente1 con:
   ```bash
   scp -r /home/danny/formacion-danny/modulo7-ansible/ wiki:/home/soltecsis/
   ```
3. Conectar a cliente1 y ejecutar como root:
   ```bash
   ssh wiki
   sudo -i
   cd /home/soltecsis/modulo7-ansible
   ansible all -m ping
   ```

## Estructura del inventario

| Grupo        | Hosts    | Notas                                  |
|--------------|----------|----------------------------------------|
| `webservers` | cliente1 | Sirve Nginx, miapi, wiki, dashboard.   |
| `dbservers`  | cliente1 | PostgreSQL 17 + MariaDB 11.            |
| `clients`    | cliente2 | VM cliente (DHCP), usuario soltecsis.  |

cliente1 entra en `webservers` y `dbservers` con `ansible_connection=local`
porque es la propia máquina control node — Ansible no SSH-ea contra sí mismo.

## Roadmap del módulo (según doc del curso)

- [x] Día 1 — Conceptos básicos, instalación, inventario, comandos ad-hoc.
- [x] Día 2-3 — Playbooks (setup-servidor.yml con tasks + handlers).
- [x] Día 4 — Roles y templates Jinja2.
- [x] Día 5 — Documentación técnica.
- [x] Ejercicio 7.1 — Playbook Nginx + PostgreSQL con vars, handler y --check. Aplicado en cliente1, idempotencia confirmada (`ok=12 changed=0` en la 2ª aplicación).
