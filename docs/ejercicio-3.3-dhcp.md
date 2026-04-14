# Ejercicio 3.3 - Servidor DHCP

## Objetivo
Instalar y configurar ISC DHCP Server para asignar IPs automaticamente a los clientes de la red.

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

## Resultado
- ISC DHCP Server instalado y funcionando
- Rango configurado: 10.160.218.100 - 10.160.218.200
- DNS apuntando a nuestro BIND9 (10.160.218.20)
- Pendiente: verificar con un cliente que obtenga IP automaticamente
