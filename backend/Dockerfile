# ===== Etapa 1: Instalación de dependencias =====
FROM node:20-alpine AS deps

# Instalar pnpm globalmente
RUN npm install -g pnpm@9

WORKDIR /app

# Copiar archivos de manifiesto de dependencias
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# Instalar todas las dependencias (prod + dev para poder compilar)
RUN pnpm install --frozen-lockfile

# Generar cliente Prisma
RUN pnpm prisma:generate

# ===== Etapa de desarrollo (usada por Docker Compose) =====
FROM deps AS development
# En desarrollo montamos el código fuente como volumen, así que el CMD usa watch
CMD ["pnpm", "start:dev"]

# ===== Etapa 2: Compilación de la aplicación =====
FROM deps AS build

WORKDIR /app

# Copiar dependencias instaladas y el cliente Prisma generado desde la etapa anterior
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copiar el código fuente
COPY . .

# Compilar TypeScript a JavaScript
RUN pnpm build

# ===== Etapa 3: Imagen de producción (lean image) =====
# Copiamos node_modules completo desde deps para evitar
# reinstalación dentro del build context del backend
# (el pnpm-lock.yaml raíz no está disponible aquí).
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

# Copiar package.json para metadata
COPY package.json ./

# Copiar node_modules y cliente Prisma generado desde la etapa de deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copiar artefactos compilados
COPY --from=build /app/dist ./dist

# Crear directorio de logs con permisos correctos
RUN mkdir -p /app/logs && chown -R node:node /app/logs /app/dist

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
