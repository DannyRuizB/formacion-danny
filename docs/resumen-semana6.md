# Entregable Semana 6 - Modulo 4 (parte 1): Virtualizacion con Proxmox

## Resumen

Primera mitad del Modulo 4 (Virtualizacion y Contenedores). Esta semana cubre Proxmox VE y la gestion de maquinas virtuales. La semana 7 cubrira Docker y Docker Compose.

| Dia | Contenido | Estado | Documento |
|-----|-----------|--------|-----------|
| 1-2 | Conceptos de virtualizacion e introduccion a Proxmox | Completado | [teoria-virtualizacion](teoria-virtualizacion.md) |
| 3-4 | Ejercicio 4.1: crear y gestionar VMs | Completado | [ejercicio-4.1](ejercicio-4.1-vm-proxmox.md) |
| 5.1 | Almacenamiento en Proxmox | Completado | [ejercicio-4.2-almacenamiento](ejercicio-4.2-almacenamiento.md) |
| 5.2 | Backups con vzdump y restauracion | Completado | [ejercicio-4.2-backup-vzdump](ejercicio-4.2-backup-vzdump.md) |

## Objetivo del modulo

Dominar los conceptos de virtualizacion con Proxmox y contenedores con Docker.

## Entorno de laboratorio

| Equipo | IP | SO | Rol |
|--------|----|----|-----|
| Nodo Proxmox (Practicas) | 10.160.218.10 | Proxmox VE 8.4.17 | Hipervisor |
| cliente1 (VM 1002) | 10.160.218.20 | Debian 13 Trixie | Servidor |
| cliente2 (VM 1003) | 10.160.218.100 (DHCP) | Debian 13 Trixie (clon) | Cliente |

## Acceso

- Web Proxmox: `https://10.160.218.10:8080/`
- SSH al nodo: `ssh servidor`
- SSH a cliente1: `ssh wiki`
