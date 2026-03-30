# Ejercicio 2.4 - Cron y tareas programadas

## Objetivo
Crear un script que registre el uso de disco y programarlo con cron para que se ejecute cada hora.

## Script: backup-disk-usage.sh

Ubicacion: /usr/local/bin/backup-disk-usage.sh

```bash
#!/bin/bash
FECHA=$(date "+%Y-%m-%d %H:%M:%S")
LOG=/var/log/mis-scripts/disk-usage.log
echo "=== $FECHA ===" >> $LOG
df -h >> $LOG
```

## Comandos

Crear directorio de logs:
```bash
mkdir -p /var/log/mis-scripts
```

Dar permisos de ejecucion:
```bash
chmod +x /usr/local/bin/backup-disk-usage.sh
```

Ejecutar manualmente para verificar:
```bash
/usr/local/bin/backup-disk-usage.sh
cat /var/log/mis-scripts/disk-usage.log
```

Programar con cron (cada hora en punto):
```bash
crontab -e
# Añadir la linea:
0 * * * * /usr/local/bin/backup-disk-usage.sh
```

Verificar crontab:
```bash
crontab -l
```

## Capturas

![Salida del log con uso de disco](img/ejercicio-2.4-disk-usage-log.png)

![Crontab configurado](img/ejercicio-2.4-crontab.png)

## Resultado
- Script creado en la VM debian13 (10.160.218.20)
- Registra fecha y uso de disco en /var/log/mis-scripts/disk-usage.log
- Programado con cron para ejecutarse cada hora
