# Ejercicio 1.1 - Gestión de usuarios

## Objetivo
Crear 3 usuarios y 2 grupos, asignarlos y crear un directorio con permisos para el grupo backend.

## Conceptos clave

En Linux cada usuario tiene un **UID** (identificador numérico) y pertenece a un **grupo principal** (GID). Además puede estar en **grupos secundarios** que le dan acceso a recursos compartidos.

| Concepto | Descripción |
|----------|-------------|
| UID | Identificador único del usuario (1000+ para usuarios normales) |
| GID | Identificador del grupo principal |
| Grupos secundarios | Grupos adicionales a los que pertenece el usuario |
| /etc/passwd | Fichero con la lista de usuarios del sistema |
| /etc/group | Fichero con la lista de grupos |

## Comandos

Crear los usuarios:
```bash
sudo useradd -m -s /bin/bash webadmin
sudo useradd -m -s /bin/bash dbadmin
sudo useradd -m -s /bin/bash deploy
```

Crear los grupos:
```bash
sudo groupadd backend
sudo groupadd frontend
```

Asignar usuarios a grupos:
```bash
sudo usermod -aG frontend webadmin
sudo usermod -aG backend dbadmin
sudo usermod -aG backend,frontend deploy
```

Crear directorio /proyecto con permisos para backend:
```bash
sudo mkdir /proyecto
sudo chown root:backend /proyecto
sudo chmod 775 /proyecto
```

### Que significa chmod 775

| Digito | Quien | Permisos | Significado |
|--------|-------|----------|-------------|
| 7 | Propietario (root) | rwx | Lectura + escritura + ejecución |
| 7 | Grupo (backend) | rwx | Lectura + escritura + ejecución |
| 5 | Otros | r-x | Solo lectura y ejecución |

Así, solo los miembros del grupo **backend** (dbadmin y deploy) pueden crear ficheros dentro de `/proyecto`. Los demas usuarios solo pueden leer y entrar al directorio.

## Verificación

```bash
$ id webadmin
uid=1001(webadmin) gid=1001(webadmin) grupos=1001(webadmin),1005(frontend)

$ id dbadmin
uid=1002(dbadmin) gid=1002(dbadmin) grupos=1002(dbadmin),1004(backend)

$ id deploy
uid=1003(deploy) gid=1003(deploy) grupos=1003(deploy),1004(backend),1005(frontend)

$ ls -la / | grep proyecto
drwxrwxr-x   2 root backend       4096 mar 30 08:39 proyecto
```

## Resumen de asignaciones

```
webadmin ──── frontend
dbadmin  ──── backend        ──── puede escribir en /proyecto
deploy   ──┬─ backend        ──── puede escribir en /proyecto
            └─ frontend
```

## Resultado
- webadmin esta en el grupo frontend
- dbadmin esta en el grupo backend
- deploy esta en ambos grupos (backend y frontend)
- El directorio /proyecto pertenece a root:backend con permisos 775, solo backend puede escribir
- Los usuarios que no estan en backend (como webadmin) solo pueden leer el contenido de /proyecto

!!! note "Nota cultural"
    Los permisos importan. Pero recuerda que incluso con `sudo`, si escribes `sudo make me a sandwich` sin más, el sistema no sabe quién tiene que traerlo. Referencia obligada a xkcd #149.
