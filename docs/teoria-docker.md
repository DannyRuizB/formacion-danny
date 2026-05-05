# Teoria - Docker y contenedores

## Objetivo
Entender los conceptos fundamentales de Docker, la diferencia entre imagenes y contenedores, los registros publicos y privados, las redes y los volumenes, y los comandos esenciales para gestionar el ciclo de vida de un contenedor.

## Por que contenedores

Una **maquina virtual** virtualiza el hardware: cada VM lleva su propio kernel y un sistema operativo completo. Un **contenedor** virtualiza solo el espacio de usuario: comparte el kernel del anfitrion y aisla procesos, sistema de ficheros y red mediante *namespaces* y *cgroups* del kernel Linux.

| Caracteristica | Maquina virtual | Contenedor |
|---|---|---|
| Aislamiento | Hardware completo | Procesos (namespaces) |
| Tamaño | GB (SO completo) | MB (solo libs y app) |
| Arranque | Minutos | Segundos |
| Densidad | Decenas por host | Cientos por host |
| Kernel | Propio | Compartido con host |
| Portabilidad | Imagen pesada | Imagen ligera |

Resultado: los contenedores arrancan mas rapido, ocupan menos disco y permiten desplegar la misma imagen en cualquier maquina con Docker, evitando el clasico *"en mi equipo funciona"*.

## Conceptos clave

### Imagen
Plantilla de solo lectura con todo lo necesario para ejecutar una aplicacion: codigo, librerias, dependencias, configuracion. Se construye en **capas** (cada instruccion del Dockerfile genera una capa) que Docker cachea y reutiliza.

Identificacion: `nombre[:tag]` (ej. `nginx:alpine`, `postgres:16`). Si se omite el tag, se asume `latest`.

### Contenedor
Instancia en ejecucion (o detenida) de una imagen. Lleva una capa adicional escribible encima de la imagen donde se almacenan los cambios. Al eliminar el contenedor (`docker rm`), esa capa se pierde si no se ha persistido en un volumen.

### Registro (registry)
Repositorio donde se almacenan las imagenes. El publico por defecto es **Docker Hub** (`docker.io`). Tambien hay registros alternativos: `quay.io`, `gcr.io` (Google), `ghcr.io` (GitHub) o registros privados internos.

### Dockerfile
Fichero de texto con las instrucciones para construir una imagen. Se procesa con `docker build`. Cada instruccion (`FROM`, `RUN`, `COPY`, `CMD`...) genera una capa.

### Volumen
Mecanismo para persistir datos fuera del ciclo de vida del contenedor. Tres tipos:

- **Named volumes** (`docker volume create datos`): gestionados por Docker, almacenados en `/var/lib/docker/volumes/`.
- **Bind mounts** (`-v /host/path:/container/path`): mapeo directo de un directorio del anfitrion.
- **tmpfs**: volumen en memoria, no persistente.

### Red
Docker crea por defecto una red bridge (`docker0`) y permite definir redes adicionales. Los contenedores en la misma red personalizada pueden resolverse por nombre (DNS interno de Docker).

## Arquitectura

```
+----------------------------------------------+
|  CLIENTE (docker CLI)                        |
+----------------------------------------------+
        |  socket Unix /var/run/docker.sock
+----------------------------------------------+
|  DOCKER DAEMON (dockerd)                     |
|  - gestiona imagenes, contenedores, redes,   |
|    volumenes                                 |
+----------------------------------------------+
        |  containerd  →  runc
+----------------------------------------------+
|  KERNEL Linux (namespaces + cgroups)         |
+----------------------------------------------+
|  HARDWARE                                    |
+----------------------------------------------+
```

El **daemon** mantiene el estado y ejecuta los contenedores apoyandose en `containerd` y `runc` (runtime OCI). El **cliente** es solo la CLI que envia ordenes al daemon por socket.

## Comandos esenciales

### Imagenes
```bash
docker pull nginx:alpine             # descargar imagen del registro
docker images                         # listar imagenes locales
docker rmi nginx:alpine               # borrar imagen local
docker save -o nginx.tar nginx:alpine # exportar a tar
docker load -i nginx.tar              # importar desde tar
docker tag nginx:alpine miweb:1.0     # crear alias (tag)
```

### Contenedores
```bash
docker run -d --name web -p 8080:80 nginx:alpine   # crear y arrancar
docker ps                                           # listar en ejecucion
docker ps -a                                        # listar todos (incl. parados)
docker logs web                                     # ver logs
docker logs -f web                                  # seguir logs (live)
docker exec -it web sh                              # entrar al contenedor
docker stop web                                     # parar
docker start web                                    # rearrancar
docker restart web                                  # reiniciar
docker rm web                                       # eliminar (debe estar parado)
docker rm -f web                                    # forzar (lo para y borra)
docker inspect web                                  # info detallada en JSON
docker stats                                        # uso de CPU/RAM en vivo
```

### Volumenes
```bash
docker volume create datos                          # crear named volume
docker volume ls                                    # listar volumenes
docker volume inspect datos                         # ver ruta y metadatos
docker volume rm datos                              # eliminar volumen
docker run -d -v datos:/var/lib/postgresql/data postgres:16
docker run -d -v /host/path:/container/path nginx   # bind mount
```

### Redes
```bash
docker network create mi-red                        # crear red bridge
docker network ls                                   # listar redes
docker network inspect mi-red                       # ver detalles
docker run -d --network mi-red --name db postgres:16
docker run -d --network mi-red --name app node:20   # se ven como db / app
docker network rm mi-red                            # eliminar
```

### Limpieza
```bash
docker system df                                    # uso de disco por Docker
docker container prune                              # borra contenedores parados
docker image prune                                  # borra imagenes huerfanas (dangling)
docker image prune -a                               # borra todas las no usadas
docker volume prune                                 # borra volumenes sin uso
docker system prune -a --volumes                    # limpieza total (¡cuidado!)
```

## Banderas frecuentes de `docker run`

| Bandera | Que hace |
|---|---|
| `-d` | Modo *detached* (en segundo plano) |
| `--name X` | Asigna un nombre legible al contenedor |
| `-p HOST:CONT` | Publica un puerto del contenedor en el host |
| `-v VOL:PATH` | Monta un volumen named o bind mount |
| `-e VAR=valor` | Define variable de entorno |
| `--env-file f` | Lee variables desde fichero |
| `--network red` | Conecta el contenedor a una red |
| `--restart policy` | Politica de reinicio (`no`, `always`, `unless-stopped`, `on-failure`) |
| `--rm` | Elimina el contenedor al pararse |
| `-it` | Combinacion comun: TTY + stdin abierto (modo interactivo) |

## Flujo tipico de trabajo

1. **Buscar / preparar imagen**: `docker pull` o construir un Dockerfile propio con `docker build`.
2. **Definir la configuracion**: puertos a publicar, volumenes a montar, variables de entorno, red a usar.
3. **Lanzar contenedor**: `docker run` con las banderas adecuadas.
4. **Operar**: `logs`, `exec`, `inspect`, `stats` para diagnosticar y administrar.
5. **Persistir lo que importa**: usar volumenes para datos, no la capa escribible del contenedor.
6. **Limpiar**: parar y eliminar contenedores y recursos no usados (`prune`).

Cuando hay mas de un servicio que coordina (app + base de datos + reverse proxy), pasamos a **Docker Compose** con un fichero declarativo `docker-compose.yml` que describe toda la pila y permite desplegarla con un solo comando.

## Particularidad de este laboratorio

El nodo Proxmox **no tiene VT-x** (anidamiento sin aceleracion), por lo que la VM `cliente1` corre con CPU emulada (`qemu64`) y *KVM desactivado*. Docker funciona perfectamente porque solo necesita un kernel Linux moderno con cgroups v2 y namespaces, pero los **builds** y la primera ejecucion de imagenes pesadas seran mas lentos que en hardware con virtualizacion nativa.

Ademas, el **DNS publico esta bloqueado** en la red interna de Zataca: el resolver corporativo (`10.160.218.254`) no resuelve `registry-1.docker.io` ni los subdominios dinamicos de `*.r2.cloudflarestorage.com` que Docker Hub usa para almacenar capas. Como el firewall si permite trafico saliente HTTPS (puerto 443), las imagenes se descargan en el **PC anfitrion** (DNS funcional) y se transfieren a `cliente1` con `docker save` + `scp` + `docker load`. El resultado para los ejercicios es identico, simplemente cambia el origen de las imagenes.
