# Dockerfile multi-stage de la app Node.js para el ejercicio 4.4
# Stage 1 (builder): instala dependencias de produccion en una capa con npm cache
# Stage 2 (runtime): copia solo lo imprescindible y ejecuta como usuario no-root

FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Usuario no-root para mejorar la seguridad
RUN groupadd --system --gid 1001 miapp \
 && useradd --system --uid 1001 --gid miapp miapp

COPY --from=builder --chown=miapp:miapp /app/node_modules ./node_modules
COPY --chown=miapp:miapp server.js ./

USER miapp
EXPOSE 3000
CMD ["node", "server.js"]
