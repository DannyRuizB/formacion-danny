# Ejercicio 2.2 - Configuracion de red

## Objetivo
Configurar IP estatica en la VM debian13, verificar conectividad y resolver DNS.

## Datos de red

| Equipo | IP | Rol |
|--------|----|-----|
| Nodo Proxmox | 10.160.218.10 | Hipervisor |
| debian13 (VM) | 10.160.218.20 | Servidor de practicas |
| Gateway | 10.160.218.254 | Puerta de enlace |

## Comandos

Ver estado inicial de la red (sin configurar):
```bash
ip a
ip route
cat /etc/network/interfaces
```

La interfaz ens18 estaba en estado DOWN y sin IP asignada.

Configurar IP estatica editando /etc/network/interfaces:
```
auto ens18
iface ens18 inet static
    address 10.160.218.20/24
    gateway 10.160.218.254
    dns-nameservers 8.8.8.8 8.8.4.4
```

Levantar la interfaz:
```bash
ifup ens18
```

## Verificacion

```bash
$ ip a show ens18
2: ens18: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP
    inet 10.160.218.20/24 brd 10.160.218.255 scope global ens18

$ ping -c 2 10.160.218.10
2 packets transmitted, 2 received, 0% packet loss, time 1003ms
rtt min/avg/max/mdev = 0.666/2.157/3.648/1.491 ms
```

## Capturas

![IP configurada y ping al nodo Proxmox](img/ejercicio-2.2-red-configurada.png)

## Resultado
- IP estatica 10.160.218.20/24 configurada correctamente en ens18
- Conectividad con el nodo Proxmox (10.160.218.10) verificada
- Sin acceso a internet (pendiente de habilitar puertos DNS)
