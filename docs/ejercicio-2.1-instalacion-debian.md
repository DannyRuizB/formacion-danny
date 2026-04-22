# Ejercicio 2.1 - Instalación de Debian 12 en Proxmox

## Objetivo
Instalar un servidor Debian 12 en Proxmox con acceso SSH funcional.

## Datos del entorno

| Elemento | Valor |
|----------|-------|
| Proxmox VE | 8.4.17 |
| Nodo | debian12 (renombrado a Practicas) |
| URL panel | https://10.160.218.10:8080 |
| Red | localnetwork |

## Creación de la VM en Proxmox

Desde el panel web de Proxmox: **Create VM** con la siguiente configuración:

| Parámetro | Valor | Motivo |
|-----------|-------|--------|
| VM ID | 1002 | Siguiente ID disponible |
| Nombre | cliente1 | Sera el servidor de prácticas |
| ISO | Debian 13 (Trixie) netinst | Última versión estable disponible |
| CPU | qemu64, 4 cores | Sin KVM (Proxmox virtualizado dentro de otro Proxmox) |
| RAM | 2048 MB | Suficiente para servicios de red |
| Disco | 32 GB VirtIO Block | Almacenamiento local |
| Red | VirtIO, bridge vmbr0 | Acceso a la red del laboratorio |

!!! note "Sin soporte KVM"
    Al ser un Proxmox dentro de otro Proxmox, no hay VT-x disponible. Se usa emulación con qemu64 en vez de host como tipo de CPU.

## Particionado

Se uso el particionado guiado de Debian con separación de particiones:

| Partición | Punto de montaje | Tamaño | Uso |
|-----------|-----------------|--------|-----|
| /dev/sda1 | / | ~28 GB | Sistema operativo |
| /dev/sda2 | swap | ~2 GB | Memoria virtual |

## Selección de paquetes

Durante la instalación solo se marcaron:

- **SSH server** — acceso remoto
- **Utilidades estandar del sistema** — herramientas básicas de línea de comandos

No se instalo entorno gráfico para mantener el servidor ligero.

## Post-instalación

Una vez arrancada la VM, primeros comandos como root:

```bash
apt update && apt upgrade -y
apt install -y sudo curl wget htop vim net-tools
usermod -aG sudo soltecsis
```

| Paquete | Para que sirve |
|---------|---------------|
| sudo | Ejecutar comandos como root sin cambiar de usuario |
| curl/wget | Descargar ficheros desde la terminal |
| htop | Monitor de procesos interactivo (mejor que top) |
| vim | Editor de texto avanzado |
| net-tools | Comandos de red clasicos (ifconfig, netstat) |

## Servidor de prácticas

- **SO:** Debian 13 Trixie
- **IP:** 10.160.218.20 (configurada en ejercicio 2.2)
- **Usuario:** soltecsis
- **Acceso SSH:** funcional

## VMs creadas

| ID | Nombre | IP | Rol | Estado |
|----|--------|----|-----|--------|
| 1001 | debian13 | - | No en uso | Apagada |
| 1002 | cliente1 | 10.160.218.20 | Servidor | Funciónando |
| 1003 | cliente2 | - | Cliente | Sin configurar |

## Capturas

![Panel de Proxmox con las VMs y shell](img/proxmox-panel-vm.png)

![Acceso SSH al servidor](img/acceso-ssh-servidor.png)

## Resultado
- VM creada con Debian 13 en Proxmox (emulación qemu64, sin KVM)
- Paquetes básicos instalados (sudo, curl, htop, vim, net-tools)
- Usuario soltecsis con permisos sudo
- Acceso SSH verificado
- Servidor listo para configurar red (ejercicio 2.2) y servicios

!!! tip "Pausa recomendada"
    La instalación del sistema base dura lo justo para preparar un coffee. Aprovecha ese rato — va a ser difícil tener tanto tiempo libre una vez que los servicios estén en producción.
