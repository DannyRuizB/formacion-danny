# Modulo 8 - Presentacion final

Guion de apoyo para la presentacion del proyecto ante el tutor (viernes 5 de
junio). Las slides estan en formato **Marp** en el repo, fuera de la wiki:
`presentacion/modulo8-slides.md`.

## Como exportar las slides

Las slides son un markdown Marp. Para generar el PDF o el PPTX:

=== "VSCode"

    1. Instalar la extension **Marp for VS Code**.
    2. Abrir `presentacion/modulo8-slides.md`.
    3. Comando *Marp: Export slide deck...* -> elegir **PDF** o **PPTX**.

=== "Linea de comandos"

    ```bash
    npx @marp-team/marp-cli presentacion/modulo8-slides.md --pdf
    npx @marp-team/marp-cli presentacion/modulo8-slides.md --pptx
    ```

!!! tip
    Cada slide lleva **notas del presentador** en un comentario
    `<!-- ... -->` justo debajo. Marp no las muestra en pantalla; usalas como
    chuleta de lo que decir y cuanto tardar.

## Estructura y timing (objetivo: 15-20 min)

| # | Slide | Tiempo | Idea clave |
|---|---|---|---|
| 1 | Portada | 0:20 | Quien soy y que es el proyecto. |
| 2 | Objetivo | 0:30 | Funcional + seguro + automatizado + documentado. |
| 3 | Wiki.js | 0:45 | **Por que** esta app (justifica la decision). |
| 4 | Arquitectura | 1:00 | 2 redes, solo nginx publica puerto. |
| 5 | VM y sistema | 0:30 | Clon de plantilla, IP estatica, DNS propio. |
| 6 | Seguridad | 0:45 | Defensa en capas (Modulo 6). |
| 7 | Stack Compose | 1:00 | 3 servicios, healthchecks, depends_on. |
| 8 | Backups | 0:45 | Probado restaurando, no solo generado. |
| 9 | Monitor | 0:30 | Validado parando nginx. |
| 10 | Dificultades | 1:30 | Demuestra capacidad de **depurar**. |
| 11 | Modulos 1-7 | 0:30 | Sintesis del curso. |
| 12 | Demo | 3-5:00 | En vivo (ver checklist). |
| 13 | Conclusiones | 0:20 | Cierre + preguntas. |

Total narrado ~9 min + demo 3-5 min + preguntas = holgado dentro de 15-20.

## Checklist ANTES de empezar

Prepara estas pestanas/conexiones de antemano para que la demo no dependa de
teclear en vivo:

- [ ] Navegador en `http://wikijs.practicas.local` (sesion iniciada).
- [ ] Terminal SSH a la VM en `/opt/wikijs`.
- [ ] Slides exportadas a PDF (no depender de VSCode en vivo).
- [ ] Comprobado **justo antes**: `docker-compose ps` -> los 3 Up, db+wiki
      healthy.
- [ ] Un backup reciente hecho (para ensenyar los ficheros sin esperar).

## Guion de la demo en vivo

1. **Mostrar la wiki cargando** en el navegador (dominio interno).
2. **Crear o editar una pagina** rapida, guardar, ver el cambio.
3. En la terminal: `docker-compose ps` -> sennalar `healthy`.
4. `/opt/wikijs/backups/backup-wikijs.sh` -> ensenyar el log y los dos `.gz`.
5. `./monitor-wikijs.sh; echo $?` -> `0` (todo sano).
6. (Opcional, si hay tiempo y confianza) parar nginx, correr el monitor para
   ensenyar la `ALERTA`, y rearrancarlo:
   ```bash
   docker stop wikijs-nginx
   ./monitor-wikijs.sh; tail -1 monitor.log
   docker start wikijs-nginx
   ```

## Plan B si algo falla en la demo

!!! warning "No improvisar comandos largos en vivo"
    - Si un servicio esta caido: `docker-compose restart <servicio>` y seguir.
    - Si la wiki no carga: ensenyar `docker-compose ps` y los logs
      (`docker-compose logs --tail=20 wiki`), explicar y continuar.
    - Si el dominio no resuelve desde el portatil: acceder por
      `http://10.160.218.30` directamente.
    - Si todo lo demas falla: tienes el PDF de las slides y las capturas; la
      nota no depende de que la demo sea perfecta, sino de que sepas explicar
      el sistema.

## Posibles preguntas del tutor (y respuesta corta)

| Pregunta | Respuesta |
|---|---|
| ¿Por que dos redes Docker? | Aislar la BD del reverse proxy: nginx no tiene ruta a la base de datos. |
| ¿Donde estan los secretos? | En `.env` con permisos 600, fuera del repo; en GitHub solo va `.env.example`. |
| ¿Como recuperarias ante un desastre? | Restaurar el ultimo `db-*.sql.gz` con `psql` y el `wiki_data-*.tar.gz` en el volumen. Procedimiento en la [guia de operacion](modulo8-operacion.md). |
| ¿Y si se llena el disco? | El plan contemplaba aviso al 80%; el disco es ampliable en caliente desde Proxmox. |
| ¿Esto es seguro para Internet? | Para el lab si; para Internet anadiria HTTPS (puerto 443 ya abierto en UFW) y un certificado. |

## Enlaces

- [Arquitectura](modulo8-arquitectura.md)
- [Instalacion](modulo8-instalacion.md)
- [Operacion](modulo8-operacion.md)
- [Troubleshooting](modulo8-troubleshooting.md)
- Repo del codigo: [`wikijs-zataca`](https://github.com/DannyRuizB/wikijs-zataca)
