# Extra: Configuracion SSH con alias

## Objetivo
Simplificar las conexiones SSH al laboratorio con alias en `~/.ssh/config`, evitando escribir IPs, usuarios y opciones cada vez.

## El problema

Sin configuracion, cada conexion requiere recordar la IP, usuario y opciones:

```bash
# Conectar al nodo Proxmox
ssh -i ~/.ssh/id_ed25519 soltecsis@10.160.218.10

# Conectar al servidor con tunel para la wiki
ssh -L 8080:localhost:80 soltecsis@10.160.218.20
```

Estos comandos son largos, faciles de equivocarse y dificiles de recordar.

## La solucion: ~/.ssh/config

El fichero `~/.ssh/config` permite definir alias con toda la configuracion predefinida:

```
Host servidor
    HostName 10.160.218.10
    User soltecsis
    IdentityFile ~/.ssh/id_ed25519

Host wiki
    HostName 10.160.218.20
    User soltecsis
    LocalForward 8080 localhost:80
```

## Alias configurados

### `ssh servidor` — Nodo Proxmox

| Parametro | Valor | Descripcion |
|-----------|-------|-------------|
| HostName | 10.160.218.10 | IP del nodo Proxmox |
| User | soltecsis | Usuario SSH |
| IdentityFile | ~/.ssh/id_ed25519 | Clave publica (sin contraseña) |

Usos:

```bash
ssh servidor                        # Shell interactiva
ssh servidor "sudo qm list"         # Ejecutar un comando remoto
ssh servidor "sudo qm start 1003"   # Arrancar una VM
```

### `ssh wiki` — Servidor + tunel web

| Parametro | Valor | Descripcion |
|-----------|-------|-------------|
| HostName | 10.160.218.20 | IP de cliente1 (servidor) |
| User | soltecsis | Usuario SSH |
| LocalForward | 8080 localhost:80 | Tunel: localhost:8080 → puerto 80 del servidor |

Usos:

```bash
ssh wiki                            # Abrir shell + tunel
```

Mientras la sesion este abierta, se puede acceder desde el navegador a:

- `http://wiki.practicas.local:8080` — Wiki de documentacion
- `http://miweb.practicas.local:8080` — Web estatica
- `http://dashboard.practicas.local:8080` — Dashboard de monitorizacion

!!! tip "Solo un tunel a la vez"
    Si abres un segundo `ssh wiki` mientras ya hay uno abierto, veras el aviso `Could not request local forwarding` porque el puerto 8080 ya esta ocupado. La conexion SSH funciona igualmente, solo el tunel no se duplica.

## Como funciona LocalForward

```
┌──────────┐        SSH         ┌──────────┐
│ PC local │ ◄──── tunel ────► │ cliente1 │
│ :8080    │    encriptado      │ :80      │
└──────────┘                    └──────────┘
```

`LocalForward 8080 localhost:80` significa:

1. Todo lo que llegue al **puerto 8080 de tu PC** se envia por el tunel SSH
2. El servidor lo redirige a su **puerto 80** (Nginx)
3. La respuesta vuelve por el mismo tunel

Asi se accede a servicios remotos como si estuvieran en tu maquina local, sin exponer puertos al exterior.

## Resultado
- Conexion al nodo Proxmox con `ssh servidor` (con clave publica, sin contraseña)
- Conexion al servidor de practicas con `ssh wiki` (con tunel automatico)
- Acceso a wiki, web y dashboard desde el navegador local via el tunel
- Toda la configuracion en un solo fichero: `~/.ssh/config`
