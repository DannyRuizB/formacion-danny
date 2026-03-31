# Entregable Semana 1 - Introduccion al entorno de trabajo

## Resumen

| Ejercicio | Estado | Documento |
|-----------|--------|-----------|
| Entorno y acceso SSH | Completado | [entregable-semana1-lunes](entregable-semana1-lunes.md) |
| 1.1 Gestion de usuarios y grupos | Completado | [ejercicio-1.1](ejercicio-1.1-usuarios.md) |
| 1.2 Procesos y servicios (Nginx) | Completado (en local) | [ejercicio-1.2](ejercicio-1.2-procesos-servicios.md) |
| 1.3 Repositorio Git | Completado | [ejercicio-1.3](ejercicio-1.3-git.md) |
| 1.4 Herramientas Zataca | Pendiente | Falta acceso a Jira, Zabbix, GitLab |

## Entregables

- Documento ejercicio 1.1: creacion de usuarios (webadmin, dbadmin, deploy), grupos (backend, frontend) y directorio /proyecto con permisos
- Documento ejercicio 1.2: instalacion de Nginx, gestion con systemctl (start/stop/enable), consulta de logs con journalctl
- Documento ejercicio 1.3: repositorio Git con estructura, commits, rama feature/semana1 y merge a main
- Captura: [acceso SSH al servidor](img/acceso-ssh-servidor.png)

## Entorno configurado

| Equipo | IP | SO | Rol |
|--------|----|----|-----|
| PC local | - | Ubuntu | Desarrollo y documentacion |
| Nodo Proxmox | 10.160.218.10 | Proxmox VE 8.4.17 | Hipervisor |

- Acceso SSH con clave publica al nodo Proxmox
- Git configurado (Danny Ruiz Boluda, danny@zataca.com)
- Estructura del repositorio: docs/, scripts/, configs/

## Notas

- El ejercicio 1.2 (Nginx) se realizo en la maquina local porque el servidor no tiene internet para instalar paquetes
- El ejercicio 1.4 queda pendiente hasta tener acceso a las herramientas internas de Zataca
