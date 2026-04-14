# Ejercicio 3.1 - Diseno de red

## Objetivo
Disenar una red con 3 VLANs (servidores, usuarios, gestion), incluyendo rangos IP, gateway y DNS.

## Diagrama de red

```
                    ┌─────────────────────┐
                    │     ROUTER/FW       │
                    │   10.160.218.254    │
                    └────────┬────────────┘
                             │
                    ┌────────┴────────────┐
                    │      SWITCH L3      │
                    │  (trunk 802.1Q)     │
                    └──┬───────┬───────┬──┘
                       │       │       │
              VLAN 10  │  VLAN 20  VLAN 30
            Servidores │  Usuarios  Gestion
                       │       │       │
               ┌───────┴──┐ ┌──┴─────┐ ┌┴────────┐
               │ web01    │ │ PC-01  │ │ proxmox │
               │ db01     │ │ PC-02  │ │ zabbix  │
               │ mail01   │ │ PC-03  │ │ backup  │
               └──────────┘ └────────┘ └─────────┘
```

## VLANs

| VLAN | ID | Red | Mascara | Gateway | Rango DHCP | Uso |
|------|----|-----|---------|---------|------------|-----|
| Servidores | 10 | 10.160.10.0/24 | 255.255.255.0 | 10.160.10.1 | - (IPs estaticas) | Servidores web, BBDD, mail |
| Usuarios | 20 | 10.160.20.0/24 | 255.255.255.0 | 10.160.20.1 | 10.160.20.100 - 10.160.20.200 | PCs de empleados |
| Gestion | 30 | 10.160.30.0/24 | 255.255.255.0 | 10.160.30.1 | - (IPs estaticas) | Proxmox, monitorizacion, backups |

## Equipos por VLAN

### VLAN 10 - Servidores
| Equipo | IP | Servicio |
|--------|----|----------|
| web01 | 10.160.10.10 | Nginx (HTTP/HTTPS) |
| db01 | 10.160.10.20 | PostgreSQL |
| mail01 | 10.160.10.30 | Servidor de correo |
| dns01 | 10.160.10.2 | BIND9 (DNS) |

### VLAN 20 - Usuarios
| Equipo | IP | Descripcion |
|--------|----|-------------|
| PC-01 a PC-100 | DHCP (10.160.20.100-200) | Puestos de trabajo |
| impresora01 | 10.160.20.10 | Impresora de red |

### VLAN 30 - Gestion
| Equipo | IP | Servicio |
|--------|----|----------|
| proxmox | 10.160.30.10 | Hipervisor Proxmox VE |
| zabbix | 10.160.30.20 | Monitorizacion Zabbix |
| backup | 10.160.30.30 | Servidor de backups |

## DNS

- Servidor DNS primario: 10.160.10.2 (dns01, BIND9)
- DNS secundario/forwarder: 8.8.8.8 (Google)
- Zona: `practicas.local`

## Reglas de firewall entre VLANs

| Origen | Destino | Puertos permitidos | Descripcion |
|--------|---------|-------------------|-------------|
| Usuarios (20) | Servidores (10) | 80, 443 | Acceso web |
| Usuarios (20) | Servidores (10) | 25, 587 | Correo |
| Gestion (30) | Servidores (10) | 22, 5432, todos | Administracion completa |
| Gestion (30) | Usuarios (20) | todos | Gestion de equipos |
| Usuarios (20) | Gestion (30) | denegado | Sin acceso a gestion |
| Servidores (10) | Usuarios (20) | denegado | Sin acceso a puestos |

## Conceptos aplicados

- **VLAN (802.1Q):** Segmentacion logica de la red en un mismo switch fisico. Cada VLAN es un dominio de broadcast independiente.
- **Trunk:** Enlace entre switches que transporta trafico de multiples VLANs etiquetado con 802.1Q.
- **NAT:** El router traduce las IPs privadas (10.160.x.x) a la IP publica para salir a internet.
- **DMZ:** Los servidores podrian estar en una DMZ si necesitan ser accesibles desde internet.
- **Subredes /24:** Cada VLAN tiene 254 hosts disponibles (suficiente para este diseno).

## Resultado
- Red disenada con 3 VLANs separadas por funcion
- IPs estaticas para servidores y gestion, DHCP para usuarios
- Reglas de firewall para controlar trafico entre VLANs
- DNS centralizado en VLAN de servidores
