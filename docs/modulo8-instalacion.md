# Modulo 8 - Guia de instalacion

Pasos reales seguidos para levantar el stack Wiki.js en la VM `wikijs`
(10.160.218.30) desde cero. Sirve como guia reproducible: siguiendo este
documento sobre una VM Debian 13 limpia se obtiene el mismo despliegue.

!!! info "Convencion"
    Los comandos marcados `# en la VM` se ejecutan dentro de `wikijs`.
    Los marcados `# en el PC` se ejecutan en el equipo del alumno.

## 1. Crear la VM en Proxmox

La VM 1004 se creo **clonando** la plantilla `debian13` (VM 1001) ya
preparada en el lab, en lugar de instalar Debian desde el ISO. Ahorra el
asistente de instalacion y hereda el SO base ya actualizado.

| Ajuste | Valor |
|---|---|
| Clone de | plantilla `debian13` (1001) |
| VM ID | 1004 |
| Nombre | `wikijs` |

## 2. Sistema base

```bash
# en la VM
sudo hostnamectl set-hostname wikijs
```

Red estatica (IP `10.160.218.30/24`, gateway `.1`, DNS `10.160.218.20`),
usuario `danny` con sudo y SSH activo. Se verifico la salida a Internet por
HTTP/HTTPS (puertos 80/443 abiertos al exterior; 53 al exterior **bloqueado**,
ver mas abajo).

## 3. Seguridad

### 3.1 Hardening SSH

Se uso un fichero **drop-in** en vez de editar el `sshd_config` principal, para
no tocar el fichero de paquete y poder revertir borrando un solo archivo.

```bash
# en la VM — /etc/ssh/sshd_config.d/99-hardening.conf
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
KbdInteractiveAuthentication no
```

```bash
# copiar la clave del PC ANTES de desactivar el password
# en el PC
ssh-copy-id danny@10.160.218.30
# en la VM
sudo systemctl restart ssh
```

!!! danger "Orden importante"
    Copia tu clave publica y verifica que entras con ella **antes** de poner
    `PasswordAuthentication no` y reiniciar `ssh`. Si no, te quedas fuera.
    Verificado: clave OK, login de root rechazado.

### 3.2 Firewall (UFW)

```bash
# en la VM
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp      # HTTPS futuro
sudo ufw enable
```

### 3.3 Fail2Ban

```ini
# en la VM — /etc/fail2ban/jail.local
[DEFAULT]
banaction = ufw
backend   = systemd

[sshd]
enabled  = true
bantime  = 1h
findtime = 10m
maxretry = 5
```

!!! note "backend = systemd"
    En Debian 13 no hay `/var/log/auth.log` por defecto (el log va al journal).
    Por eso `backend = systemd` y `banaction = ufw` (Fail2Ban escribe las reglas
    de baneo via UFW, que ya gestiona el firewall).

## 4. Docker

```bash
# en la VM
sudo apt install docker.io docker-compose
sudo usermod -aG docker danny     # re-login para que tome efecto
```

!!! warning "Paquetes de Debian, no el repo oficial"
    Se instalaron `docker.io` (26.1.5) y `docker-compose` (2.26.1-4) desde el
    repo **main de Debian Trixie**, no desde `download.docker.com` (que **no
    resuelve** por el bloqueo de DNS externo del lab). Dos consecuencias:

    - El comando es **`docker-compose`** (con guion), no `docker compose`. El
      paquete de Debian es el binario Go v2 standalone.
    - `docker-compose-v2` no existe en el mirror; el paquete `docker-compose`
      de Trixie **ya es** la v2.

## 5. DNS interno

En el BIND9 de cliente1:

```dns
; /etc/bind/db.practicas.local
wikijs       IN  A   10.160.218.30
```

```bash
# en cliente1 — subir el serial y recargar
sudo rndc reload
```

Resuelve desde cliente1, la VM y el PC. En el PC, como usa `systemd-resolved`,
se anyadio el fallback en `/etc/hosts`:

```
10.160.218.30   wikijs.practicas.local
```

## 6. Imagenes Docker (plan B por el DNS bloqueado)

`download.docker.com`, Docker Hub y `registry-1.docker.io` **no resuelven**
desde la VM (DNS externo del lab bloqueado). No se puede hacer `docker pull`
directo. Plan B: descargar en el PC y transferir.

```bash
# en el PC (con salida a Docker Hub)
docker pull postgres:17-alpine
docker pull requarks/wiki:2
docker pull nginx:1.27-alpine
docker save postgres:17-alpine requarks/wiki:2 nginx:1.27-alpine | gzip > wikijs-images.tar.gz
scp wikijs-images.tar.gz danny@10.160.218.30:/tmp/

# en la VM
gunzip -c /tmp/wikijs-images.tar.gz | docker load
```

!!! tip "Recordatorio para el futuro"
    Mientras el DNS externo siga bloqueado, **cualquier** imagen nueva (incluida
    `alpine` para tareas auxiliares) hay que cargarla por este metodo. Por eso
    el script de backup empaqueta los datos desde *dentro* del contenedor del
    wiki en vez de tirar de una imagen `alpine` externa.

## 7. El stack

Estructura en `/opt/wikijs/`:

```
/opt/wikijs/
├── docker-compose.yml
├── .env                # secretos, chmod 600
└── nginx/
    └── default.conf
```

### 7.1 Fichero `.env`

```bash
# en la VM — generar la password y proteger el fichero
cd /opt/wikijs
cat > .env <<'EOF'
POSTGRES_DB=wiki
POSTGRES_USER=wikijs
POSTGRES_PASSWORD=GENERAR_CON_OPENSSL
EOF
sed -i "s/GENERAR_CON_OPENSSL/$(openssl rand -hex 16)/" .env
chmod 600 .env
```

!!! warning "El .env es de root"
    El `.env` quedo con propietario `root` y permisos `600`, asi que el usuario
    `danny` no lo puede leer. No es un problema: los scripts de backup toman las
    credenciales de **dentro** del contenedor de postgres, no del `.env`.

### 7.2 Levantar

```bash
# en la VM
cd /opt/wikijs
docker-compose up -d
docker-compose ps          # los 3 contenedores Up; db y wiki healthy
```

### 7.3 Setup inicial de Wiki.js

Abrir `http://wikijs.practicas.local` desde el PC y completar el asistente
(cuenta de administrador). Despues, en **Administration -> General**, corregir
la *Site URL* al dominio real `http://wikijs.practicas.local` (el placeholder
inicial es `https://wiki.yourdomain.com`).

!!! note "Detalles conocidos del setup"
    - El email del admin se introdujo como `danny.ruiz@zatca.com` (sin la
      segunda `a` de "zataca"). Funciona; documentado por si hay que unificar.
    - Los textos de la UI pueden aparecer como claves (`fields.email`, etc.)
      porque Wiki.js baja los paquetes de idioma de GitHub on-demand y el DNS
      externo esta bloqueado. No afecta a la funcionalidad. Se arregla en
      **Administration -> Locale** cuando vuelva el DNS.

## 8. Backups y monitorizacion

Cubierto en detalle en la [guia de operacion](modulo8-operacion.md). Resumen:

```bash
# en la VM — desplegar scripts y cron
# (los scripts viven en el repo wikijs-zataca/scripts/)
sudo install -d -o danny -g danny /opt/wikijs/backups
cp scripts/backup-wikijs.sh scripts/monitor-wikijs.sh /opt/wikijs/backups/
chmod +x /opt/wikijs/backups/*.sh
crontab scripts/wikijs.cron
```

## Verificacion final

```bash
# en la VM
docker-compose ps                         # 3 Up, db+wiki healthy
curl -I http://127.0.0.1                   # 200/302 desde nginx
/opt/wikijs/backups/backup-wikijs.sh       # genera dump + tar
/opt/wikijs/backups/monitor-wikijs.sh; echo $?   # 0 si todo sano
```

Desde el PC: `http://wikijs.practicas.local` carga la wiki.
