# Formacion FCT - Zataca Systems

**Alumno:** Danny Ruiz Boluda  
**Ciclo:** 2º ASIR - Administracion de Sistemas Informaticos en Red  
**Empresa:** Zataca Systems S.L.  
**Tutor:** Adrian Rodrigo Melon Gutte  
**Periodo:** 16 de marzo - 5 de junio de 2026 (400 horas)

## Modulos del curso

| Modulo | Semanas | Estado |
|--------|---------|--------|
| 1. Introduccion al entorno de trabajo | 1 | Completado |
| 2. Administracion de sistemas operativos | 2-3 | Completado |
| 3. Redes y servicios | 4-5 | Completado |
| 4. Virtualizacion y contenedores | 6-7 | Pendiente |
| 5. Bases de datos | 7-8 | Pendiente |
| 6. Seguridad | 8-9 | Pendiente |
| 7. Automatizacion y documentacion | 9-10 | Pendiente |
| 8. Proyecto final | 10-12 | Pendiente |

## Entorno de laboratorio

| Equipo | IP | SO | Rol |
|--------|----|----|-----|
| Nodo Proxmox | 10.160.218.10 | Proxmox VE 8.4.17 | Hipervisor |
| cliente1 (VM 1002) | 10.160.218.20 | Debian 13 Trixie | Servidor |
| cliente2 (VM 1003) | - | - | Cliente |

## Servicios desplegados en el servidor

| Servicio | Puerto | Descripcion |
|----------|--------|-------------|
| Nginx | 80 | Web estatica + reverse proxy |
| BIND9 | 53 | DNS (zona practicas.local) |
| ISC DHCP | 67 | Asignacion automatica de IPs |
| Node.js/Express | 3000 | API REST |
| SSH | 22 | Acceso remoto |
| Cron | - | Tareas programadas (monitor.sh, backup-disk-usage.sh) |

## Extras

| Proyecto | Descripcion |
|----------|-------------|
| [Wiki de documentacion](extra-wiki.md) | Esta misma web, generada con MkDocs y servida por Nginx |
| [Dashboard de monitorizacion](extra-dashboard.md) | Panel web en tiempo real con estado del servidor |
| [Script de despliegue wiki](extra-deploy-wiki.md) | Desplegar la wiki con un solo comando: `wiki` |
