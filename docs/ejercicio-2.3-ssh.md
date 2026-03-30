# Ejercicio 2.3 - SSH en profundidad

## Objetivo
Configurar SSH con clave publica, deshabilitar root login y securizar el acceso.

## Comandos

### Crear clave SSH (desde PC local)
```bash
ssh-keygen -t ed25519 -C "danny@zataca"
```

### Copiar clave al servidor
```bash
ssh-copy-id soltecsis@10.160.218.10
```

### Configurar ~/.ssh/config (PC local)
```
Host servidor
    HostName 10.160.218.10
    User soltecsis
    IdentityFile ~/.ssh/id_ed25519
```

Ahora se puede conectar con solo:
```bash
ssh servidor
```

### Securizar SSH en el servidor (/etc/ssh/sshd_config)

Cambios realizados:
```
PermitRootLogin no
PasswordAuthentication no
MaxAuthTries 3
```

Reiniciar el servicio:
```bash
sudo systemctl restart sshd
```

### Verificacion
- Conexion con `ssh servidor` funciona sin contraseña (clave publica)
- Root no puede hacer login por SSH
- Solo se permiten 3 intentos de autenticacion
- Contraseña deshabilitada, solo clave publica

## Pendiente
- Tuneles SSH (necesita Nginx instalado en el servidor, pendiente de internet)

## Resultado
- Clave SSH ed25519 creada y copiada al servidor
- Acceso rapido configurado con ~/.ssh/config
- Servidor SSH securizado: sin root, sin contraseña, max 3 intentos
