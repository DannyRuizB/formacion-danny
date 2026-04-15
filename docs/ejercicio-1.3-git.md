# Ejercicio 1.3 - Repositorio de documentacion

## Objetivo
Crear un repositorio Git con estructura organizada, practicar commits, ramas y merge.

## Comandos

Crear el repositorio y la estructura:
```bash
mkdir -p ~/formacion-danny/{docs,scripts,configs}
cd ~/formacion-danny
git init
```

Configurar Git (nombre y email que aparecen en los commits):
```bash
git config user.name "Danny Ruiz Boluda"
git config user.email "danny@zataca.com"
```

Crear .gitignore para excluir ficheros que no deben ir al repositorio:
```bash
# .gitignore
*.pyc
__pycache__/
node_modules/
.env
*.log
site/
```

!!! tip "Buenas practicas con .gitignore"
    Siempre crear un .gitignore al inicio del proyecto. Evita subir al repositorio ficheros temporales, dependencias (node_modules), secretos (.env) o builds generados (site/).

Crear README.md y primer commit:
```bash
git add .
git commit -m "Inicio del repositorio de formacion"
```

Crear rama feature/semana1 y trabajar en ella:
```bash
git checkout -b feature/semana1
# Se añadio el progreso de la semana 1 al README.md
git add README.md
git commit -m "Añadir progreso semana 1"
```

Volver a main y hacer merge:
```bash
git checkout main
git merge feature/semana1
```

## Historial de commits

```bash
$ git log --oneline
421295a (HEAD -> main, feature/semana1) Añadir progreso semana 1
2b9044f Entregable lunes: captura acceso SSH al servidor de practicas
8fed098 Añadir seccion de capturas en ejercicios 1.1 y 1.2
fddd68e Ejercicio 1.2: procesos y servicios con Nginx
113b9ad Ejercicio 1.1: gestion de usuarios y grupos
0becee4 Inicio del repositorio de formacion
```

## Estructura del repositorio

```
formacion-danny/
├── README.md
├── docs/
│   ├── img/
│   │   └── acceso-ssh-servidor.png
│   ├── entregable-semana1-lunes.md
│   ├── ejercicio-1.1-usuarios.md
│   └── ejercicio-1.2-procesos-servicios.md
├── scripts/
└── configs/
```

## Buenas practicas de Git

| Practica | Descripcion |
|----------|-------------|
| Commits atomicos | Cada commit debe ser un cambio logico completo, no mezclar cosas |
| Mensajes descriptivos | Escribir que se hizo y por que, no solo "cambios" |
| Ramas por funcionalidad | Trabajar en ramas separadas y hacer merge a main cuando este listo |
| .gitignore desde el inicio | Evitar subir ficheros que no deben estar en el repositorio |
| No subir secretos | Nunca commitear contraseñas, tokens o ficheros .env |

Ejemplo de flujo de trabajo con ramas:
```
main ──────●────────────●──── (merge)
            \          /
feature/x    ●───●───●
```

## Resultado
- Repositorio creado con estructura docs/, scripts/, configs/
- .gitignore configurado para excluir ficheros temporales y builds
- 6 commits realizados con mensajes descriptivos
- Rama feature/semana1 creada, trabajada y mergeada a main
- Este repositorio se usa durante todo el curso para los entregables
