# Extra: Dashboard de monitorización

## Objetivo
Panel web en tiempo real que muestra el estado del servidor: disco, RAM, carga y servicios.

## Arquitectura

```
Navegador --> Nginx (reverse proxy) --> API Express (puerto 3000) --> datos del sistema
         <-- HTML/CSS/JS estático  <--
```

- **Frontend:** HTML + CSS + JavaScript vanilla (sin frameworks)
- **Backend:** Node.js con Express, ejecuta comandos del sistema
- **Proxy:** Nginx sirve el HTML y redirige /api a Express

## API REST (/opt/miapi/server.js)

### Endpoints

| Endpoint | Respuesta |
|----------|-----------|
| GET /api | Estado básico de la API |
| GET /api/sistema | Datos completos del servidor |

### Datos que devuelve /api/sistema

| Sección | Datos | Fuente |
|---------|-------|--------|
| CPU | Uso %, cores, modelo | `top -bn1`, `nproc`, `/proc/cpuinfo` |
| Memoria | Uso %, total, usada | `free -m` |
| Disco | Uso %, total, usado | `df /` |
| Carga | 1, 5 y 15 minutos | `/proc/loadavg` |
| Servicios | Estado de 6 servicios | `systemctl is-active` |
| Top procesos | 5 procesos con mas CPU | `ps aux --sort=-%cpu` |
| Usuarios | Sesiones SSH activas | `who` |
| Tráfico de red | Bytes RX/TX en ens18 | `/sys/class/net/ens18/statistics/` |
| Leases DHCP | IPs asignadas activas | `/var/lib/dhcp/dhcpd.leases` |
| Conexiónes | Conexiónes TCP/UDP activas | `ss -tun state established` |
| Historial | Últimos 30 valores CPU/RAM | Almacenado en memoria del servidor |

## Frontend (index.html)

### Secciónes del panel

| Sección | Descripción |
|---------|-------------|
| Info bar | Hostname, IP y uptime del servidor |
| CPU / RAM / Disco | Barras de progreso con colores (verde < 60%, amarillo < 80%, rojo >= 80%) |
| Historial | Gráficas sparkline con los últimos 5 minutos de CPU y RAM |
| Carga del sistema | Valores de carga a 1, 5 y 15 minutos |
| Servicios | 6 servicios monitorizados (nginx, named, isc-dhcp-server, ssh, cron, miapi) |
| Usuarios conectados | Sesiones SSH activas con nombre, terminal y origen |
| Tráfico de red | Bytes recibidos (RX) y enviados (TX) en ens18 |
| Leases DHCP | IPs asignadas con hostname y MAC (deduplicadas) |
| Top procesos | 5 procesos que mas CPU consumen (tabla tipo htop) |
| Conexiónes activas | Conexiónes TCP/UDP establecidas con protocolo, local y remoto |

### Características

- Actualizacion automática cada 10 segundos
- Boton de actualización manual
- Diseño responsive (3 columnas en escritorio, 1 en móvil)
- Tema oscuro con colores neon
- Badges con contadores en cada sección

## Configuración Nginx (/etc/nginx/sites-available/dashboard)

```nginx
server {
    listen 80;
    server_name dashboard.practicas.local;
    root /var/www/dashboard;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Servicio systemd (/etc/systemd/system/miapi.service)

Para que la API arranque automáticamente con el servidor y se reinicie si se cae:

```ini
[Unit]
Description=API Express - Dashboard de monitorización
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/miapi
ExecStart=/usr/bin/node /opt/miapi/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable miapi
systemctl start miapi
```

| Parámetro | Función |
|-----------|---------|
| After=network.target | Espera a que la red este lista |
| Restart=always | Se reinicia automáticamente si se cae |
| RestartSec=5 | Espera 5 segundos antes de reiniciar |
| WantedBy=multi-user.target | Arranca con el sistema |

![Servicio miapi activo](img/miapi-systemd-status.png)

## Resultado

![Dashboard del servidor v1](img/dashboard-servidor.png)

Versión inicial con CPU, RAM, disco, carga y servicios.

### Versión 2 (2026-04-15)

Se amplio el dashboard con 6 secciones nuevas:

![Dashboard del servidor v2](img/dashboard-servidor-v2.png)

### Versión 3 - Tokyo Night (2026-04-15)

Cambio de paleta de colores a **Tokyo Night**: fondo gris (#2a2a3a), cards oscuras (#1e1e2e), violeta (#bb9af7), azul (#7aa2f7), rojo calido (#e8756a) para titulos. Tres capas de profundidad para mejor contraste.

![Dashboard del servidor v3](img/dashboard-servidor-v3.png)

- Panel de monitorización completo con 10 secciones en tiempo real
- 6 servicios monitorizados (incluyendo la propia API miapi)
- Top 5 procesos por uso de CPU
- Usuarios conectados por SSH con avatar y origen
- Tráfico de red RX/TX en ens18
- Leases DHCP activas (deduplicadas por IP)
- Conexiónes TCP/UDP establecidas
- Historial de CPU y RAM con gráficas sparkline (últimos 5 minutos)
- Accesible en `http://dashboard.practicas.local:8080` via tunel SSH (`ssh wiki`)
- API persistente como servicio systemd (arranca con el servidor)
