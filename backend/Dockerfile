# ============================================================
# Dockerfile del backend SNHCE
# IMPORTANTE: El build context debe ser la RAÍZ del monorepo,
# no el directorio backend/. Esto es necesario porque pnpm
# workspace gestiona el pnpm-lock.yaml en la raíz.
#
# Uso en CI:
#   context: .
#   file: ./backend/Dockerfile
# ============================================================

# ===== Etapa 1: Instalación de dependencias =====
FROM node:20-alpine AS deps

# Usar corepack para gestionar pnpm (más limpio que npm install -g)
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

WORKDIR /app

# --- Copiar los manifiestos del workspace primero (mejor cache de capas) ---
# Necesitamos el lockfile de la RAÍZ y todos los package.json del workspace
# para que pnpm resuelva correctamente las dependencias.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copiar package.json de cada workspace member (necesario para resolución de deps)
COPY backend/package.json ./backend/
# Apps y packages — solo el package.json, no el código fuente
COPY packages/ui/package.json ./packages/ui/
COPY packages/i18n/package.json ./packages/i18n/

# Verificar si existen los package.json de apps (pueden no existir en builds tempranos)
COPY apps/portal-paciente/package.json ./apps/portal-paciente/
COPY apps/app-clinica/package.json ./apps/app-clinica/
COPY apps/consola-administrativa/package.json ./apps/consola-administrativa/

# Copiar el schema Prisma (necesario antes de generate)
COPY backend/prisma ./backend/prisma/

# Instalar SOLO las dependencias del backend (y sus workspace deps)
# --filter evita instalar deps de apps frontend
RUN pnpm install --frozen-lockfile --filter=snhce-backend...

# Generar el cliente Prisma
WORKDIR /app/backend
RUN pnpm prisma:generate

# ===== Etapa de desarrollo (usada por Docker Compose local) =====
FROM deps AS development
WORKDIR /app
CMD ["pnpm", "--filter=snhce-backend", "start:dev"]

# ===== Etapa 2: Compilación TypeScript =====
FROM deps AS build

WORKDIR /app

# Copiar el código fuente del backend
COPY backend/src ./backend/src
COPY backend/tsconfig.json backend/tsconfig.build.json backend/nest-cli.json ./backend/

# Compilar (nest build usa tsconfig.build.json que excluye seed.ts y specs)
WORKDIR /app/backend
RUN pnpm build

# ===== Etapa 3: Imagen de producción (minimal) =====
FROM node:20-alpine AS production

LABEL maintainer="MPPS Venezuela <stic@mpps.gob.ve>"
LABEL description="SNHCE Backend - Sistema Nacional de Historias Clínicas Electrónicas"
LABEL version="1.0.0"

# dumb-init: correcto manejo de señales como PID 1 en contenedor
# curl: requerido por HEALTHCHECK
RUN apk add --no-cache dumb-init curl && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copiar package.json de la raíz (requerido por pnpm para resolver paths)
COPY package.json ./

# Copiar node_modules ya instalados desde deps (prod + prisma client)
# Los node_modules de la raíz contienen las dependencias hoisted de pnpm
COPY --from=deps /app/node_modules ./node_modules

# Copiar node_modules del backend (dependencias específicas del workspace)
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copiar el cliente Prisma generado y el schema
COPY --from=deps /app/backend/prisma ./backend/prisma

# Copiar el código compilado
COPY --from=build /app/backend/dist ./backend/dist

# Ajustar permisos del directorio de logs
RUN mkdir -p /app/logs && chown -R node:node /app/logs /app/backend/dist

# Ejecutar como usuario no-root (seguridad)
USER node

EXPOSE 3000

# Health check: verifica que el proceso esté respondiendo
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health/live || exit 1

# dumb-init como PID 1 para SIGTERM correcto al escalar/reiniciar
ENTRYPOINT ["dumb-init", "--"]

# Ejecutar desde la ruta correcta donde están los dist compilados
CMD ["node", "backend/dist/main"]
