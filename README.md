# Formacion Danny Ruiz Boluda

- **Ciclo:** 2o ASIR - Administracion de Sistemas Informaticos en Red
- **Empresa:** Zataca Systems S.L.
- **Tutor:** Adrian Rodrigo Melon Gutte
- **Periodo:** 16 de marzo - 5 de junio de 2026

## Estructura del repositorio

- `docs/` - Documentacion de los ejercicios
- `scripts/` - Scripts Bash y de automatizacion
- `configs/` - Ficheros de configuracion (Nginx, Docker, etc.)

## Modulos

1. Introduccion al entorno de trabajo
2. Administracion de sistemas operativos
3. Redes y servicios
4. Virtualizacion y contenedores
5. Bases de datos
6. Seguridad
7. Automatizacion y documentacion
8. Proyecto final
## Progreso Semana 1

- [x] Entorno configurado y acceso SSH al servidor
- [x] Ejercicio 1.1: Gestion de usuarios y grupos
- [x] Ejercicio 1.2: Procesos y servicios (Nginx) - hecho en local
- [x] Ejercicio 1.3: Repositorio Git
- [ ] Ejercicio 1.4: Exploracion de herramientas de Zataca (pendiente acceso)

## Progreso Semana 2

- [x] Instalacion Debian 12 en Proxmox
- [x] Configuracion de red (IP estatica en VM debian13)
- [x] SSH en profundidad (claves, config, securizacion)
- [x] Cron y tareas programadas (script backup-disk-usage.sh)
- [ ] Instalar Nginx en VM (pendiente internet)
- [ ] Tuneles SSH (pendiente Nginx)

## Pendiente (requiere internet en el servidor)

- Instalar openssh-server en la VM debian13
- Instalar Nginx en la VM
- Ejercicio de tuneles SSH
- Ejercicio 1.2 en el servidor (repetir)
- Resolver DNS

## Progreso Semana 7 (Modulo 4 parte 2: Docker)

- [x] Teoria de Docker (imagen, contenedor, registro, volumen, red)
- [x] Ejercicio 4.3: Nginx con HTML personalizada en cliente1:8081
- [x] Ejercicio 4.3: PostgreSQL con volumen persistente y verificacion `docker rm` + `docker run`
- [x] Dockerfile multi-stage con usuario no-root para app Node.js
- [x] Ejercicio 4.4: stack Compose (Postgres + Node + Nginx reverse proxy) en cliente1:8082
