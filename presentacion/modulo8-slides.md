---
marp: true
theme: default
paginate: true
header: 'Modulo 8 - Proyecto Final FCT'
footer: 'Danny Ruiz · FCT Zataca 2025/2026'
style: |
  section { font-size: 1.5rem; }
  h1 { color: #2b5797; }
  code { font-size: 0.9em; }
  table { font-size: 0.85em; }
---

<!--
Como exportar:
  - VSCode: extension "Marp for VS Code" -> "Export slide deck..." -> PDF/PPTX
  - CLI:    marp modulo8-slides.md --pdf      (o --pptx)
Notas del presentador: comentarios <!- - ... - -> bajo cada slide.
-->

# Despliegue de Wiki.js en Docker

### Proyecto Final · Modulo 8

**Danny Ruiz** — FCT Zataca (Elche)
Curso 2025/2026 · 5 de junio de 2026

<!--
Presentate en 20s: que es el proyecto (un servicio web real, en contenedores,
en una VM nueva) y que integra todo lo del curso. No te enrolles en la portada.
-->

---

## Objetivo

Desplegar un **servicio web completo en contenedores** sobre una VM nueva de
Proxmox, integrando todo lo aprendido en los modulos 1-7.

El despliegue debe ser:

- **Funcional** — accesible por dominio interno, datos persistentes.
- **Seguro** — Linux endurecido, minima exposicion.
- **Automatizado** — backups y monitorizacion sin intervencion.
- **Reproducible y documentado** — cualquiera puede clonarlo y desplegarlo.

<!--
Recalca las 4 propiedades: son los ejes de la evaluacion. 30s.
-->

---

## Aplicacion elegida: Wiki.js

Plataforma de wiki moderna en **Node.js + PostgreSQL**.

Por que Wiki.js frente a WordPress o Gitea:

1. **Reutiliza el stack del curso** — Node.js + PostgreSQL 17. Cero curva.
2. **Coherencia con el laboratorio** — cierra el circulo del lab del FCT.
3. **Cumple los 3 servicios minimos** sin contorsiones:
   app (`wiki`) + base de datos (`db`) + reverse proxy (`nginx`).

<!--
El "por que" importa para la nota: justifica una decision tecnica, no elegiste
al azar. 45s.
-->

---

## Arquitectura

```
   PC / LAN ──HTTP:80──▶ [nginx] ──proxy──▶ [wiki] ──5432──▶ [db postgres]
                          frontend           front+back        backend
                            │                   │                 │
                         (unico puerto       wiki_data         db_data
                          publicado)         (volumen)        (volumen)
```

- **2 redes internas**: `backend` (wiki↔db) y `frontend` (nginx↔wiki).
- **Solo `nginx` publica puerto** al host (`80:80`). `db` y `wiki`, aislados.
- **Volumenes nombrados**: datos persisten a `docker-compose down`.

<!--
Esta es LA slide tecnica. Explica la separacion de redes: db nunca es
alcanzable desde nginx ni desde fuera. Es tu mejor argumento de seguridad. 1min.
-->

---

## La VM y el sistema base

| | |
|---|---|
| Proxmox | VM 1004, clon de plantilla Debian 13 |
| Hostname / IP | `wikijs` / `10.160.218.30` estatica |
| DNS interno | `wikijs.practicas.local` (BIND9 de cliente1) |
| Recursos | 2 vCPU, 2 GB RAM, 16 GB disco |

Usuario `danny` + sudo, acceso **solo por clave SSH**.

<!--
Rapido, 30s. Menciona que la VM es clon de plantilla (modulo 4) y el DNS lo
montaste tu en el modulo 3.
-->

---

## Seguridad (Modulo 6 aplicado)

| Capa | Configuracion |
|---|---|
| SSH | root off · solo clave · sin password |
| Firewall | UFW deny incoming + allow 22/80/443 |
| Fail2Ban | jail `sshd`, ban 1h, maxretry 5 |
| Docker | db y wiki sin puerto al host |
| Secretos | `.env` con `chmod 600`, fuera del repo |

<!--
Recorre la tabla de arriba a abajo: defensa en capas. 45s.
-->

---

## Stack Docker Compose

```yaml
services:
  db:    postgres:17-alpine    # healthcheck pg_isready
  wiki:  requarks/wiki:2       # depends_on db: service_healthy
  nginx: nginx:1.27-alpine     # ports 80:80
networks: [backend, frontend]
volumes:  [db_data, wiki_data]
```

- `restart: unless-stopped` en los tres.
- **Healthchecks** + arranque ordenado con `depends_on`.

<!--
Ensenya el compose real en pantalla si puedes. Destaca depends_on
service_healthy: wiki no arranca hasta que postgres acepta conexiones. 1min.
-->

---

## Backups automaticos

Script `backup-wikijs.sh` (cron diario **03:30**, retencion **7 dias**):

1. `pg_dump` de la BD → `db-FECHA.sql.gz`
2. `tar` de `/wiki/data` → `wiki_data-FECHA.tar.gz`
3. Borra copias > 7 dias · log en `backup.log`

**Restauracion probada** sobre una BD temporal (sin tocar produccion):
1 pagina y 2 usuarios recuperados. ✓

<!--
Recalca que no es solo "hacer backup": lo PROBASTE restaurando. Eso es lo que
distingue un backup de verdad. 45s.
-->

---

## Monitorizacion

Script `monitor-wikijs.sh` por cron **cada 5 minutos**:

- Comprueba estado + salud de los 3 contenedores.
- Solo registra `ALERTA` cuando algo falla (no inunda el log).

```
2026-06-01 09:02:02  ALERTA  wikijs-nginx  estado=exited
```

Validado parando nginx a proposito: la alerta salto. ✓

<!--
Cuenta la prueba: paraste nginx, el monitor lo detecto, lo rearrancaste. 30s.
-->

---

## Dificultades superadas

| Problema | Solucion |
|---|---|
| DNS externo bloqueado: no hay `docker pull` | `docker save`/`load` desde el PC |
| Backup necesitaba imagen `alpine` (no descargable) | `tar` desde dentro del contenedor |
| Healthcheck colgado (`localhost` → IPv6) | fijar `127.0.0.1` |
| Cron de `danny` sin Docker | grupo `docker` + `chown` de backups |

<!--
Esta slide demuestra que sabes DEPURAR, no solo seguir una receta. Cuenta 1-2
con detalle (el de IPv6 es el mas vistoso). 1-1.5min.
-->

---

## Modulos 1-7 integrados

- **1-2** Linux: usuario, sudo, SSH, cron, systemd
- **3** Redes: IP estatica, DNS (BIND9), nginx reverse proxy
- **4** Docker: Compose, redes, volumenes, healthchecks
- **5** BD: PostgreSQL 17, `pg_dump`/restore
- **6** Seguridad: SSH, UFW, Fail2Ban, secretos
- **7** Automatizacion: backups y monitor en cron

<!--
El proyecto es la sintesis del curso entero. 30s.
-->

---

## Demo en vivo

1. `http://wikijs.practicas.local` → la wiki carga
2. `docker-compose ps` → 3 contenedores, db+wiki healthy
3. Crear/editar una pagina en caliente
4. `backup-wikijs.sh` → genera los dos ficheros
5. `monitor-wikijs.sh; echo $?` → 0

<!--
TEN ESTO ABIERTO EN PESTANAS antes de empezar. Si algo falla:
docker-compose restart <servicio>. No improvises comandos largos en vivo.
-->

---

## Conclusiones

- Servicio web real **desplegado, seguro, automatizado y documentado**.
- Codigo y docs en GitHub: `wikijs-zataca` + `formacion-danny`.
- Reproducible: clonar el repo y `docker-compose up -d`.

### Gracias — ¿preguntas?

<!--
Cierra fuerte: el proyecto integra todo el curso y queda reproducible.
Invita a preguntas con confianza. 20s.
-->
