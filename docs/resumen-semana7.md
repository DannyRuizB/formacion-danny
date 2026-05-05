# Entregable Semana 7 - Modulo 4 (parte 2): Docker y Docker Compose

## Resumen

Segunda mitad del Modulo 4 (Virtualizacion y Contenedores). Esta semana cubre Docker desde fundamentos hasta orquestacion con Compose. La semana 6 cubrio Proxmox VE y maquinas virtuales.

| Dia | Contenido | Estado | Documento |
|-----|-----------|--------|-----------|
| 1-2 | Docker fundamentos: imagen, contenedor, registro, volumen, red | Completado | [teoria-docker](teoria-docker.md) |
| 1-2 | Ejercicio 4.3: Nginx + PostgreSQL con volumen persistente | Completado | [ejercicio-4.3](ejercicio-4.3-docker-contenedores.md) |
| 3 | Dockerfile multi-stage con usuario no-root | Completado | [ejercicio-4.4](ejercicio-4.4-docker-compose.md#dia-3---dockerfile-de-la-app-nodejs) |
| 4-5 | Docker Compose | Completado | [ejercicio-4.4](ejercicio-4.4-docker-compose.md) |
| 4-5 | Ejercicio 4.4: stack PostgreSQL + Node + Nginx reverse proxy | Completado | [ejercicio-4.4](ejercicio-4.4-docker-compose.md) |

## Objetivo del modulo

Dominar los conceptos de virtualizacion con Proxmox y contenedores con Docker. Esta semana se completa el bloque de **contenedores**.

## Entorno de laboratorio

| Equipo | IP | SO | Rol en esta semana |
|--------|----|----|-----|
| Nodo Proxmox (Practicas) | 10.160.218.10 | Proxmox VE 8.4.17 | Hipervisor |
| cliente1 (VM 1002) | 10.160.218.20 | Debian 13 Trixie | Host Docker |
| PC anfitrion | - | Linux + Docker 29.3.0 | Pre-build de imagenes |

## Particularidad: imagenes pre-cargadas

El resolver DNS interno (`10.160.218.254`) **no resuelve** los hostnames de Docker Hub (`registry-1.docker.io`, `*.r2.cloudflarestorage.com`, etc.). El firewall si permite trafico saliente HTTPS al puerto 443, pero el bloqueo de DNS impide a `docker pull` resolver los nombres.

Solucion adoptada: hacer `docker pull` en el **PC anfitrion** (DNS funcional), exportar las imagenes con `docker save`, transferirlas a `cliente1` y cargarlas con `docker load`. Las imagenes resultantes son identicas a las descargadas directamente.

```bash
# En el PC anfitrion
docker pull nginx:alpine postgres:16 node:20-slim hello-world
docker save nginx:alpine postgres:16 node:20-slim hello-world | gzip > imagenes-semana7.tar.gz
scp imagenes-semana7.tar.gz wiki:~/

# En cliente1
gunzip -c ~/imagenes-semana7.tar.gz | docker load
```

Para la app Node.js del ejercicio 4.4, el `npm install` tampoco funcionaria en `cliente1` (el resolver bloquea `registry.npmjs.org`). El **build** de la imagen se hace tambien en el PC anfitrion y solo la imagen final (`miapp:1.0`) se transfiere.

## Resumen de comandos aprendidos

```bash
# Ciclo de vida de imagenes y contenedores
docker pull / docker images / docker rmi
docker save / docker load
docker run [-d] [--name] [-p] [-v] [-e] [--network] [--restart]
docker ps / docker logs / docker exec / docker inspect / docker stats
docker stop / docker start / docker restart / docker rm

# Volumenes y redes
docker volume create / ls / inspect / rm
docker network create / ls / inspect / rm

# Build
docker build -t nombre:tag .
docker tag

# Compose
docker compose up [-d] [--build]
docker compose ps / logs / exec / restart / stop / down [-v]
docker compose config

# Limpieza
docker container prune / docker image prune [-a] / docker volume prune
docker system df / docker system prune -a --volumes
```

## Acceso

- Web Proxmox: `https://10.160.218.10:8080/`
- SSH a `cliente1`: `ssh wiki`
- Tras desplegar el stack: `curl http://localhost:8082/` (con `ssh -L 8082:localhost:8082 wiki` o el `LocalForward` en `~/.ssh/config`)

!!! quote "Fortune cookie de cierre"
    *"Una imagen sin volumen es como una libreta de papel mojado: bonita pero efimera."*
