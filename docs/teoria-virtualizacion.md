# Teoria - Virtualizacion y Proxmox VE

## Objetivo
Entender los conceptos fundamentales de virtualizacion, los tipos de hipervisores, la diferencia entre contenedores y maquinas virtuales, y la arquitectura de Proxmox VE.

## Que es la virtualizacion

La **virtualizacion** es la tecnologia que permite ejecutar varios sistemas operativos (huespedes o *guests*) sobre un mismo hardware fisico (anfitrion o *host*). Se consigue mediante una capa de software llamada **hipervisor** que abstrae los recursos fisicos (CPU, RAM, disco, red) y los presenta como recursos virtuales a las VMs.

### Beneficios
- **Consolidacion**: varios servidores virtuales en un unico servidor fisico
- **Aislamiento**: si una VM falla, no afecta al resto
- **Portabilidad**: las VMs se pueden mover entre nodos (migracion en vivo)
- **Snapshots**: capturas del estado que permiten volver atras
- **Escalabilidad**: cambiar CPU, RAM o disco sin reinstalar
- **Entornos de prueba**: crear laboratorios aislados rapidamente

## Tipos de virtualizacion

### Hipervisor tipo 1 (bare-metal)

Se instala directamente sobre el hardware fisico, sin sistema operativo anfitrion intermedio. Es mas eficiente y seguro, tipico de entornos de produccion.

```
+--------------------------------------+
|  VM1   |  VM2   |  VM3   |  VM4      |
|  Linux |  Linux | Windows|  Debian   |
+--------------------------------------+
|         HIPERVISOR (tipo 1)          |
+--------------------------------------+
|         HARDWARE FISICO              |
+--------------------------------------+
```

**Ejemplos**: Proxmox VE, VMware ESXi, Microsoft Hyper-V, XenServer, KVM (con Linux minimo).

### Hipervisor tipo 2 (hosted)

Se ejecuta como una aplicacion dentro de un sistema operativo anfitrion. Mas sencillo de instalar pero con mayor sobrecarga.

```
+--------------------------------------+
|  VM1   |  VM2                        |
|  Linux | Windows                     |
+--------------------------------------+
|      HIPERVISOR (tipo 2)             |
+--------------------------------------+
|  SISTEMA OPERATIVO ANFITRION         |
+--------------------------------------+
|         HARDWARE FISICO              |
+--------------------------------------+
```

**Ejemplos**: VirtualBox, VMware Workstation, Parallels Desktop, QEMU (sin KVM).

## Principales hipervisores

| Hipervisor | Tipo | Licencia | Caracteristicas |
|------------|------|----------|-----------------|
| **Proxmox VE** | 1 | Open source (AGPL) | Basado en KVM + LXC. Interfaz web. Clusters, HA, backups. |
| **KVM** | 1 | Open source (GPL) | Modulo del kernel Linux. Base de muchos hipervisores. |
| **VMware ESXi** | 1 | Propietario | Estandar empresarial. Licencia de pago. vCenter para gestion. |
| **Microsoft Hyper-V** | 1 | Propietario | Integrado en Windows Server. Buen soporte Windows. |
| **VirtualBox** | 2 | Open source (GPL) | Escritorio. Facil de usar. Oracle. |
| **VMware Workstation** | 2 | Propietario | Escritorio profesional. |

## Contenedores LXC vs maquinas virtuales

Son dos tecnologias de virtualizacion con diferentes niveles de aislamiento.

### Maquina virtual (VM)
- Virtualiza el **hardware** completo
- Cada VM tiene su propio kernel y sistema operativo
- Aislamiento fuerte (como un servidor fisico independiente)
- Mas recursos (cada VM carga su propio SO)
- Arranque mas lento (segundos a minutos)

### Contenedor LXC
- Virtualiza a nivel de **sistema operativo** (no el hardware)
- Todos los contenedores comparten el kernel del host
- Aislamiento a nivel de procesos, red, filesystem
- Muy ligero (solo libs + apps, sin kernel extra)
- Arranque casi instantaneo

### Comparativa

| Aspecto | Maquina Virtual (KVM) | Contenedor (LXC) |
|---------|----------------------|-------------------|
| Nivel virtualizacion | Hardware completo | Sistema operativo |
| Kernel | Propio | Compartido con host |
| Aislamiento | Fuerte | Debil (kernel compartido) |
| SO huesped | Cualquiera (Linux, Windows, BSD) | Solo Linux |
| Consumo RAM | Alto (500MB-2GB base) | Bajo (10-100MB base) |
| Arranque | Segundos o minutos | Casi instantaneo |
| Uso tipico | SOs diferentes, entornos criticos | Apps aisladas Linux, microservicios |

### Diferencia con contenedores Docker
LXC es un contenedor de **sistema** (arranca un SO completo tipo init + servicios). Docker es un contenedor de **aplicacion** (una sola app por contenedor, efimero). Proxmox soporta LXC; Docker se usa por separado.

## Proxmox VE

### Que es
**Proxmox Virtual Environment** (PVE) es una plataforma de virtualizacion open source basada en Debian que combina:
- **KVM** para maquinas virtuales completas
- **LXC** para contenedores ligeros
- **Interfaz web** integrada (puerto 8006)
- **Cluster multi-nodo** con alta disponibilidad (HA)
- **Backups integrados** (vzdump)
- **Almacenamiento flexible** (local, NFS, Ceph, ZFS, iSCSI)

### Arquitectura
```
+---------------------------------------------------------+
|                  Interfaz web (puerto 8006)             |
+---------------------------------------------------------+
|   qm (CLI VMs)  |  pct (CLI LXC)  |  vzdump (backups)   |
+---------------------------------------------------------+
|         KVM (VMs)        |         LXC (CT)             |
+---------------------------------------------------------+
|                   Debian GNU/Linux                      |
+---------------------------------------------------------+
|                    Hardware fisico                      |
+---------------------------------------------------------+
```

### Interfaz web - componentes principales

Al entrar en `https://10.160.218.10:8080/` (redireccionado desde 8006) aparecen estas secciones en el arbol izquierdo:

#### Datacenter
Nivel global. Configuracion del cluster, usuarios, permisos, opciones de almacenamiento.

#### Nodos
Cada servidor fisico del cluster aparece como un nodo. En el laboratorio hay uno solo: `Practicas`. Al hacer clic se ve:
- **Summary**: CPU, RAM, carga, uptime
- **Shell**: terminal web del nodo
- **System**: red, DNS, hostname, certificados
- **Updates**: apt update/upgrade
- **Syslog**: logs del sistema
- **Firewall**: reglas iptables

#### VMs (maquinas virtuales)
Cada VM tiene un ID (100, 101, 1002...). Opciones por VM:
- **Summary**: estado, CPU, RAM, disco
- **Console**: acceso grafico (noVNC/SPICE)
- **Hardware**: discos, red, CPU, memoria, opciones de arranque
- **Cloud-init**: configuracion automatica al arranque (usuario, SSH keys, red)
- **Options**: nombre, arranque al inicio, proteccion
- **Snapshots**: capturas del estado
- **Backup**: tareas de backup
- **Task History**: historial de operaciones

#### CTs (contenedores LXC)
Similar a VMs pero para contenedores LXC. IDs tambien numericos.

#### Almacenamiento
Recursos para guardar discos VM, ISOs, templates CT, backups.

#### Red
Bridges (`vmbr0`), VLANs, bonds (agregacion de enlaces).

### Conceptos clave

#### Templates (plantillas)
Una VM o CT puede convertirse en **template**. No se ejecuta, pero permite clonar rapidamente nuevas instancias identicas. Util para provisionar muchos servidores iguales.

#### Snapshots
Captura puntual del estado de una VM/CT (disco + RAM + config). Permite volver atras si algo falla. No es un backup (vive en el mismo disco). Se usa antes de actualizaciones o cambios arriesgados.

#### Backups (vzdump)
Copia completa e independiente de la VM/CT. Se puede programar (`Datacenter -> Backup`), con retencion configurable, a almacenamiento local o remoto (NFS, CIFS). Formatos: `.vma.zst` (VM), `.tar.zst` (LXC).

#### Clones
Copia de una VM/CT. Puede ser:
- **Linked clone**: comparte disco base con el original (ocupa menos)
- **Full clone**: copia completa e independiente

#### HA (High Availability)
En clusters de 3+ nodos, si un nodo cae, Proxmox mueve automaticamente las VMs a otro nodo disponible. Requiere almacenamiento compartido (Ceph, NFS...).

#### Migration
Mover una VM entre nodos del cluster:
- **Offline migration**: con la VM apagada
- **Live migration**: en caliente, sin cortar servicio

## Proxmox en el laboratorio

El entorno de practicas es una instalacion de Proxmox VE 8.4.17 en:
- **Nodo**: Practicas (antes `debian12`, renombrado)
- **IP**: 10.160.218.10
- **Cluster**: mi-cluster (un solo nodo)
- **Acceso web**: `https://10.160.218.10:8080/` (redireccion 8080 -> 8006)
- **Usuario**: soltecsis

Particularidad: el Proxmox de practicas **es a su vez una VM** dentro de otro Proxmox superior. Por eso **no tiene KVM disponible** (no hay VT-x anidado) y las VMs se ejecutan emuladas con `qemu64` (mas lentas, pero funcionales).

### VMs existentes en el laboratorio

| ID | Nombre | IP | Rol |
|----|--------|----|----|
| 1002 | cliente1 | 10.160.218.20 | Servidor (Nginx, BIND9, DHCP, API) |
| 1003 | cliente2 | 10.160.218.100 (DHCP) | Cliente (clon de cliente1) |

## Resultado
- Comprendidos los tipos de virtualizacion (tipo 1 bare-metal, tipo 2 hosted)
- Identificadas las diferencias entre VMs y contenedores LXC
- Conocidos los principales hipervisores del mercado
- Entendida la arquitectura de Proxmox VE (KVM + LXC + interfaz web)
- Revisados los conceptos clave: templates, snapshots, backups, clones, HA, migracion
