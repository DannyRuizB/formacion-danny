# Entregable Semana 2 - Administración de sistemas operativos

## Resumen

| Ejercicio | Estado | Documento |
|-----------|--------|-----------|
| 2.1 Instalación Debian 12 en Proxmox | Completado | [ejercicio-2.1](ejercicio-2.1-instalación-debian.md) |
| 2.2 Configuración de red | Completado | [ejercicio-2.2](ejercicio-2.2-configuración-red.md) |
| 2.3 SSH en profundidad | Completado | [ejercicio-2.3](ejercicio-2.3-ssh.md) |
| 2.4 Cron y tareas programadas | Completado | [ejercicio-2.4](ejercicio-2.4-cron.md) |

## Entregables

- Script: [backup-disk-usage.sh](../scripts/backup-disk-usage.sh)
- Crontab configurado en VM debian13 (cada hora)

## Capturas

- [Panel Proxmox](img/proxmox-panel-vm.png)
- [Red configurada](img/ejercicio-2.2-red-configurada.png)
- [Log de uso de disco](img/ejercicio-2.4-disk-usage-log.png)
- [Crontab](img/ejercicio-2.4-crontab.png)

## Entorno

| Equipo | IP | SO | Rol |
|--------|----|----|-----|
| Nodo Proxmox | 10.160.218.10 | Proxmox VE 8.4.17 | Hipervisor |
| debian13 (VM) | 10.160.218.20 | Debian 12 | Servidor de prácticas |
| cliente1 (VM 1002) | - | - | Cliente (sin configurar) |
| cliente2 (VM 1003) | - | - | Cliente (sin configurar) |

## Completado posteriormente (con internet)

- openssh-server instalado en VM cliente1 (servidor)
- Nginx instalado en VM cliente1 (servidor)
- Tuneles SSH completados (ver ejercicio-2.3)

!!! quote
    *"La paciencia es la virtud del que compila."*  
    — fortune aleatoria de sysadmin
