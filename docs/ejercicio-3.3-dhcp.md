# Ejercicio 3.3 - Servidor DHCP

## Objetivo
Instalar y configurar ISC DHCP Server para asignar IPs automaticamente a los clientes de la red.

## Como funciona DHCP

DHCP (Dynamic Host Configuration Protocol) asigna IPs automaticamente a los clientes de la red. El proceso se llama **DORA**:

```
Cliente                          Servidor DHCP
   │                                  │
   │── 1. DISCOVER (broadcast) ──────>│  "¿Hay algun servidor DHCP?"
   │                                  │
   │<──── 2. OFFER ──────────────────│  "Te ofrezco la IP 10.160.218.100"
   │                                  │
   │── 3. REQUEST ───────────────────>│  "Acepto esa IP"
   │                                  │
   │<──── 4. ACK ────────────────────│  "Confirmado, es tuya por 600 segundos"
   │                                  │
```

| Paso | Nombre | Descripcion |
|------|--------|-------------|
| 1 | **D**iscover | El cliente busca servidores DHCP en la red (broadcast) |
| 2 | **O**ffer | El servidor ofrece una IP disponible del rango |
| 3 | **R**equest | El cliente acepta la oferta |
| 4 | **A**ck | El servidor confirma y asigna la IP con un tiempo de concesion (lease) |

## Instalacion

```bash
apt install -y isc-dhcp-server
```

## Configuracion

### 1. Interfaz de escucha (/etc/default/isc-dhcp-server)

```
INTERFACESv4="ens18"
```

### 2. Configuracion DHCP (/etc/dhcp/dhcpd.conf)

```
subnet 10.160.218.0 netmask 255.255.255.0 {
    range 10.160.218.100 10.160.218.200;
    option routers 10.160.218.254;
    option domain-name-servers 10.160.218.20;
    option domain-name "practicas.local";
    default-lease-time 600;
    max-lease-time 7200;
}
```

| Parametro | Valor | Descripcion |
|-----------|-------|-------------|
| range | 10.160.218.100 - 200 | Rango de IPs que asigna (101 direcciones) |
| routers | 10.160.218.254 | Gateway por defecto |
| domain-name-servers | 10.160.218.20 | Servidor DNS (nuestro BIND9) |
| domain-name | practicas.local | Dominio de busqueda |
| default-lease-time | 600 | Tiempo de concesion por defecto (10 min) |
| max-lease-time | 7200 | Tiempo maximo de concesion (2 horas) |

## Verificacion

```bash
systemctl restart isc-dhcp-server
systemctl status isc-dhcp-server
```

![DHCP server status](img/dhcp-server-status.png)

Servidor DHCP activo, escuchando en ens18, 0 leases iniciales.

### Comprobar leases asignadas
```bash
cat /var/lib/dhcp/dhcpd.leases
```

## Verificar con un cliente

Para comprobar que un cliente obtiene IP automaticamente:

```bash
# En el cliente (si tiene dhclient):
sudo dhclient -v ens18

# Ver la IP asignada:
ip a show ens18
```

En el servidor, las concesiones activas se guardan en:

```bash
cat /var/lib/dhcp/dhcpd.leases
```

Ejemplo de una concesion:
```
lease 10.160.218.100 {
  starts 2026/04/14 10:00:00;
  ends 2026/04/14 10:10:00;
  binding state active;
  hardware ethernet aa:bb:cc:dd:ee:ff;
}
```

!!! note "Pendiente"
    La VM cliente2 (1003) aun no esta configurada. Cuando se arranque con la red en modo DHCP, deberia obtener una IP del rango .100-.200 automaticamente.

## Resultado
- ISC DHCP Server instalado y funcionando
- Rango configurado: 10.160.218.100 - 10.160.218.200
- DNS apuntando a nuestro BIND9 (10.160.218.20)
- Leases almacenadas en /var/lib/dhcp/dhcpd.leases
- Pendiente: verificar con cliente2 cuando se configure
