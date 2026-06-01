# Modulo 8 - Proyecto Final: Planificacion

## Objetivo

Desplegar un entorno web completo en contenedores Docker en una VM nueva de Proxmox, aplicando todo lo aprendido en los modulos 1-7 (administracion Linux, virtualizacion, redes, Docker, bases de datos, seguridad, automatizacion). El despliegue debe quedar reproducible, seguro, monitorizado y documentado.

Este documento es el **entregable de la Fase 1 (Semana 11)**.

## Aplicacion elegida: Wiki.js

[Wiki.js](https://js.wiki/) es una plataforma de wiki moderna escrita en Node.js, con backend en PostgreSQL. Se eligio frente a las alternativas del doc (WordPress, Gitea) por tres motivos:

1. **Reutiliza el stack ya conocido**. Node.js (visto en el `miapi` del dashboard) + PostgreSQL 17 (Modulo 5). Cero curva de aprendizaje en 10 dias. WordPress (PHP-FPM) y Gitea (Go) serian stacks nuevos sin margen para debug en vivo.
2. **Coherencia con el laboratorio**. La FCT ha girado en torno a un laboratorio propio (wiki MkDocs didactica, dashboard de monitorizacion, servicios en cliente1). Una wiki productiva self-hosteada en su propia VM cierra el circulo de forma natural.
3. **Cumple los 3 servicios minimos** de forma directa: `wikijs` (app) + `postgres` (BD) + `nginx` (reverse proxy). Sin contorsiones para llegar al numero.

## Arquitectura

### Diagrama del sistema

```
   ┌────────────────────────── VM wikijs (10.160.218.30) ──────────────────────────┐
   │                                                                                │
   │   ┌─────────────┐   80    ┌──────────────┐   3000   ┌────────────────┐         │
   │   │  Internet/  │────────▶│   nginx      │─────────▶│   wikijs       │         │
   │   │  LAN        │         │ (reverse     │          │  (Node.js 20)  │         │
   │   └─────────────┘         │  proxy)      │          └────────┬───────┘         │
   │                           └──────────────┘                   │ 5432            │
   │                                                              ▼                 │
   │                                                     ┌────────────────┐         │
   │                                                     │  postgres 17   │         │
   │                                                     │   (BD wiki)    │         │
   │                                                     └────────────────┘         │
   │                                                                                │
   │   Volumes:   wikijs-data:/wiki/uploads     postgres-data:/var/lib/postgresql   │
   │   Network:   wiki-net (bridge interno, solo nginx publica al host)             │
   └────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           │ ssh, https
                                           ▼
                                   ┌──────────────┐
                                   │  PC alumno   │
                                   │  (LAN/VPN)   │
                                   └──────────────┘
```

Decision clave: solo `nginx` expone puerto al host. `wikijs` y `postgres` viven en la red interna del Docker Compose y no son accesibles desde fuera de la VM. Esto reduce la superficie de ataque a una unica puerta de entrada.

### Maquina virtual (Proxmox)

| Parametro | Valor | Justificacion |
|---|---|---|
| ID VM | 1004 | Siguiente libre tras 1002 (cliente1) y 1003 (cliente2). |
| Hostname | `wikijs` | Descriptivo. Evita nombres genericos tipo "proyecto-final". |
| SO | Debian 13 Trixie | Misma version que el resto del lab. |
| vCPU | 2 (`qemu64`) | Suficiente para Wiki.js + Postgres con carga ligera. |
| RAM | 2 GB | Wiki.js consume ~250 MB, Postgres ~150 MB. Holgura para picos. |
| Disco | 16 GB | OS (~3 GB) + Docker images (~2 GB) + BD inicial (<100 MB) + uploads. |
| Red | virtio bridge `vmbr0` | Mismo bridge que el resto de VMs del lab. |
| IP | 10.160.218.30 estatica | Fuera del pool DHCP (cliente2/practica4 en .100+). |
| Gateway | 10.160.218.1 | Default gateway del lab. |
| DNS | 10.160.218.20 (cliente1) | BIND9 ya configurado del Modulo 3. |

### Stack Docker Compose

```yaml
# docker-compose.yml (boceto - se refinara en Fase 2)
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: wiki
      POSTGRES_USER: wikijs
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks: [wiki-net]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "wikijs", "-d", "wiki"]
      interval: 10s

  wikijs:
    image: ghcr.io/requarks/wiki:2
    environment:
      DB_TYPE: postgres
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: wikijs
      DB_PASS: ${POSTGRES_PASSWORD}
      DB_NAME: wiki
    volumes:
      - wikijs-data:/wiki/uploads
    networks: [wiki-net]
    depends_on:
      postgres: { condition: service_healthy }
    restart: unless-stopped

  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    networks: [wiki-net]
    depends_on: [wikijs]
    restart: unless-stopped

volumes:
  postgres-data:
  wikijs-data:

networks:
  wiki-net:
    driver: bridge
```

### DNS interno

Añadir a la zona `practicas.local` del BIND9 en cliente1:

```
wikijs       IN  A   10.160.218.30
```

Asi `http://wikijs.practicas.local` resuelve desde cliente1, cliente2 y el PC del alumno (que usa cliente1 como resolver via `/etc/hosts` o `resolv.conf`).

## Seguridad

Replica el patron del Modulo 6, adaptado a la nueva VM:

| Capa | Configuracion |
|---|---|
| Usuario | `danny` con sudo. Login solo por clave SSH. |
| SSH | `PermitRootLogin no`, `PasswordAuthentication no`, `PubkeyAuthentication yes`. Clave del PC anyadida a `~/.ssh/authorized_keys` del usuario `danny`. |
| Firewall (UFW) | `default deny incoming`. Allow `22/tcp` (SSH), `80/tcp` (HTTP), `443/tcp` (HTTPS futuro). |
| Fail2Ban | Jail `sshd` con `maxretry=3`, `bantime=3600`, `findtime=600`. |
| Docker | Postgres y wikijs sin puerto expuesto al host. Solo nginx en `80:80`. |
| Secretos | `POSTGRES_PASSWORD` y `JWT_SECRET` en fichero `.env` con permisos `600`, fuera del repo git (`.gitignore`). `.env.example` con placeholders en el repo. |

## Backups

### Base de datos

Script `/usr/local/bin/backup-wikijs-db.sh`:

```bash
#!/bin/bash
set -euo pipefail
DEST=/backup
FECHA=$(date +%Y%m%d_%H%M)
mkdir -p "$DEST"
docker exec wikijs-postgres-1 pg_dump -U wikijs wiki | gzip > "$DEST/wikijs_${FECHA}.sql.gz"
find "$DEST" -name "wikijs_*.sql.gz" -mtime +7 -delete
```

Cron diario a las 03:30 (no solapa con los de cliente1: 03:00 y 03:15).

### Volumen de uploads

Script paralelo que hace `tar` del volumen `wikijs-data` y comprime:

```bash
docker run --rm -v wikijs_wikijs-data:/data -v /backup:/backup alpine \
    tar -czf "/backup/wikijs-uploads_${FECHA}.tar.gz" -C /data .
```

Mismo cron, retencion 7 dias.

### Restauracion

Documentada en la guia de operacion (Fase 3). Procedimiento basico: parar stack, restaurar dump con `psql`, restaurar tar en el volumen, arrancar.

## Monitorizacion

Script `/usr/local/bin/monitor-wikijs.sh` ejecutado por cron cada 5 minutos:

```bash
#!/bin/bash
set -uo pipefail
LOG=/var/log/wikijs-monitor.log
TS=$(date '+%Y-%m-%d %H:%M:%S')

# 1. Contenedores up
DOWN=$(docker compose -f /opt/wikijs/docker-compose.yml ps --services --filter status=exited 2>/dev/null)
[ -n "$DOWN" ] && echo "$TS [ERROR] Contenedores caidos: $DOWN" >> "$LOG"

# 2. HTTP responde
CODE=$(curl -sf -o /dev/null -w "%{http_code}" http://127.0.0.1 || echo "000")
[ "$CODE" != "200" ] && [ "$CODE" != "302" ] && echo "$TS [ERROR] HTTP code=$CODE" >> "$LOG"

# 3. Espacio disco
DISK=$(df / | awk 'NR==2 {gsub("%","",$5); print $5}')
[ "$DISK" -gt 80 ] && echo "$TS [WARN] Disco al ${DISK}%" >> "$LOG"

# 4. Heartbeat OK
echo "$TS [OK] checks=4 http=$CODE disk=${DISK}%" >> "$LOG"
```

Salida via `tail -f /var/log/wikijs-monitor.log` o exportable al dashboard de cliente1 en el futuro.

## Repositorio del codigo

Repo nuevo en GitHub: **`wikijs-zataca`** (cuenta `DannyRuizB`), estilo del resto de los repos personales (`firewallscope`, `lanscope`, `dockerscope`).

Contenido previsto:

```
wikijs-zataca/
├── README.md                  # Descripcion + quick start + enlaces a la wiki del FCT
├── docker-compose.yml
├── .env.example
├── .gitignore                 # ignora .env, /backup/, etc.
├── nginx/
│   └── nginx.conf
├── scripts/
│   ├── backup-wikijs-db.sh
│   ├── backup-wikijs-uploads.sh
│   ├── monitor-wikijs.sh
│   └── restore-wikijs.sh
├── docs/
│   ├── arquitectura.md
│   ├── instalacion.md
│   ├── operacion.md
│   └── troubleshooting.md
└── LICENSE
```

La documentacion oficial del FCT vive en este repo (`formacion-danny`), en los ficheros `modulo8-*.md` y `resumen-semana11-12.md`. El repo `wikijs-zataca` contiene el codigo y una documentacion tecnica autocontenida para que cualquiera pueda clonar y desplegar.

## Plan de trabajo (cronograma)

Hoy es martes 26 de mayo de 2026. El curso termina el viernes 5 de junio de 2026. Quedan ~7 dias lectivos.

| Dia | Fase | Hito |
|-----|------|------|
| Mar 26 may | Fase 1 | Planificacion (este documento) + diagrama. **Hecho hoy.** |
| Mie 27 may | Fase 2 | Crear VM 1004 en Proxmox, instalar Debian 13, IP estatica, SSH con clave, hardening basico. |
| Jue 28 may | Fase 2 | UFW + Fail2Ban. Instalar Docker + Docker Compose. Anyadir registro DNS en BIND9. |
| Vie 29 may | Fase 2 | Stack Docker Compose (postgres + wikijs + nginx) funcionando. Wiki accesible en http://wikijs.practicas.local. |
| Lun 1 jun | Fase 2 | Scripts de backup (BD + uploads) + cron. Script de monitorizacion + cron. Pruebas de restauracion. |
| Mar 2 jun | Fase 2 | Repo `wikijs-zataca` en GitHub. README + docs/ del repo. Push del codigo. |
| Mie 3 jun | Fase 3 | Documentacion completa en `formacion-danny`: arquitectura, instalacion, operacion, troubleshooting. |
| Jue 4 jun | Fase 3 | Slides de la presentacion (15-20 min). Ensayo de la demo en vivo. |
| Vie 5 jun | Fase 3 | **Presentacion final** al tutor + demo. |

Margen: el lunes 1 esta repleto pero hay slack en miercoles 3 si la implementacion se alarga.

## Criterios de evaluacion (segun el doc del curso)

| Criterio | Peso | Como se cumple en este proyecto |
|---|---|---|
| Funcionalidad | 25% | Wiki.js operativa, accesible por dominio interno, datos persistentes, restart-safe. |
| Seguridad | 15% | SSH con clave + sin password, root deshabilitado, UFW, Fail2Ban, secretos en `.env` con permisos 600, contenedores con minimo de puertos expuestos. |
| Automatizacion | 15% | Backups con cron + retencion automatica, script de monitorizacion en cron, restart policies de Docker, healthchecks. |
| Docker | 15% | Compose con 3 servicios, redes internas, volumenes nombrados, healthchecks, `depends_on` con `condition: service_healthy`. |
| Documentacion + presentacion | ~30% | Docs en wiki MkDocs (formacion-danny) + README del repo wikijs-zataca + slides + demo en vivo. |

## Riesgos identificados y mitigaciones

| Riesgo | Mitigacion |
|---|---|
| Docker Hub bloqueado por DNS interno (paso por Modulo 4) | Build/pull en PC anfitrion + `docker save | gzip | scp` a la VM. Plan B documentado. |
| `qemu64` sin VT-x: build/pull lentos | Imagenes preconstruidas (no build local). Tirar de `requarks/wiki:2` y `postgres:17-alpine` directos. |
| BIND9 no resuelve `wikijs.practicas.local` desde el PC | Fallback: anyadir entrada en `/etc/hosts` del PC (mismo patron que `wiki.practicas.local`). |
| Volumen de uploads se llena | Monitor avisa al 80%. Limite de disco subible en caliente desde Proxmox. |
| Demo en vivo falla por servicio caido | `docker compose ps` y `tail` del monitor log preparados en una pestaña. Reinicio con `docker compose restart` documentado. |

## Estado al cierre de Fase 1

- Aplicacion elegida y justificada: **Wiki.js**.
- Arquitectura completa con diagrama, parametros de VM, stack, red, dominio.
- Plan de seguridad alineado con el Modulo 6.
- Estrategia de backups y monitorizacion definida.
- Repo del codigo decidido: `wikijs-zataca` en GitHub.
- Cronograma de los ~7 dias restantes, con hitos diarios.
- Riesgos conocidos y mitigaciones.

Siguiente paso: **Fase 2 — Implementacion**. Empezar manyana 27 de mayo creando la VM 1004 en Proxmox.
