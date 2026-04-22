# Arquitectura del laboratorio

Vista general de la infraestructura montada durante las prácticas: máquinas, servicios y flujos de conexión.

## Topología física

Esquema de red del laboratorio, con el PC de Danny, el hipervisor Proxmox y las VMs que corren dentro.

```mermaid
flowchart TB
    Internet((Internet))
    GW["Gateway<br/>10.160.218.254"]
    PC["PC Danny<br/>Debian"]

    subgraph Proxmox["Nodo Proxmox Practicas (10.160.218.10)"]
        direction TB
        C1["cliente1 - VM 1002<br/>10.160.218.20<br/>Servidor"]
        C2["cliente2 - VM 1003<br/>10.160.218.100<br/>Cliente (clon)"]
        P4["practica4 - VM 100<br/>10.160.218.104<br/>Ejercicio 4.1"]
    end

    Internet --> GW
    GW --> PC
    GW --> Proxmox

    classDef servidor fill:#7aa2f7,stroke:#1e1e2e,color:#1a1b26,font-weight:bold
    classDef cliente fill:#bb9af7,stroke:#1e1e2e,color:#1a1b26
    classDef infra fill:#e8756a,stroke:#1e1e2e,color:#1a1b26,font-weight:bold
    class C1 servidor
    class C2,P4 cliente
    class GW,Proxmox infra
```

| Componente | IP | Rol |
|------------|----|----|
| Gateway | 10.160.218.254 | Puerta de enlace de la red de prácticas |
| PC Danny | DHCP | Equipo de trabajo, accede por SSH al laboratorio |
| Proxmox Practicas | 10.160.218.10 | Hipervisor Proxmox VE 8.4.17 |
| cliente1 | 10.160.218.20 | VM Debian 13 - servidor (estática) |
| cliente2 | 10.160.218.100 | VM Debian 13 - cliente (DHCP) |
| practica4 | 10.160.218.104 | VM Debian 13 - ejercicio 4.1 (DHCP) |

## Servicios en cliente1

`cliente1` es el corazón del laboratorio: aloja el servidor web, DNS, DHCP y la API del dashboard.

```mermaid
flowchart LR
    Cliente[["Cliente<br/>(navegador / VM)"]]

    subgraph C1["cliente1 - 10.160.218.20"]
        direction TB
        SSH["SSH<br/>puerto 22"]
        DNS["BIND9<br/>puerto 53<br/>zona practicas.local"]
        DHCP["ISC DHCP<br/>puerto 67<br/>rango .100-.200"]
        Nginx["Nginx<br/>puerto 80"]
        API["miapi (Node.js)<br/>puerto 3000<br/>systemd service"]
        Cron["Cron<br/>monitor.sh + backup.sh"]

        Nginx -->|"/api"| API
        Nginx -->|"/"| Miweb["miweb.practicas.local"]
        Nginx -->|"/"| Wiki["wiki.practicas.local"]
        Nginx -->|"/"| Dash["dashboard.practicas.local"]
    end

    Cliente -->|80| Nginx
    Cliente -->|22| SSH
    Cliente -->|53| DNS
    Cliente -->|67| DHCP

    classDef svc fill:#9ece6a,stroke:#1e1e2e,color:#1a1b26,font-weight:bold
    classDef web fill:#7aa2f7,stroke:#1e1e2e,color:#1a1b26
    class Nginx,API,DNS,DHCP,SSH,Cron svc
    class Miweb,Wiki,Dash web
```

| Servicio | Puerto | Función |
|----------|--------|---------|
| Nginx | 80 | 3 sitios virtuales + reverse proxy `/api` → 3000 |
| BIND9 | 53 | Servidor DNS autoritativo de la zona `practicas.local` |
| ISC DHCP | 67 | Asignación dinámica de IPs en rango `.100-.200` |
| miapi (Node.js) | 3000 | API del dashboard, servicio systemd `Restart=always` |
| SSH | 22 | Acceso remoto por clave pública |
| Cron | - | `monitor.sh` y `backup-disk-usage.sh` cada hora |

## Flujos SSH

Dos tipos de conexiones por SSH: desde el PC de Danny hacia el laboratorio, y desde `cliente1` hacia las otras máquinas para alimentar el dashboard multi-host.

```mermaid
flowchart LR
    PC["PC Danny"]
    Prox["Proxmox<br/>10.160.218.10"]
    C1["cliente1<br/>10.160.218.20"]
    C2["cliente2<br/>10.160.218.100"]
    P4["practica4<br/>10.160.218.104"]

    PC -->|"ssh servidor"| Prox
    PC -->|"ssh wiki<br/>(LocalForward 8080:80)"| C1
    PC -.->|"ssh practica4<br/>(ProxyJump servidor)"| Prox
    Prox -.->|"ProxyJump"| P4

    C1 ==>|"miapi root<br/>clave ed25519"| Prox
    C1 ==>|"miapi root<br/>clave ed25519"| C2
    C1 ==>|"miapi root<br/>clave ed25519"| P4

    classDef origen fill:#bb9af7,stroke:#1e1e2e,color:#1a1b26,font-weight:bold
    classDef destino fill:#7aa2f7,stroke:#1e1e2e,color:#1a1b26
    class PC,C1 origen
    class Prox,C2,P4 destino
```

**Flechas sólidas (`-->`)**: conexiones desde el PC de Danny configuradas en `~/.ssh/config`.

**Flechas gruesas (`==>`)**: conexiones que hace el proceso `miapi` (como `root` en cliente1) para recoger métricas de las otras máquinas en el selector multi-host del dashboard.

**Flechas de puntos (`-.->`)**: salto de ProxyJump (cliente1 como intermediario para llegar a practica4).

| Alias | Destino | Notas |
|-------|---------|-------|
| `ssh servidor` | `soltecsis@10.160.218.10` | Acceso al hipervisor Proxmox |
| `ssh wiki` | `soltecsis@10.160.218.20` | cliente1, con `LocalForward 8080:80` para la wiki |
| `ssh practica4` | `danbol@10.160.218.104` | VM del ejercicio 4.1, usando Proxmox como ProxyJump |

!!! tip "Plan de crecimiento"
    Si en algún momento hace falta una tercera VM para pruebas aisladas, el nombre reservado es `matrix` (10.160.218.42). De momento solo vive como entrada comentada en `/etc/hosts`.
