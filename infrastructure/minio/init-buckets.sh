#!/usr/bin/env bash
# =============================================================================
# SNHCE - Sistema Nacional de Historia Clínica Electrónica
# Script de inicialización de buckets en MinIO
# =============================================================================
#
# PROPÓSITO:
#   Crea y configura los buckets de MinIO requeridos por el sistema SNHCE:
#     - snhce-documents : Documentos clínicos cifrados en reposo
#     - snhce-results   : Resultados de laboratorio e imágenes diagnósticas
#     - snhce-backups   : Respaldos de la base de datos
#
# USO:
#   Ejecutar después de que el contenedor de MinIO esté en funcionamiento:
#   docker exec snhce-minio sh -c "MINIO_ROOT_USER=... MINIO_ROOT_PASSWORD=... /init-buckets.sh"
#
#   O directamente desde el host (requiere mc instalado):
#   MINIO_ROOT_USER=admin MINIO_ROOT_PASSWORD=secret ./init-buckets.sh
#
# VARIABLES DE ENTORNO REQUERIDAS:
#   MINIO_ROOT_USER     : Usuario administrador de MinIO
#   MINIO_ROOT_PASSWORD : Contraseña del administrador de MinIO
#   MINIO_ENDPOINT      : URL del endpoint de MinIO (por defecto: http://minio:9000)
#
# DEPENDENCIAS:
#   - mc (MinIO Client): https://min.io/docs/minio/linux/reference/minio-mc.html
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Variables de configuración
# -----------------------------------------------------------------------------
MINIO_ALIAS="snhce-minio"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-snhce-minio-admin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:?La variable MINIO_ROOT_PASSWORD es obligatoria}"

# Nombres de los buckets del sistema
BUCKET_DOCUMENTOS="snhce-documents"
BUCKET_RESULTADOS="snhce-results"
BUCKET_RESPALDOS="snhce-backups"

# Colores para la salida en consola
VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
ROJO='\033[0;31m'
AZUL='\033[0;34m'
SIN_COLOR='\033[0m'

log_info() {
    echo -e "${VERDE}[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]${SIN_COLOR} $1"
}

log_warn() {
    echo -e "${AMARILLO}[$(date '+%Y-%m-%d %H:%M:%S')] [AVISO]${SIN_COLOR} $1"
}

log_error() {
    echo -e "${ROJO}[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR]${SIN_COLOR} $1"
}

log_step() {
    echo -e "${AZUL}[$(date '+%Y-%m-%d %H:%M:%S')] [PASO]${SIN_COLOR} $1"
}

# -----------------------------------------------------------------------------
# Verificar que mc esté disponible
# -----------------------------------------------------------------------------
if ! command -v mc &> /dev/null; then
    log_error "El cliente mc (MinIO Client) no está instalado."
    log_error "Instalar desde: https://min.io/docs/minio/linux/reference/minio-mc.html"
    exit 1
fi

log_info "mc versión: $(mc --version | head -1)"

# -----------------------------------------------------------------------------
# PASO 1: Esperar a que MinIO esté disponible
# -----------------------------------------------------------------------------
log_step "Verificando disponibilidad de MinIO en ${MINIO_ENDPOINT}..."

for i in $(seq 1 15); do
    if curl -sf "${MINIO_ENDPOINT}/minio/health/live" > /dev/null 2>&1; then
        log_info "MinIO está activo y accesible."
        break
    fi
    log_warn "Intento $i/15: MinIO no está disponible. Esperando 4 segundos..."
    sleep 4
    if [ "$i" -eq 15 ]; then
        log_error "No se pudo conectar a MinIO después de 15 intentos. Abortando."
        exit 1
    fi
done

# -----------------------------------------------------------------------------
# PASO 2: Configurar alias de mc para este servidor MinIO
# -----------------------------------------------------------------------------
log_step "Configurando alias '${MINIO_ALIAS}' en mc..."

mc alias set "${MINIO_ALIAS}" \
    "${MINIO_ENDPOINT}" \
    "${MINIO_ROOT_USER}" \
    "${MINIO_ROOT_PASSWORD}" \
    --api s3v4 \
    --quiet

log_info "Alias '${MINIO_ALIAS}' configurado exitosamente."

# -----------------------------------------------------------------------------
# Función auxiliar: crear bucket si no existe
# -----------------------------------------------------------------------------
crear_bucket() {
    local bucket_name="$1"
    local descripcion="$2"

    log_step "Procesando bucket '${bucket_name}' (${descripcion})..."

    if mc ls "${MINIO_ALIAS}/${bucket_name}" > /dev/null 2>&1; then
        log_warn "El bucket '${bucket_name}' ya existe. Omitiendo creación."
    else
        mc mb "${MINIO_ALIAS}/${bucket_name}" --quiet
        log_info "Bucket '${bucket_name}' creado exitosamente."
    fi
}

# -----------------------------------------------------------------------------
# PASO 3: Crear bucket de documentos clínicos
# Almacena: HCEs, prescripciones, notas médicas, consentimientos informados
# Los documentos se cifran en el lado del cliente antes de ser almacenados
# (cifrado de sobre con claves gestionadas por Vault)
# -----------------------------------------------------------------------------
crear_bucket "${BUCKET_DOCUMENTOS}" "Documentos clínicos cifrados en reposo"

# Habilitar versionado para trazabilidad de cambios en documentos clínicos
log_info "Habilitando versionado en '${BUCKET_DOCUMENTOS}'..."
mc version enable "${MINIO_ALIAS}/${BUCKET_DOCUMENTOS}" --quiet
log_info "Versionado habilitado en '${BUCKET_DOCUMENTOS}'."

# Configurar política de ciclo de vida: eliminar versiones antiguas después de 365 días
log_info "Configurando política de ciclo de vida en '${BUCKET_DOCUMENTOS}'..."
mc ilm rule add \
    --expire-days 365 \
    --noncurrent-expire-days 365 \
    "${MINIO_ALIAS}/${BUCKET_DOCUMENTOS}" \
    2>/dev/null || log_warn "No se pudo configurar ILM en '${BUCKET_DOCUMENTOS}' (puede ser limitación de la versión)."

# Política de acceso: privado (sin acceso anónimo)
mc anonymous set none "${MINIO_ALIAS}/${BUCKET_DOCUMENTOS}" --quiet
log_info "Política de acceso 'privado' aplicada a '${BUCKET_DOCUMENTOS}'."

# Agregar etiquetas al bucket para identificación y cumplimiento normativo
mc tag set "${MINIO_ALIAS}/${BUCKET_DOCUMENTOS}" \
    "sistema=snhce" \
    "tipo=documentos-clinicos" \
    "clasificacion=confidencial" \
    "cifrado=aes256-sobre" \
    "normativa=LOPD-Venezuela" \
    --quiet 2>/dev/null || log_warn "No se pudieron aplicar etiquetas a '${BUCKET_DOCUMENTOS}'."

log_info "Bucket '${BUCKET_DOCUMENTOS}' configurado completamente."
echo ""

# -----------------------------------------------------------------------------
# PASO 4: Crear bucket de resultados e imágenes diagnósticas
# Almacena: resultados de laboratorio, imágenes DICOM, radiografías, ecografías
# Se usa versionado para preservar historial de resultados
# -----------------------------------------------------------------------------
crear_bucket "${BUCKET_RESULTADOS}" "Resultados de laboratorio e imágenes diagnósticas"

# Habilitar versionado para preservar historial de estudios diagnósticos
log_info "Habilitando versionado en '${BUCKET_RESULTADOS}'..."
mc version enable "${MINIO_ALIAS}/${BUCKET_RESULTADOS}" --quiet
log_info "Versionado habilitado en '${BUCKET_RESULTADOS}'."

# Política de acceso: privado
mc anonymous set none "${MINIO_ALIAS}/${BUCKET_RESULTADOS}" --quiet
log_info "Política de acceso 'privado' aplicada a '${BUCKET_RESULTADOS}'."

# Etiquetas del bucket
mc tag set "${MINIO_ALIAS}/${BUCKET_RESULTADOS}" \
    "sistema=snhce" \
    "tipo=resultados-diagnosticos" \
    "clasificacion=confidencial" \
    "formatos=pdf,dicom,jpg,png" \
    "normativa=LOPD-Venezuela" \
    --quiet 2>/dev/null || log_warn "No se pudieron aplicar etiquetas a '${BUCKET_RESULTADOS}'."

log_info "Bucket '${BUCKET_RESULTADOS}' configurado completamente."
echo ""

# -----------------------------------------------------------------------------
# PASO 5: Crear bucket de respaldos de la base de datos
# Almacena: volcados de PostgreSQL, archivos WAL y snapshots de Vault
# Política de retención: 30 días para respaldos diarios, 365 días para mensuales
# -----------------------------------------------------------------------------
crear_bucket "${BUCKET_RESPALDOS}" "Respaldos de la base de datos y archivos de recuperación"

# Sin versionado en respaldos (los archivos no se modifican, solo se agregan)
log_info "Configurando retención de objetos en '${BUCKET_RESPALDOS}'..."

# Política de ciclo de vida: expirar respaldos diarios después de 30 días
mc ilm rule add \
    --expire-days 30 \
    --prefix "daily/" \
    "${MINIO_ALIAS}/${BUCKET_RESPALDOS}" \
    2>/dev/null || log_warn "No se pudo configurar ILM diario en '${BUCKET_RESPALDOS}'."

# Política de ciclo de vida: expirar respaldos mensuales después de 365 días
mc ilm rule add \
    --expire-days 365 \
    --prefix "monthly/" \
    "${MINIO_ALIAS}/${BUCKET_RESPALDOS}" \
    2>/dev/null || log_warn "No se pudo configurar ILM mensual en '${BUCKET_RESPALDOS}'."

# Política de acceso: privado
mc anonymous set none "${MINIO_ALIAS}/${BUCKET_RESPALDOS}" --quiet
log_info "Política de acceso 'privado' aplicada a '${BUCKET_RESPALDOS}'."

# Etiquetas del bucket
mc tag set "${MINIO_ALIAS}/${BUCKET_RESPALDOS}" \
    "sistema=snhce" \
    "tipo=respaldos" \
    "clasificacion=critico" \
    "retencion-diaria=30-dias" \
    "retencion-mensual=365-dias" \
    --quiet 2>/dev/null || log_warn "No se pudieron aplicar etiquetas a '${BUCKET_RESPALDOS}'."

log_info "Bucket '${BUCKET_RESPALDOS}' configurado completamente."
echo ""

# -----------------------------------------------------------------------------
# PASO 6: Crear usuario de servicio para el backend (acceso limitado)
# En producción, el backend NO debe usar el usuario raíz de MinIO
# -----------------------------------------------------------------------------
log_step "Creando usuario de servicio para el backend..."

BACKEND_ACCESS_KEY="${MINIO_BACKEND_ACCESS_KEY:-snhce-backend-service}"
BACKEND_SECRET_KEY="${MINIO_BACKEND_SECRET_KEY:-DEV_ONLY_BACKEND_SECRET_CHANGE_IN_PRODUCTION!}"

if mc admin user list "${MINIO_ALIAS}" | grep -q "${BACKEND_ACCESS_KEY}" 2>/dev/null; then
    log_warn "El usuario '${BACKEND_ACCESS_KEY}' ya existe. Omitiendo."
else
    mc admin user add "${MINIO_ALIAS}" \
        "${BACKEND_ACCESS_KEY}" \
        "${BACKEND_SECRET_KEY}" \
        --quiet 2>/dev/null || log_warn "No se pudo crear el usuario de servicio (puede requerir permisos adicionales)."
    log_info "Usuario de servicio '${BACKEND_ACCESS_KEY}' creado."
fi

# Política de acceso para el usuario de servicio: lectura/escritura en los 3 buckets
log_info "Aplicando política de acceso al usuario de servicio..."

mc admin policy attach "${MINIO_ALIAS}" readwrite \
    --user "${BACKEND_ACCESS_KEY}" \
    2>/dev/null || log_warn "No se pudo aplicar la política al usuario de servicio."

# -----------------------------------------------------------------------------
# Verificación final: listar todos los buckets creados
# -----------------------------------------------------------------------------
echo ""
echo "============================================================================="
log_info "Verificación final - Buckets disponibles en MinIO:"
echo "============================================================================="
mc ls "${MINIO_ALIAS}" || true
echo ""
echo "  Configuración completada:"
echo "    ✓ ${BUCKET_DOCUMENTOS}  - Documentos clínicos (versionado activado)"
echo "    ✓ ${BUCKET_RESULTADOS}  - Imágenes y resultados (versionado activado)"
echo "    ✓ ${BUCKET_RESPALDOS}   - Respaldos del sistema (ILM configurado)"
echo ""
log_info "Inicialización de buckets MinIO completada exitosamente."
echo "============================================================================="
