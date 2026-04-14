# Extra: Dashboard de monitorizacion

## Objetivo
Panel web en tiempo real que muestra el estado del servidor: disco, RAM, carga y servicios.

## Arquitectura

```
Navegador --> Nginx (reverse proxy) --> API Express (puerto 3000) --> datos del sistema
         <-- HTML/CSS/JS estatico  <--
```

- **Frontend:** HTML + CSS + JavaScript vanilla (sin frameworks)
- **Backend:** Node.js con Express, ejecuta comandos del sistema
- **Proxy:** Nginx sirve el HTML y redirige /api a Express

## API REST (/opt/miapi/server.js)

### Endpoints

| Endpoint | Respuesta |
|----------|-----------|
| GET /api | Estado basico de la API |
| GET /api/sistema | Datos completos del servidor |

### Datos que devuelve /api/sistema

```json
{
    "hostname": "debian13",
    "ip": "10.160.218.20",
    "uptime": "up 3 hours, 29 minutes",
    "carga": "0.00 0.01 0.00",
    "disco": { "porcentaje": 10, "total": "30G", "usado": "2,6G" },
    "memoria": { "porcentaje": 21, "total": "1973 MB", "usada": "418 MB" },
    "servicios": [
        { "nombre": "nginx", "estado": "activo" },
        { "nombre": "named", "estado": "activo" },
        { "nombre": "isc-dhcp-server", "estado": "activo" },
        { "nombre": "ssh", "estado": "activo" },
        { "nombre": "cron", "estado": "activo" }
    ]
}
```

### Como obtiene los datos

| Dato | Comando |
|------|---------|
| Disco | `df /`, `df -h /` |
| Memoria | `free -m` |
| Uptime | `uptime -p` |
| Carga | `/proc/loadavg` |
| Servicios | `systemctl is-active --quiet` por cada servicio |

## Frontend (dashboard.html)

- Barras de progreso con colores segun uso (verde < 60%, amarillo < 80%, rojo >= 80%)
- Indicadores de servicios con puntos verdes/rojos
- Actualizacion automatica cada 10 segundos
- Boton de actualizacion manual
- Diseno responsive y tema oscuro

## Configuracion Nginx (/etc/nginx/sites-available/dashboard)

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

## Resultado

![Dashboard del servidor](img/dashboard-servidor.png)

- Panel de monitorizacion en tiempo real funcionando
- Muestra disco, RAM, carga del sistema y estado de 5 servicios
- Accesible en `http://dashboard.practicas.local:8080` via tunel SSH
- Se actualiza automaticamente cada 10 segundos
