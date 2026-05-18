# Entregable Semana 9 - Modulo 6: Seguridad

## Resumen

Modulo 6 (Seguridad) cubre firewall con UFW, proteccion anti fuerza bruta con Fail2Ban y hardening basico de SSH. El entregable es el [Ejercicio 6.1: Securizar un servidor](#ejercicio-61-securizar-un-servidor) aplicado sobre `cliente1`.

| Dia | Contenido | Estado | Documento |
|-----|-----------|--------|-----------|
| 1 | UFW: instalacion, reglas para servicios reales, activacion | Completado | [teoria-seguridad](teoria-seguridad.md#ufw-uncomplicated-firewall) |
| 2 | Fail2Ban: jail sshd con maxretry=3, bantime=3600 | Completado | [teoria-seguridad](teoria-seguridad.md#fail2ban) |
| 3 | Hardening SSH: `PermitRootLogin prohibit-password`, `PasswordAuthentication no` | Completado | [teoria-seguridad](teoria-seguridad.md#hardening-ssh) |
| 4 | Auditoria de puertos: `ss -tulnp`, limpieza de servicios sin uso | Completado | [Auditoria](#auditoria-de-puertos) |
| 5 | Test Fail2Ban con 5 intentos fallidos y unban | Completado | [Prueba Fail2Ban](#prueba-fail2ban) |

## Objetivo del modulo

Aplicar medidas de seguridad basicas en `cliente1`: limitar acceso por firewall, mitigar ataques de fuerza bruta SSH, eliminar superficie de ataque innecesaria.

## Entorno de laboratorio

| Equipo | IP | Rol en esta semana |
|--------|----|---------------------|
| cliente1 (VM 1002) | 10.160.218.20 | Servidor a securizar (Nginx, BIND9, DHCP, PostgreSQL, MariaDB, miapi) |
| PC anfitrion | - | Cliente para tests de conexion |

## Particularidades

### UFW: doc literal vs servicios reales

El doc del curso da como ejemplo permitir solo SSH, HTTP y HTTPS. En `cliente1` corren ademas BIND9 (DNS interno) y un servidor DHCP que da IPs a `cliente2` y a `practica4`. Aplicar el doc al pie de la letra romperia DNS y DHCP de la red de practicas. Se documenta la decision: se permiten ademas `53/tcp+udp` y `67/udp`, mas PostgreSQL desde la red interna (`10.160.0.0/16`) como ejemplo del propio doc.

### Servicios inesperados escuchando en 0.0.0.0

`ss -tulnp` revelo varios servicios no documentados en el roadmap del curso, vivos por defecto en la imagen base de la VM:

- `pure-ftpd-mysql` en `21/tcp`
- `dovecot` en `110, 143, 993, 995`
- `miapi` (node) en `*:3000` (deberia escuchar solo en localhost; nginx hace de proxy)

UFW ya los bloqueaba desde fuera, pero seguian consumiendo recursos y constituian superficie de ataque innecesaria. Decisiones:

- `pure-ftpd-mysql` y `dovecot`: `systemctl disable --now`. No se usan.
- `miapi`: editar `dashboard-server.js` para `app.listen(3000, '127.0.0.1', ...)`. Defensa en profundidad: si UFW se desactiva alguna vez, sigue inaccesible desde fuera.

### Root SSH: matiz frente al doc

El doc pide *"deshabilitar login root por SSH"*. Aplicar `PermitRootLogin no` cumple literalmente pero no rompe nada (el flujo real usa `soltecsis` + `sudo`). Tras inspeccionar el flujo se opto por `PermitRootLogin prohibit-password`: root **solo por clave publica**, nunca por password. Mas permisivo que `no` pero suficientemente seguro y deja una via de acceso de emergencia. Si el evaluador prefiere la version estricta, basta cambiar `prohibit-password` -> `no` en el dropin.

### IP de salida compartida via VPN

Durante el test de Fail2Ban con 5 intentos fallidos, la IP de salida del entorno de pruebas y la del PC anfitrion coincidieron (ambos via tun0 hacia 10.99.129.110). El ban afecto a ambos. Recuperacion via `ssh -J servidor root@10.160.218.20` (ProxyJump por Proxmox): la conexion TCP a `cliente1:22` viene de Proxmox (`10.160.218.10`), IP no baneada, y la autenticacion sigue siendo con la clave del PC.

## Configuracion aplicada

### UFW

```bash
sudo apt install ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp  comment 'SSH'
sudo ufw allow 80/tcp  comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS (futuro)'
sudo ufw allow 53/tcp  comment 'DNS BIND9 TCP'
sudo ufw allow 53/udp  comment 'DNS BIND9 UDP'
sudo ufw allow 67/udp  comment 'DHCP server'
sudo ufw allow from 10.160.0.0/16 to any port 5432 proto tcp comment 'PostgreSQL red interna'
sudo ufw enable
```

Estado final:

```
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), deny (routed)

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere                   # SSH
80/tcp                     ALLOW IN    Anywhere                   # HTTP
443/tcp                    ALLOW IN    Anywhere                   # HTTPS (futuro)
53/tcp                     ALLOW IN    Anywhere                   # DNS BIND9 TCP
53/udp                     ALLOW IN    Anywhere                   # DNS BIND9 UDP
67/udp                     ALLOW IN    Anywhere                   # DHCP server
5432/tcp                   ALLOW IN    10.160.0.0/16              # PostgreSQL red interna
(+ reglas v6 equivalentes)
```

### Fail2Ban

`/etc/fail2ban/jail.local`:

```ini
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 3
backend  = systemd

[sshd]
enabled  = true
port     = 22
filter   = sshd
logpath  = /var/log/auth.log
maxretry = 3
bantime  = 3600
findtime = 600
```

Verificacion:

```bash
$ fail2ban-client get sshd maxretry
3
$ fail2ban-client get sshd findtime
600
$ fail2ban-client get sshd bantime
3600
```

> Nota: tras `systemctl enable --now fail2ban` los valores efectivos pueden quedar a los defaults de `/etc/fail2ban/jail.d/defaults-debian.conf`. Hace falta `systemctl restart fail2ban` (no `reload`) para que se recargue `jail.local` correctamente.

### Hardening SSH

`/etc/ssh/sshd_config.d/99-hardening.conf`:

```
# Hardening Modulo 6 - 2026-05-18
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
```

Validacion y recarga:

```bash
sshd -t && sudo systemctl reload ssh
sudo sshd -T | grep -iE 'permitrootlogin|passwordauth|pubkey'
# permitrootlogin without-password
# pubkeyauthentication yes
# passwordauthentication no
```

`/root/.ssh/authorized_keys` se copio de `/home/soltecsis/.ssh/authorized_keys` (la misma clave del PC), con `chown root:root` y `chmod 600`.

## Auditoria de puertos

Antes de la limpieza, `ss -tulnp` mostraba 12 sockets en 0.0.0.0 / `::`. Tras desactivar `pure-ftpd-mysql` y `dovecot` y rebindear `miapi`:

| Puerto | Proceso | Bind | Estado |
|--------|---------|------|--------|
| 22/tcp | sshd | 0.0.0.0 | OK, protegido por Fail2Ban |
| 80/tcp | nginx | 0.0.0.0 | OK |
| 53/tcp+udp | named | 10.160.218.20, 127.0.0.1, 172.17.0.1 | OK |
| 67/udp | isc-dhcp-server | 0.0.0.0 | OK |
| 5432/tcp | postgres | 0.0.0.0 | UFW restringe a 10.160.0.0/16 |
| 3306/tcp | mariadbd | 127.0.0.1 | Solo localhost |
| 3000/tcp | node (miapi) | 127.0.0.1 | Rebindeado tras hardening |
| 953/tcp | named (rndc) | 127.0.0.1 | Solo localhost |
| 21/tcp | pure-ftpd-mysql | (desactivado) | `systemctl disable --now` |
| 110,143,993,995 | dovecot | (desactivado) | `systemctl disable --now` |

## Prueba Fail2Ban

5 intentos SSH con usuarios inexistentes y clave invalida desde la IP `10.99.129.110`:

```bash
ssh-keygen -t ed25519 -N '' -f /tmp/badkey -q
for i in 1 2 3 4 5; do
  ssh -o BatchMode=yes -o IdentitiesOnly=yes -i /tmp/badkey \
      -o ConnectTimeout=5 -o StrictHostKeyChecking=no \
      fakeuser_$i@10.160.218.20 2>&1 | tail -1
done
```

Salida:

```
fakeuser_1@10.160.218.20: Permission denied (publickey).
fakeuser_2@10.160.218.20: Permission denied (publickey).
fakeuser_3@10.160.218.20: Permission denied (publickey).
fakeuser_4@10.160.218.20: Permission denied (publickey).
fakeuser_5@10.160.218.20: Permission denied (publickey).
```

Tras los 3 primeros fallos (umbral `maxretry=3`), Fail2Ban inserto la regla nftables que rechaza paquetes desde la IP origen. El siguiente intento de conexion legitima desde esa IP devolvio `Connection refused`.

Comprobacion y desbaneo:

```bash
$ fail2ban-client status sshd
Status for the jail: sshd
|- Filter
|  `- Journal matches: _SYSTEMD_UNIT=ssh.service + _COMM=sshd
`- Actions
   |- Currently banned: 1
   |- Total banned:     1
   `- Banned IP list:   10.99.129.110

$ fail2ban-client set sshd unbanip 10.99.129.110
1

$ fail2ban-client status sshd
   |- Currently banned: 0
   |- Total banned:     1
   `- Banned IP list:
```

## Comandos aprendidos

```bash
# UFW
sudo ufw default deny incoming
sudo ufw allow <puerto>/<proto> [comment '<texto>']
sudo ufw allow from <red> to any port <puerto> proto tcp
sudo ufw enable / disable / reload
sudo ufw status verbose
sudo ufw show added       # reglas guardadas pero no aplicadas aun

# Fail2Ban
sudo fail2ban-client status              # listado de jails
sudo fail2ban-client status sshd         # estado del jail sshd
sudo fail2ban-client get sshd maxretry
sudo fail2ban-client set sshd unbanip <IP>
sudo fail2ban-client -d                  # dump completo de la config cargada

# SSH hardening
sudo sshd -t                              # validar sintaxis sin recargar
sudo sshd -T | grep -i <opcion>           # config efectiva real
sudo systemctl reload ssh                 # mantiene sesiones activas

# Auditoria
ss -tulnp                                 # sockets escuchando + PID/proceso
sudo systemctl disable --now <servicio>   # parar y deshabilitar de una vez
```

## Estado al cierre de la semana

- UFW activa con politica `deny incoming` y 7 reglas explicitas (mas equivalentes v6)
- Fail2Ban con jail `sshd` (`maxretry=3`, `bantime=3600`, `findtime=600`)
- SSH endurecido: sin password, root solo por clave publica
- Servicios `pure-ftpd-mysql` y `dovecot` desactivados (no se usan, no arrancan al reboot)
- `miapi` escuchando solo en `127.0.0.1:3000`; nginx sigue sirviendo dashboard via proxy interno
- Prueba de Fail2Ban realizada con exito: ban tras 3 intentos, regla nftables aplicada, IP recuperada via unban manual

Detalles teoricos y comparativa entre opciones en [teoria-seguridad.md](teoria-seguridad.md).
