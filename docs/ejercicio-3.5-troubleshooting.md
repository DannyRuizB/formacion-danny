# Ejercicio 3.5 - Troubleshooting de red

## Objetivo
Diagnosticar y soluciónar problemas de red documentando cada paso.

## Metodologia de diagnóstico

1. **¿Hay conectividad IP?** → `ping`, `ip a`
2. **¿El servicio esta escuchando?** → `ss -tulnp`
3. **¿El firewall permite el tráfico?** → `iptables -L`, `ufw status`
4. **¿DNS resuelve correctamente?** → `dig`, `nslookup`, `cat /etc/resolv.conf`
5. **¿Los logs muestran errores?** → `journalctl`, `/var/log/`

## Herramientas de diagnóstico

| Comando | Función |
|---------|---------|
| `ping -c 2 IP` | Verificar conectividad básica |
| `ip a` | Ver interfaces y direcciones IP |
| `ip route` | Ver tabla de rutas y gateway |
| `ss -tulnp` | Ver puertos en escucha y que proceso los usa |
| `dig @servidor dominio` | Consultar DNS |
| `curl URL` | Probar acceso HTTP |
| `traceroute IP` | Ver ruta de paquetes |
| `journalctl -u servicio` | Ver logs de un servicio |
| `systemctl status servicio` | Estado de un servicio |

## Problemas reales diagnosticados y resueltos

### Problema 1: VMs no arrancan - Cluster Proxmox roto

**Sintoma:** Al iniciar la VM cliente1 (1002):
```
Configuration file 'nodes/Practicas/qemu-server/1002.conf' does not exist
TASK ERROR: start failed: QEMU exited with code 1
```

**Diagnóstico:**
1. El fichero de config existia pero en otra ruta:
   ```bash
   ls /etc/pve/nodes/debian12/qemu-server/  # 1001.conf 1002.conf 1003.conf
   ls /etc/pve/nodes/Practicas/qemu-server/  # vacio
   ```
2. El nodo se habia renombrado de "debian12" a "Practicas" pero las VMs seguian registradas bajo el nombre antiguo.
3. `pvecm status` daba error porque "Practicas" no resolvia a ninguna IP:
   ```bash
   cat /etc/hosts  # 127.0.0.1 Practicas (incorrecto)
   ```
4. No habia cluster configurado (`corosync.conf` no existia).

**Solución:**
1. Corregir /etc/hosts: `10.160.218.10 Practicas`
2. Crear cluster: `pvecm create mi-cluster`
3. Mover configs de VMs:
   ```bash
   mv /etc/pve/nodes/debian12/qemu-server/*.conf /etc/pve/nodes/Practicas/qemu-server/
   ```
4. Regenerar certificados: `pvecm updatecerts --force`
5. Reiniciar servicios: `systemctl restart pvedaemon pveproxy pvestatd`

### Problema 2: VM sin resolución DNS

**Sintoma:** `apt update` falla con "Fallo temporal al resolver deb.debian.org"

**Diagnóstico:**
1. Verificar conectividad: `ping -c 2 8.8.8.8` → OK (hay internet)
2. Verificar DNS: `cat /etc/resolv.conf` → fichero no existia
3. Crear resolv.conf con `nameserver 8.8.8.8` → sigue sin resolver
4. Probar otros DNS (1.1.1.1, 10.160.218.10, 10.160.218.254) → ninguno funciona
5. Conclusion: el tráfico UDP 53 (DNS) esta bloqueado en la red

**Solución:**
Resolver dominios via /etc/hosts con IPs obtenidas desde un PC con DNS:
```bash
# Desde PC local:
dig +short deb.debian.org  # 151.101.2.132

# En la VM:
echo "151.101.2.132 deb.debian.org" >> /etc/hosts
echo "151.101.2.132 security.debian.org" >> /etc/hosts
```

Para npm también:
```bash
echo "104.16.4.34 registry.npmjs.org" >> /etc/hosts
```

### Problema 3: Nginx no arranca - Puerto 80 ocupado

**Sintoma:** `systemctl start nginx` falla con error.

**Diagnóstico:**
1. Comprobar que proceso ocupa el puerto:
   ```bash
   ss -tulnp | grep :80
   # tcp LISTEN ... users:(("apache2",pid=...))
   ```
2. Apache2 estaba instalado y ocupando el puerto 80.

**Solución:**
```bash
systemctl stop apache2
systemctl disable apache2
systemctl start nginx
systemctl status nginx  # active (running)
```

### Problema 4: Web muestra pagina de Apache en vez de la nuestra

**Sintoma:** Al acceder a `miweb.practicas.local:8080` se muestra "Apache2 Debian Default Page".

**Diagnóstico:**
1. Apache dejo su index.html en `/var/www/html/`
2. Nginx tenia el site `default` activo que servia `/var/www/html/`
3. El virtual host de miweb no era el que respondia

**Solución:**
```bash
rm /etc/nginx/sites-enabled/default
systemctl reload nginx
```

## Resultado
- 4 problemas reales diagnosticados y resueltos durante la configuración del entorno
- Metodologia aplicada: verificar conectividad → verificar servicios → verificar puertos → revisar logs
- Documentado cada paso del diagnóstico y la solución
