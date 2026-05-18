# Teoria - Seguridad basica en servidores Linux

## Objetivo

Entender el modelo de defensa en capas: firewall a nivel de red (UFW/nftables), mitigacion de ataques de fuerza bruta (Fail2Ban), endurecimiento del servicio SSH y revision periodica de la superficie expuesta. Cada capa cubre fallos de la siguiente, asi que ninguna sustituye a las demas.

## Por que defensa en capas

Un servidor con SSH abierto a internet recibe miles de intentos de login diarios desde botnets. Una unica medida (por ejemplo, "contraseñas largas") no basta:

- Si solo confias en passwords: una filtracion las expone.
- Si solo cierras el puerto: un bug interno expone otro.
- Si solo bloqueas IPs sospechosas: los atacantes rotan IPs.

La estrategia es **acumular barreras**: que el atacante tenga que vencer varias para causar daño real.

```
Internet
  |
  | UFW: bloquea puertos no permitidos
  v
+-----------------------+
|  Fail2Ban             |  banea IPs con patron de ataque
+-----------------------+
  |
  v
+-----------------------+
|  sshd hardening       |  sin password, sin root password, solo clave
+-----------------------+
  |
  v
+-----------------------+
|  Sistema actualizado  |  unattended-upgrades, permisos correctos
+-----------------------+
```

## UFW (Uncomplicated Firewall)

### Que es

UFW es un **front-end** en Python para `iptables`/`nftables` orientado a comandos simples. En Debian 13 escribe sus reglas en `nftables` por debajo (la familia `inet` con la tabla `ufw-*`). UFW no reemplaza al firewall, solo genera reglas mas legibles.

### Conceptos clave

- **Politica por defecto**: que hacer con paquetes que no encajan en ninguna regla explicita. Lo estandar es `deny incoming`, `allow outgoing`.
- **Reglas explicitas**: lo que **si** se permite. Cada regla es `accion proto puerto [from origen] [comment 'texto']`.
- **Estado**: UFW recuerda las reglas en `/etc/ufw/user.rules` y `user6.rules`. Sobreviven a reinicios si esta `enabled`.

### Sintaxis basica

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp                          # SSH desde cualquier origen
sudo ufw allow 22/tcp comment 'SSH'             # mismo, con comentario
sudo ufw allow from 192.168.1.0/24             # cualquier puerto desde esa red
sudo ufw allow from 10.160.0.0/16 to any port 5432 proto tcp  # PG solo red interna
sudo ufw deny 23/tcp                            # bloqueo explicito (sobre default deny es redundante)
sudo ufw delete allow 80/tcp                   # eliminar regla
sudo ufw enable                                 # activar (pide confirmacion si SSH no esta abierto)
sudo ufw disable                                # desactivar (no borra reglas)
sudo ufw reset                                  # borrar todo
sudo ufw status verbose                         # estado y politicas
sudo ufw show added                             # reglas guardadas, util antes de enable
```

### Por que `default deny incoming` antes de allow

El orden importa: si activas UFW con `default allow incoming` ya estas expuesto. La secuencia segura es:

1. Establecer politica por defecto restrictiva (`deny incoming`).
2. Añadir las reglas `allow` para los puertos necesarios (especialmente `22/tcp` **antes** de activar, o pierdes la sesion SSH).
3. Activar (`ufw enable`).

### UFW y servicios que el SO levanta solo

UFW no apaga procesos: solo filtra paquetes. Un servicio puede seguir escuchando en `0.0.0.0:21` aunque UFW no permita ese puerto. Desde el exterior es inaccesible, pero:

- Sigue consumiendo recursos.
- Si en el futuro alguien añade una regla mal puesta, queda expuesto.
- Un usuario local del sistema podria explotarlo (vector menos comun pero real).

La buena practica es: `disable` los servicios que no usas **ademas** de bloquearlos por firewall.

## Fail2Ban

### Que es

Demonio en Python que vigila ficheros de log (o el journal de systemd) buscando patrones de **fallos repetidos** (logins SSH erroneos, errores 401 de Nginx, etc.) y, cuando una IP supera un umbral, ejecuta una accion de bloqueo (tipicamente insertar una regla en `nftables`/`iptables`).

### Anatomia: filter, jail, action

- **Filter**: una expresion regular que reconoce una linea de log como "fallo". Los filtros viven en `/etc/fail2ban/filter.d/*.conf` (p. ej. `sshd.conf`, `nginx-http-auth.conf`).
- **Jail**: une un filter con una fuente de logs y unos umbrales. Es lo que se declara en `jail.conf` o `jail.local`.
- **Action**: el comando que se ejecuta cuando salta el ban (insertar regla nftables, enviar email, etc.). En Debian 13 la accion por defecto es `nftables`.

### Parametros clave de un jail

| Parametro | Significado |
|-----------|-------------|
| `enabled` | Si el jail esta activo |
| `port` | Puertos a vigilar (lista) |
| `filter` | Nombre del filter a usar |
| `logpath` | Fichero a vigilar (si `backend = polling`) |
| `backend` | `polling`, `systemd`, `auto` |
| `maxretry` | Numero de fallos en `findtime` antes de banear |
| `findtime` | Ventana temporal (segundos) en la que se cuentan los fallos |
| `bantime` | Duracion del ban (segundos) |

Con `maxretry=3`, `findtime=600`, `bantime=3600`: tres fallos en 10 minutos = ban de 1 hora.

### `jail.local` vs `jail.conf`

`jail.conf` viene con el paquete y se sobreescribe en actualizaciones. Para personalizar **siempre** se usa `jail.local`, que tiene prioridad. Tambien funcionan ficheros en `jail.d/*.local` y `jail.d/*.conf`.

Orden de carga (importante):
1. `/etc/fail2ban/jail.conf`
2. `/etc/fail2ban/jail.local` (sobreescribe lo anterior)
3. `/etc/fail2ban/jail.d/*.conf`
4. `/etc/fail2ban/jail.d/*.local`

En Debian 13 hay `/etc/fail2ban/jail.d/defaults-debian.conf` que define `backend = systemd` y `enabled = true` para `[sshd]`. Si se quiere mas restrictivo (`maxretry=3` en lugar del default 5), hay que ponerlo explicito en el `[sshd]` de `jail.local`.

### Backend: `polling` vs `systemd`

- **polling** (default historico): tail al fichero de log (`/var/log/auth.log`). Funciona siempre, pero si el sistema usa journald y rota logs no es ideal.
- **systemd**: Fail2Ban consulta el journal con `journalmatch`. Mas robusto en Debian 13 donde sshd loguea via journald.

### Comandos de operacion

```bash
sudo fail2ban-client status                       # listado de jails activos
sudo fail2ban-client status sshd                  # detalles del jail sshd
sudo fail2ban-client get sshd maxretry            # valor efectivo
sudo fail2ban-client set sshd unbanip <IP>        # quitar ban manual
sudo fail2ban-client -d                           # dump completo (debug)
sudo systemctl restart fail2ban                   # recarga jail.local correctamente
```

> **Truco**: si tras editar `jail.local` los valores efectivos no coinciden, hace falta `restart` (no `reload`). Algunas versiones de Fail2Ban no releen `jail.local` con un simple reload.

## Hardening SSH

### Las opciones criticas en sshd_config

| Opcion | Valores tipicos | Recomendacion |
|--------|-----------------|---------------|
| `PermitRootLogin` | `yes` / `no` / `prohibit-password` / `without-password` (alias) | `no` (estricto) o `prohibit-password` (key-only) |
| `PasswordAuthentication` | `yes` / `no` | `no` si todos los usuarios tienen clave |
| `PubkeyAuthentication` | `yes` / `no` | `yes` |
| `MaxAuthTries` | numero | `3-4` (default 6) |
| `AllowUsers` / `AllowGroups` | lista | Restringir a los usuarios que de verdad usan SSH |
| `ClientAliveInterval` | segundos | `300` para timeout de sesiones idle |

### Variantes de `PermitRootLogin`

- `yes`: root puede entrar con password o clave. **Inseguro**.
- `no`: root no puede entrar por SSH en absoluto. Mas seguro, hay que tener un usuario sudo con acceso.
- `prohibit-password` (alias `without-password`): root solo con clave publica, **nunca** con password. Util si quieres una via de emergencia para root.

### Dropins en `sshd_config.d/`

En Debian moderno, `/etc/ssh/sshd_config` incluye `Include /etc/ssh/sshd_config.d/*.conf`. Es mas limpio meter las personalizaciones en un dropin propio:

```
# /etc/ssh/sshd_config.d/99-hardening.conf
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
```

Ventajas:
- No se mezclan con la configuracion por defecto del paquete.
- Reversibles: borrando o renombrando el fichero se restaura el comportamiento original.
- Faciles de comparar entre maquinas.

### Validar y recargar

```bash
sudo sshd -t              # valida sintaxis sin recargar (corta si hay error)
sudo sshd -T              # imprime la config efectiva resultante
sudo systemctl reload ssh # aplica sin matar sesiones existentes
```

> `reload` no cierra las sesiones SSH abiertas: solo cambia el comportamiento para **nuevas** conexiones. Util para no perder acceso si te equivocas: si el cambio rompe algo, sigues teniendo tu sesion vieva para revertir.

### Permisos correctos en `.ssh/`

`sshd` rechaza claves si los permisos son demasiado abiertos (proteccion contra que un usuario malicioso del sistema lea o modifique las claves de otro). Lo correcto:

```
~/.ssh                  drwx------ (700)
~/.ssh/authorized_keys  -rw------- (600)
~/.ssh/id_*             -rw------- (600)
~/.ssh/*.pub            -rw-r--r-- (644)
```

## Auditoria de puertos

### `ss -tulnp` linea a linea

```
ss -tulnp
   |  |  |  |  +- mostrar nombre del proceso (necesita sudo para PID/proceso de otros usuarios)
   |  |  |  +---- no resolver nombres (numerico)
   |  |  +------- listening (sockets en LISTEN)
   |  +---------- UDP
   +------------- TCP
```

Una linea tipica:
```
tcp   LISTEN 0    128   0.0.0.0:22   0.0.0.0:*   users:(("sshd",pid=667,fd=6))
```

- `LISTEN`: socket escuchando
- `0`: paquetes en cola (Recv-Q)
- `128`: backlog maximo (Send-Q en LISTEN sockets)
- `0.0.0.0:22`: **direccion local** y puerto
- `0.0.0.0:*`: direccion remota (cualquiera, todavia no hay conexion)
- `users:(...)`: proceso(s) que tienen el socket abierto

### Que buscar

1. **Procesos en `0.0.0.0` o `*`**: escuchan en **todas** las interfaces, incluyendo la publica. Si UFW no los cubre, son accesibles desde fuera.
2. **Procesos en `127.0.0.1` o `[::1]`**: solo localhost, sin riesgo desde la red.
3. **Procesos en una IP concreta**: bind explicito a esa interfaz. Util para servicios internos.

### Cuando un proceso debe escuchar solo en localhost

Bases de datos, APIs internas y dashboards proxieados por Nginx deberian escuchar en `127.0.0.1`. UFW lo bloquearia desde fuera de todas formas, pero hay dos ventajas:

- **Defensa en profundidad**: si UFW se desactiva por accidente, el servicio sigue inaccesible.
- **Claridad**: el bind explicito declara la intencion del codigo. Quien lo lee sabe "esto no es publico".

Ejemplo aplicado en este lab: `miapi` se cambio de `app.listen(3000)` (bind `0.0.0.0`) a `app.listen(3000, '127.0.0.1')`. Nginx sigue accediendo via proxy interno; el puerto 3000 deja de aparecer en `0.0.0.0`.

## Hardening basico adicional

El doc del curso lista varias practicas mas:

- **`unattended-upgrades`**: parches de seguridad automaticos. Se configura con `dpkg-reconfigure -plow unattended-upgrades` o editando `/etc/apt/apt.conf.d/50unattended-upgrades`.
- **Revisar puertos abiertos periodicamente**: `ss -tulnp` mensual, o automatizado con un script que compare contra una lista esperada.
- **`/etc/security/limits.conf`**: limitar numero de procesos, ficheros abiertos, memoria, por usuario. Defensa contra DoS local.
- **Permisos de ficheros sensibles**:
  - `chmod 600 /etc/shadow` (solo root puede leer hashes)
  - `chmod 644 /etc/passwd` (publico, no contiene hashes)
  - `chmod 700 ~/.ssh` y `chmod 600 ~/.ssh/authorized_keys`

Estas medidas no se cubrieron exhaustivamente en este lab pero estan documentadas para referencia futura.

## Mas alla

- **AppArmor / SELinux**: control de acceso obligatorio (MAC). Limita lo que un proceso puede leer/escribir aunque corra como root.
- **Auditd**: auditoria detallada de syscalls.
- **Lynis**: scanner de hardening que da un reporte completo con sugerencias.
- **CrowdSec**: alternativa moderna a Fail2Ban con base de datos colaborativa de IPs maliciosas.

Para el curso es suficiente con UFW + Fail2Ban + SSH hardening + auditoria de puertos.
