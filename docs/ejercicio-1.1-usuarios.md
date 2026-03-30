# Ejercicio 1.1 - Gestion de usuarios

## Objetivo
Crear 3 usuarios y 2 grupos, asignarlos y crear un directorio con permisos para el grupo backend.

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

## Verificacion

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

## Capturas

![Verificacion de usuarios con id](img/ejercicio-1.1-id-usuarios.png)

![Permisos del directorio /proyecto](img/ejercicio-1.1-permisos-proyecto.png)

## Resultado
- webadmin esta en el grupo frontend
- dbadmin esta en el grupo backend
- deploy esta en ambos grupos (backend y frontend)
- El directorio /proyecto pertenece a root:backend con permisos 775, solo backend puede escribir
