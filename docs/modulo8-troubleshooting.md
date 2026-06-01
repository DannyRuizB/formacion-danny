# Modulo 8 - Troubleshooting

Problemas reales encontrados durante el despliegue y como se resolvieron. Cada
entrada sigue el formato **sintoma -> causa -> solucion**. Util tanto para
operar el sistema como para explicar las decisiones en la presentacion.

## DNS externo bloqueado: `docker pull` falla

**Sintoma**

```
docker: Error response from daemon: Get "https://registry-1.docker.io/v2/":
dial tcp: lookup registry-1.docker.io on 10.160.218.20:53: read udp ...->...:53: i/o timeout
```

**Causa**: el lab bloquea el DNS externo (puertos 53/853 al exterior). La VM no
resuelve `registry-1.docker.io`, `download.docker.com` ni Docker Hub. Los
puertos 80/443 si salen, pero el problema es la **resolucion de nombres**.

**Solucion**: cargar las imagenes desde el PC.

```bash
# en el PC
docker save postgres:17-alpine requarks/wiki:2 nginx:1.27-alpine | gzip > img.tar.gz
scp img.tar.gz danny@10.160.218.30:/tmp/
# en la VM
gunzip -c /tmp/img.tar.gz | docker load
```

!!! note "Efecto en el script de backup"
    Por esto el backup empaqueta `/wiki/data` **desde dentro** del contenedor
    `wikijs-app` (que ya tiene `tar`), en vez de hacer
    `docker run --rm -v ... alpine tar ...`: `alpine:latest` tampoco se puede
    descargar.

## `alpine:latest` no se encuentra al hacer el backup

**Sintoma**: el primer `backup-wikijs.sh` volcaba la BD bien pero fallaba al
empaquetar el volumen:

```
Unable to find image 'alpine:latest' locally
docker: Error response from daemon: Get "https://registry-1.docker.io/v2/": ... i/o timeout
```

**Causa**: el script original montaba el volumen en un contenedor `alpine`
auxiliar, y esa imagen no estaba en la VM ni se podia descargar.

**Solucion**: empaquetar desde el propio contenedor del wiki, que ya monta los
datos y trae `tar`/`gzip`:

```bash
docker exec wikijs-app tar czf - -C /wiki/data . > wiki_data-FECHA.tar.gz
```

## El healthcheck del wiki nunca pasa (Connection refused)

**Sintoma**: `wikijs-app` se quedaba `unhealthy` indefinidamente; el healthcheck
con `wget http://localhost:3000/` daba `Connection refused` aunque el wiki
respondia.

**Causa**: en Alpine, `localhost` resuelve **primero a IPv6 (`::1`)**, pero
Wiki.js escucha solo en IPv4. El `wget` intentaba `::1:3000` -> rechazado.

**Solucion**: usar la IP explicita en el healthcheck.

```yaml
healthcheck:
  test: ["CMD-SHELL", "wget -q --spider http://127.0.0.1:3000/ || exit 1"]
  start_period: 90s
  interval: 30s
  retries: 5
```

!!! note "nginx -> service_started, no service_healthy"
    `nginx` depende de `wiki` con `condition: service_started` (no
    `service_healthy`). Durante el setup inicial, exigir `service_healthy`
    provocaba que el arranque se colgara esperando un healthcheck que tardaba.
    Queda como mejora opcional apretar esto una vez estable.

## `docker ps` -> permission denied

**Sintoma**:

```
permission denied while trying to connect to the Docker daemon socket at
unix:///var/run/docker.sock
```

**Causa**: el usuario `danny` no estaba en el grupo `docker` (el grupo existia
pero estaba vacio).

**Solucion**:

```bash
sudo usermod -aG docker danny
```

!!! warning "Hay que re-loguear"
    El cambio de grupo solo aplica a **nuevas** sesiones. Cierra y reabre la
    sesion SSH (o `newgrp docker`) para que `docker` funcione sin `sudo`.
    Imprescindible tambien para que el **cron de danny** pueda usar Docker.

## No se puede crear/borrar en `/opt/wikijs`

**Sintoma**: `danny` no podia crear `/opt/wikijs/backups` ni borrar un fichero
suyo dentro de `/opt/wikijs`, pese a ser el propietario del fichero.

**Causa**: `/opt/wikijs` pertenece a `root`. Para crear o **borrar** dentro de
un directorio hace falta permiso de escritura **en el directorio**, no en el
fichero.

**Solucion**: ceder a `danny` solo el subdirectorio de backups.

```bash
sudo mkdir -p /opt/wikijs/backups
sudo chown danny:danny /opt/wikijs/backups
```

(Borrar ficheros sueltos directamente en `/opt/wikijs` sigue requiriendo
`sudo`.)

## El `.env` no es legible por `danny`

**Sintoma**: `cat /opt/wikijs/.env` -> `Permiso denegado`.

**Causa**: el `.env` es `root:root` con permisos `600` (correcto para un
fichero de secretos).

**Solucion**: no hay que cambiarlo. Los scripts que necesitan las credenciales
de la BD las toman **de dentro** del contenedor:

```bash
docker exec wikijs-db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" ...'
```

## La wiki muestra textos como `fields.email`, `actions.create`

**Sintoma**: la UI aparece con claves de traduccion en vez de texto.

**Causa**: Wiki.js 2 descarga los paquetes de idioma de GitHub **on-demand**, y
el DNS externo esta bloqueado.

**Solucion**: cuando vuelva el DNS, **Administration -> Locale** y descargar el
paquete `es`. Alternativa: pinar las IPs de `github.com` en el `/etc/hosts` del
contenedor. No bloquea la funcionalidad.

## El cron no encuentra `docker`

**Sintoma**: el backup funciona a mano pero el cron no genera nada.

**Causa**: el `PATH` de cron es minimo y puede no incluir la ruta de `docker`.

**Solucion**: fijar `PATH` al principio del crontab.

```cron
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

(En esta VM `docker` esta en `/usr/bin/docker`, que el cron ya cubre, pero se
fija el PATH explicito por robustez.)

## Otros apuntes del entorno

| Detalle | Explicacion |
|---|---|
| `docker-compose` con guion | El paquete de Debian Trixie es la v2 standalone; el comando lleva guion. `docker compose` (sin guion) no existe aqui. |
| `backend = systemd` en Fail2Ban | Debian 13 no escribe `/var/log/auth.log`; los logs van al journal. |
| `/etc/hosts` en el PC | El PC usa `systemd-resolved` (127.0.0.53), que no consulta al BIND del lab; se anyade la entrada de `wikijs.practicas.local` a mano. |
| `qemu64` sin VT-x | La VM no tiene aceleracion por hardware: operaciones Docker pesadas son lentas; hubo un *soft lockup* puntual en el setup. Stack mantenido ligero. |

## Para la demo en vivo

Tener preparado por si algo cae durante la presentacion:

```bash
docker-compose ps                   # ver que esta caido
docker-compose restart <servicio>   # reinicio rapido
tail /opt/wikijs/backups/monitor.log  # ultimas alertas del monitor
```
