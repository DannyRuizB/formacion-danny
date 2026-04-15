# Entregable Semanas 4-5 - Módulo 3: Redes y servicios

## Resumen

| Ejercicio | Estado | Documento |
|-----------|--------|-----------|
| 3.1 Diseño de red (3 VLANs) | Completado | [ejercicio-3.1](ejercicio-3.1-diseno-red.md) |
| 3.2 Servidor DNS (BIND9) | Completado | [ejercicio-3.2](ejercicio-3.2-dns-bind9.md) |
| 3.3 Servidor DHCP | Completado | [ejercicio-3.3](ejercicio-3.3-dhcp.md) |
| 3.4 Nginx (web + reverse proxy) | Completado | [ejercicio-3.4](ejercicio-3.4-nginx.md) |
| 3.5 Troubleshooting de red | Completado | [ejercicio-3.5](ejercicio-3.5-troubleshooting.md) |

## Entregables

- Diagrama de red con 3 VLANs (servidores, usuarios, gestión)
- Configuración BIND9: zona practicas.local con registros A
- Configuración DHCP: rango 10.160.218.100-200
- Nginx: web estática + reverse proxy a API Node.js/Express
- Documento de troubleshooting con 4 problemas reales resueltos

## Servicios instalados en el servidor (cliente1)

| Servicio | Puerto | Estado |
|----------|--------|--------|
| Nginx | 80 | Activo |
| BIND9 (DNS) | 53 | Activo |
| ISC DHCP Server | 67 | Activo |
| Node.js (API Express) | 3000 | Activo |
| SSH | 22 | Activo |

## Capturas

- [BIND9 status](img/bind9-status.png)
- [DNS verificación con dig](img/bind9-dig-verificación.png)
- [DHCP server status](img/dhcp-server-status.png)
- [Nginx web estática](img/nginx-web-estática.png)
- [Nginx reverse proxy API](img/nginx-reverse-proxy-api.png)

## Entorno

| Equipo | IP | SO | Rol |
|--------|----|----|-----|
| Nodo Proxmox | 10.160.218.10 | Proxmox VE 8.4.17 | Hipervisor |
| cliente1 (VM 1002) | 10.160.218.20 | Debian 13 Trixie | Servidor |
| cliente2 (VM 1003) | - | - | Cliente (sin configurar) |
