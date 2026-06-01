# Entregable Semanas 11-12 - Modulo 8: Proyecto Final

## Resumen

El Modulo 8 es el proyecto final de la FCT: desplegar un servicio web completo
en contenedores Docker sobre una VM nueva de Proxmox, integrando lo aprendido en
los modulos 1-7 (Linux, virtualizacion, redes, Docker, bases de datos,
seguridad, automatizacion). La aplicacion elegida fue **Wiki.js 2** (Node.js +
PostgreSQL) con **nginx** como reverse proxy.

El proyecto se reparte en tres fases a lo largo de dos semanas:

| Fase | Contenido | Documento |
|---|---|---|
| Fase 1 - Planificacion | Eleccion de app, arquitectura, seguridad, backups, cronograma, riesgos | [planificacion](modulo8-planificacion.md) |
| Fase 2 - Implementacion | VM, hardening, Docker, stack, backups, monitor | [instalacion](modulo8-instalacion.md) + [operacion](modulo8-operacion.md) |
| Fase 3 - Documentacion | Arquitectura, guias, troubleshooting, slides, demo | este fichero + [arquitectura](modulo8-arquitectura.md) |

## Cronograma real

| Dia | Fase | Hito | Estado |
|-----|------|------|--------|
| Mar 26 may | 1 | Planificacion + diagrama + eleccion de Wiki.js | Completado |
| Mie 27 may | 2 | VM 1004, Debian 13, IP estatica, SSH con clave, hardening | Completado |
| Jue 28 may | 2 | UFW + Fail2Ban + Docker + DNS en BIND9 | Completado |
| Vie 29 may | 2 | Stack compose funcionando; wiki accesible por dominio | Completado |
| (29 may) | 2 | Extras: healthcheck del wiki + `reset-pass.sh` | Completado |
| Lun 1 jun | 2 | Backups (BD + datos) + cron + monitor + prueba de restauracion | Completado |
| (1 jun) | 2/3 | Repos en GitHub (`formacion-danny` + scripts en `wikijs-zataca`) | Completado |
| Mie 3 jun | 3 | Documentacion tecnica completa | Completado |
| Jue 4 jun | 3 | Slides (15-20 min) + ensayo de demo | Completado |
| Vie 5 jun | 3 | **Presentacion final + demo** | Pendiente |

## Que se construyo

- **VM `wikijs`** (Proxmox 1004, Debian 13, `10.160.218.30`), clon de la
  plantilla del lab.
- **Linux endurecido**: SSH solo-clave (root off), UFW, Fail2Ban con jail
  `sshd`.
- **Stack Docker Compose** de 3 servicios (`db` + `wiki` + `nginx`) en 2 redes
  internas, con volumenes nombrados, healthchecks y `restart: unless-stopped`.
  Solo nginx publica puerto al host.
- **DNS interno**: `wikijs.practicas.local` en el BIND9 de cliente1.
- **Backups automaticos**: `pg_dump` + `tar` de datos, cron diario 03:30,
  retencion 7 dias, prueba de restauracion verificada.
- **Monitorizacion**: script en cron cada 5 min que alerta si algun contenedor
  cae.
- **Codigo y documentacion** en GitHub: repos
  [`wikijs-zataca`](https://github.com/DannyRuizB/wikijs-zataca) y
  [`formacion-danny`](https://github.com/DannyRuizB/formacion-danny).

## Modulos 1-7 aplicados en el proyecto

| Modulo | Donde aparece en el proyecto |
|---|---|
| 1-2 Linux / administracion | Usuario+sudo, SSH, cron, gestion de servicios systemd. |
| 3 Redes y servicios | IP estatica, DNS en BIND9, nginx como reverse proxy. |
| 4 Virtualizacion y Docker | VM en Proxmox, Docker Compose, volumenes, redes, healthchecks. |
| 5 Bases de datos | PostgreSQL 17 como backend, `pg_dump`/restauracion. |
| 6 Seguridad | Hardening SSH, UFW, Fail2Ban, secretos en `.env` 600, minima exposicion. |
| 7 Automatizacion | Backups y monitor en cron con retencion; despliegue reproducible. |

## Dificultades superadas

Las incidencias reales y sus soluciones estan en
[troubleshooting](modulo8-troubleshooting.md). Las mas formativas:

1. **DNS externo bloqueado** -> imagenes Docker via `docker save`/`load` desde
   el PC; backup del volumen desde dentro del contenedor (sin imagen `alpine`).
2. **Healthcheck colgado** -> Alpine resuelve `localhost` a IPv6; se fijo
   `127.0.0.1` en el healthcheck del wiki.
3. **Permisos** -> grupo `docker` para el cron de `danny`; `chown` del
   directorio de backups; `.env` 600 resuelto leyendo credenciales dentro del
   contenedor.

## Estado al cierre

Fases 1 y 2 cerradas al 100%. Fase 3 (documentacion) completa; queda unicamente
la **presentacion final del viernes 5 de junio** con la demo en vivo. Material
de apoyo: [slides de la presentacion](modulo8-presentacion.md).
