# Ejercicio 4.2: Almacenamiento en Proxmox

## Objetivo

Conocer los tipos de almacenamiento disponibles en Proxmox VE, ver cuáles están configurados en el nodo `Practicas` y entender qué tipo de contenido admite cada uno.

## Estado actual del nodo

Comando para listar los almacenamientos configurados:

```bash
sudo pvesm status
```

Salida en el nodo `Practicas`:

```
Name         Type     Status           Total            Used       Available        %
local         dir     active       154635004        14814484       133316560    9.58%
```

En este momento solo hay **un almacenamiento configurado**: `local`, de tipo `dir`, con ~150 GB de capacidad y un 9.5% usado.

Al filtrar por contenido `backup` el almacenamiento aparece, así que ya está preparado para recibir dumps de `vzdump`:

```bash
sudo pvesm status -content backup
```

## Tipos de almacenamiento en Proxmox

Proxmox admite varios backends para almacenamiento de discos de VM, ISOs, plantillas y backups. Los cuatro que pide el curso:

| Tipo | Descripción | Ventajas | Limitaciones |
|------|-------------|----------|--------------|
| **local (Directory)** | Un directorio del sistema de ficheros del nodo (por defecto `/var/lib/vz`). | Simple, cero configuración, funciona sin red. | No se comparte entre nodos del clúster. |
| **NFS** | Servidor NFS externo montado como almacenamiento de Proxmox. | Compartido entre todos los nodos del clúster, backups y migraciones en vivo. | Requiere servidor NFS aparte, depende de la red. |
| **CIFS / SMB** | Recurso compartido estilo Windows (Samba) montado en Proxmox. | Integración con NAS o servidores Windows. | Protocolo más pesado que NFS, peor rendimiento. |
| **ZFS** | Filesystem avanzado con snapshots nativos, compresión, deduplicación y RAID-Z. | Snapshots instantáneos, checksums, fiabilidad alta, muy eficiente. | Consume más RAM, requiere disco(s) dedicado(s) para el pool. |

## Tipos de contenido (content types)

Cada almacenamiento puede aceptar uno o varios tipos de contenido:

| Content | Qué guarda |
|---------|------------|
| `images` | Discos de máquinas virtuales (qcow2, raw, vmdk) |
| `rootdir` | Discos raíz de contenedores LXC |
| `iso` | Imágenes ISO para instalar sistemas |
| `vztmpl` | Plantillas de contenedores LXC |
| `backup` | Copias de seguridad generadas por `vzdump` |
| `snippets` | Ficheros auxiliares (cloud-init, hook scripts) |

## Matriz tipo vs contenido

Qué puede guardar cada tipo de almacenamiento:

| Tipo | images | rootdir | iso | vztmpl | backup | snippets |
|------|:------:|:-------:|:---:|:------:|:------:|:--------:|
| local (dir) | Sí | Sí | Sí | Sí | Sí | Sí |
| NFS | Sí | Sí | Sí | Sí | Sí | Sí |
| CIFS | Sí | Sí | Sí | Sí | Sí | Sí |
| ZFS (zfspool) | Sí | Sí | No | No | No | No |

`dir`, `nfs` y `cifs` son los más versátiles y admiten cualquier contenido. `zfspool` en cambio solo sirve para discos — para ISOs y backups dentro de un mismo sistema ZFS normalmente se crea un *dataset* montado como tipo `dir`.

## Recomendaciones típicas

- **Laboratorio de una sola máquina** (este caso): `local` de tipo `dir` es suficiente.
- **Clúster Proxmox real**: almacenamiento compartido (NFS o iSCSI) para discos, más ZFS local para datos rápidos.
- **Backups largos**: idealmente un storage separado del de los discos para que un fallo no se lleve todo.

## Pendiente en el día 5

El día 5 del Módulo 4 incluye también los puntos 2 y 3, que se harán en otra sesión:

- **Punto 2:** `vzdump` — crear backup de una VM, programarlo y configurar retención.
- **Punto 3:** Restauración de backups con otro VMID.
