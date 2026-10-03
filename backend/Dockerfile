# ===== Etapa 1: Instalación de dependencias =====
FROM node:20-alpine AS deps

# Instalar pnpm globalmente
RUN npm install -g pnpm@9

WORKDIR /app

# Copiar archivos de manifiesto de dependencias
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# Instalar dependencias con lockfile congelado para reproducibilidad
RUN pnpm install --frozen-lockfile

# Generar cliente Prisma
RUN pnpm prisma:generate

# ===== Etapa 2: Compilación de la aplicación =====
FROM node:20-alpine AS build

RUN npm install -g pnpm@9

WORKDIR /app

# Copiar dependencias instaladas desde la etapa anterior
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copiar el código fuente
COPY . .

# Compilar TypeScript a JavaScript
RUN pnpm build

# ===== Etapa 3: Imagen de producción =====
FROM node:20-alpine AS production

# Metadatos de la imagen
LABEL maintainer="MPPS Venezuela <stic@mpps.gob.ve>"
LABEL description="SNHCE Backend - Sistema Nacional de Historias Clínicas Electrónicas"
LABEL version="1.0.0"

# Instalar dependencias de sistema necesarias para runtime
# dumb-init: manejo correcto de señales PID 1
# curl: para health checks
RUN apk add --no-cache dumb-init curl && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Instalar pnpm para instalar solo dependencias de producción
RUN npm install -g pnpm@9

# Copiar package.json para instalar solo prod deps
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# Instalar SOLO dependencias de producción
RUN pnpm install --frozen-lockfile --prod && \
    pnpm prisma:generate && \
    pnpm store prune

# Copiar artefactos compilados
COPY --from=build /app/dist ./dist

# Crear directorio de logs con permisos correctos
RUN mkdir -p /app/logs && chown -R node:node /app/logs

# Ejecutar como usuario no-root por seguridad
USER node

# Exponer el puerto de la aplicación
EXPOSE 3000

# Health check de Docker
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health/live || exit 1

# Usar dumb-init como PID 1 para manejo correcto de señales SIGTERM/SIGINT
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicio
CMD ["node", "dist/main"]
