# Entregable Semana 3 - Scripts Bash y automatización básica

## Resumen

| Ejercicio | Estado | Documento |
|-----------|--------|-----------|
| Configuración internet en VM | Completado | - |
| Instalación openssh-server y Nginx | Completado | - |
| Tuneles SSH (pendiente semana 2) | Completado | [ejercicio-2.3](ejercicio-2.3-ssh.md) |
| 2.4 Script monitor.sh | Completado | [ejercicio-2.4-monitor](ejercicio-2.4-monitor.md) |
| 2.5 Análisis de logs | Completado | [ejercicio-2.5](ejercicio-2.5-análisis-logs.md) |

## Entregables

- Script: [monitor.sh](../scripts/monitor.sh)
- Script: [backup-disk-usage.sh](../scripts/backup-disk-usage.sh) (semana 2)
- Crontab con ambos scripts programados cada hora
- Configuración logrotate para monitor.log

## Capturas

- [Tunel SSH - Terminal](img/tunel-ssh-terminal.png)
- [Tunel SSH - Navegador](img/tunel-ssh-nginx-navegador.png)
- [Monitor log output](img/monitor-log-output.png)
- [Crontab con monitor](img/crontab-monitor-added.png)
- [Auth.log y Nginx logs](img/análisis-logs-auth-nginx.png)
- [Logrotate configurado](img/logrotate-monitor.png)

## Configuración previa realizada

Antes de los ejercicios, se configuro la VM cliente1 (servidor) que no tenia internet:

1. **sources.list** - Configurado con repos online de Debian Trixie
2. **DNS** - Añadido deb.debian.org y security.debian.org a /etc/hosts (DNS bloqueado en la red)
3. **openssh-server** - Instalado y funcionando
4. **Nginx** - Instalado, Apache2 desactivado para liberar puerto 80
5. **sudo** - Instalado y usuario soltecsis añadido al grupo

## Problemas resueltos

- **Cluster Proxmox roto**: Las VMs no arrancaban porque el nodo cambio de nombre (debian12 → Practicas). Se creo un nuevo cluster y se movieron las configs de las VMs al nodo correcto.
- **Sin DNS en la VM**: El tráfico DNS (UDP 53) esta bloqueado en la red. Solución: añadir IPs directamente a /etc/hosts.
- **Apache2 ocupando puerto 80**: Se paro y desactivo Apache2 para que Nginx pudiera arrancar.
- **Certificados SSL Proxmox**: Al crear el nuevo cluster se regeneraron certificados. Se actualizo con `pvecm updatecerts --force`.

## Entorno

| Equipo | IP | SO | Rol |
|--------|----|----|-----|
| Nodo Proxmox | 10.160.218.10 | Proxmox VE 8.4.17 | Hipervisor |
| cliente1 (VM 1002) | 10.160.218.20 | Debian 13 Trixie | Servidor |
| cliente2 (VM 1003) | - | - | Cliente (sin configurar) |
| debian13 (VM 1001) | - | - | No en uso |
