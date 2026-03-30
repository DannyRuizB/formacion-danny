# Ejercicio 1.2 - Procesos y servicios

## Objetivo
Instalar Nginx, gestionar el servicio con systemctl y consultar los logs.

## Comandos

Instalar Nginx:
```bash
sudo apt update && sudo apt install -y nginx
```

Verificar que esta corriendo:
```bash
$ systemctl status nginx
● nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/usr/lib/systemd/system/nginx.service; enabled; preset: enabled)
     Active: active (running) since Mon 2026-03-30 08:42:56 CEST

$ ps aux | grep nginx
root        7187  0.0  0.0  11208  7120 ?        S    08:42   0:00 nginx: master process
www-data    7189  0.0  0.0  12952  4668 ?        S    08:42   0:00 nginx: worker process
```

Parar el servicio y comprobar que no responde:
```bash
$ sudo systemctl stop nginx

$ systemctl status nginx
     Active: inactive (dead) since Mon 2026-03-30 08:45:59 CEST

$ curl http://localhost
curl: (7) Failed to connect to localhost port 80 after 0 ms: Couldn't connect to server
```

Arrancar y habilitar inicio automatico:
```bash
$ sudo systemctl start nginx
$ sudo systemctl enable nginx

$ systemctl is-enabled nginx
enabled
```

Consultar logs:
```bash
$ sudo journalctl -u nginx --since today
mar 30 08:42:56 danny systemd[1]: Started nginx.service
mar 30 08:45:59 danny systemd[1]: Stopping nginx.service
mar 30 08:45:59 danny systemd[1]: Stopped nginx.service
mar 30 08:47:12 danny systemd[1]: Started nginx.service
```

## Resultado
- Nginx se instalo correctamente
- Se verifico que el servicio se puede parar y arrancar con systemctl
- Al pararlo, el puerto 80 deja de responder
- Esta configurado para arrancar automaticamente al inicio (enabled)
- Los logs muestran el historial de arranques y paradas del servicio
