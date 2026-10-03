#!/usr/bin/env bash
# =============================================================================
# SNHCE - Sistema Nacional de Historia Clínica Electrónica
# Script de inicialización de secretos en HashiCorp Vault
# =============================================================================
#
# PROPÓSITO:
#   Configura el motor de secretos KV v2, crea los secretos iniciales de
#   desarrollo, define políticas de acceso y habilita el método de
#   autenticación AppRole para el backend de la aplicación.
#
# USO:
#   Ejecutar una sola vez después de iniciar el contenedor de Vault:
#   docker exec snhce-vault sh /vault/scripts/init-secrets.sh
#
# REQUISITOS:
#   - Vault debe estar en ejecución y accesible en $VAULT_ADDR
#   - La variable VAULT_TOKEN debe tener un token con permisos de root
#
# ADVERTENCIA:
#   Todos los valores marcados como [SOLO DEV] son FICTICIOS y solo sirven
#   para el ambiente de desarrollo local. EN PRODUCCIÓN estos valores deben:
#     1. Ser generados criptográficamente de forma segura
#     2. Ser almacenados de forma segura antes de inyectarlos en Vault
#     3. Rotarse periódicamente según la política de seguridad del MPPS
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Variables de configuración
# -----------------------------------------------------------------------------
VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-snhce-vault-dev-root-token}"
SECRETS_PATH="snhce"
POLICY_NAME="snhce-backend"
APPROLE_NAME="snhce-backend"

# Exportar para el CLI de Vault
export VAULT_ADDR
export VAULT_TOKEN

# Colores para la salida en consola
VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
ROJO='\033[0;31m'
SIN_COLOR='\033[0m'

# Función de log con timestamp
log_info() {
    echo -e "${VERDE}[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]${SIN_COLOR} $1"
}

log_warn() {
    echo -e "${AMARILLO}[$(date '+%Y-%m-%d %H:%M:%S')] [AVISO]${SIN_COLOR} $1"
}

log_error() {
    echo -e "${ROJO}[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR]${SIN_COLOR} $1"
}

# -----------------------------------------------------------------------------
# Verificar que Vault esté disponible
# -----------------------------------------------------------------------------
log_info "Verificando disponibilidad de Vault en ${VAULT_ADDR}..."

for i in $(seq 1 10); do
    if vault status -address="${VAULT_ADDR}" > /dev/null 2>&1; then
        log_info "Vault está activo y accesible."
        break
    fi
    log_warn "Intento $i/10: Vault no está disponible. Esperando 3 segundos..."
    sleep 3
    if [ "$i" -eq 10 ]; then
        log_error "No se pudo conectar a Vault después de 10 intentos. Abortando."
        exit 1
    fi
done

# -----------------------------------------------------------------------------
# PASO 1: Habilitar el motor de secretos KV v2
# KV v2 provee versionado de secretos, soft delete y metadata
# -----------------------------------------------------------------------------
log_info "Habilitando motor de secretos KV v2 en la ruta '${SECRETS_PATH}/'..."

if vault secrets list | grep -q "^${SECRETS_PATH}/"; then
    log_warn "El motor de secretos '${SECRETS_PATH}/' ya está habilitado. Omitiendo."
else
    vault secrets enable \
        -path="${SECRETS_PATH}" \
        -description="Secretos del Sistema Nacional de HCE (SNHCE)" \
        kv-v2
    log_info "Motor KV v2 habilitado en '${SECRETS_PATH}/'."
fi

# -----------------------------------------------------------------------------
# PASO 2: Crear secreto de base de datos
# Credenciales de acceso a PostgreSQL
# [SOLO DEV] - Reemplazar con credenciales reales en producción
# -----------------------------------------------------------------------------
log_info "Creando secreto de base de datos en '${SECRETS_PATH}/database'..."

vault kv put "${SECRETS_PATH}/database" \
    host="postgres" \
    port="5432" \
    database="snhce_dev" \
    username="snhce_user" \
    password="DEV_ONLY_CHANGE_IN_PRODUCTION_1234!" \
    url="postgresql://snhce_user:DEV_ONLY_CHANGE_IN_PRODUCTION_1234!@postgres:5432/snhce_dev" \
    replica_url="postgresql://snhce_user:DEV_ONLY_CHANGE_IN_PRODUCTION_1234!@postgres-replica:5432/snhce_dev" \
    max_connections="50" \
    ssl_mode="disable"

log_info "Secreto 'database' creado exitosamente."

# -----------------------------------------------------------------------------
# PASO 3: Crear secreto de claves de cifrado
# Clave maestra AES-256 para cifrado de sobre (envelope encryption)
# La clave de datos (DEK) se cifra con esta clave maestra (KEK)
# [SOLO DEV] - En producción usar clave generada por HSM/KMS
# -----------------------------------------------------------------------------
log_info "Creando secreto de claves de cifrado en '${SECRETS_PATH}/encryption-keys'..."

vault kv put "${SECRETS_PATH}/encryption-keys" \
    active_key_id="snhce-dev-key-v1" \
    "snhce-dev-key-v1_algorithm"="AES-256-GCM" \
    "snhce-dev-key-v1_purpose"="envelope-encryption" \
    "snhce-dev-key-v1_status"="active" \
    "snhce-dev-key-v1_created_at"="2024-01-01T00:00:00Z" \
    "snhce-dev-key-v1_key_material"="DEV_ONLY_BASE64_AES256_KEY_CHANGE_IN_PRODUCTION_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" \
    description="[SOLO DEV] Clave de cifrado de sobre para documentos clínicos. En producción: usar Transit engine de Vault o KMS externo."

log_info "Secreto 'encryption-keys' creado exitosamente."

# -----------------------------------------------------------------------------
# PASO 4: Crear secreto JWT
# Clave para firmar tokens JWT internos del backend
# [SOLO DEV] - En producción usar clave de al menos 512 bits generada con CSPRNG
# -----------------------------------------------------------------------------
log_info "Creando secreto JWT en '${SECRETS_PATH}/jwt'..."

vault kv put "${SECRETS_PATH}/jwt" \
    secret="DEV_ONLY_JWT_SECRET_CHANGE_IN_PRODUCTION_MINIMUM_64_HEX_CHARACTERS_0000000000000000" \
    algorithm="HS512" \
    access_token_ttl_seconds="300" \
    refresh_token_ttl_seconds="28800" \
    issuer="snhce-dev" \
    description="[SOLO DEV] Secreto JWT para ambiente de desarrollo. En producción: rotar cada 90 días."

log_info "Secreto 'jwt' creado exitosamente."

# -----------------------------------------------------------------------------
# PASO 5: Crear secreto de MinIO
# Credenciales de acceso al almacenamiento de objetos
# [SOLO DEV]
# -----------------------------------------------------------------------------
log_info "Creando secreto de MinIO en '${SECRETS_PATH}/minio'..."

vault kv put "${SECRETS_PATH}/minio" \
    endpoint="http://minio:9000" \
    access_key="snhce-minio-admin" \
    secret_key="DEV_ONLY_MINIO_SECRET_CHANGE_IN_PRODUCTION!" \
    bucket_documents="snhce-documents" \
    bucket_results="snhce-results" \
    bucket_backups="snhce-backups" \
    region="us-east-1"

log_info "Secreto 'minio' creado exitosamente."

# -----------------------------------------------------------------------------
# PASO 6: Crear secreto de Keycloak
# Client secret del cliente confidencial del backend
# [SOLO DEV]
# -----------------------------------------------------------------------------
log_info "Creando secreto de Keycloak en '${SECRETS_PATH}/keycloak'..."

vault kv put "${SECRETS_PATH}/keycloak" \
    url="http://keycloak:8080" \
    realm="snhce" \
    client_id="snhce-backend" \
    client_secret="DEV_ONLY_KEYCLOAK_CLIENT_SECRET_CHANGE_IN_PRODUCTION" \
    admin_user="admin" \
    admin_password="DEV_ONLY_KEYCLOAK_ADMIN_PASSWORD_CHANGE_IN_PRODUCTION!"

log_info "Secreto 'keycloak' creado exitosamente."

# -----------------------------------------------------------------------------
# PASO 7: Crear secreto de SMTP
# Configuración del servidor de correo electrónico
# [SOLO DEV] - Apunta a MailDev local
# -----------------------------------------------------------------------------
log_info "Creando secreto SMTP en '${SECRETS_PATH}/smtp'..."

vault kv put "${SECRETS_PATH}/smtp" \
    host="maildev" \
    port="1025" \
    username="" \
    password="" \
    from_address="no-reply@snhce.gob.ve" \
    from_name="SNHCE Sistema Nacional" \
    tls_enabled="false" \
    description="[SOLO DEV] Apunta a MailDev. En producción: configurar servidor SMTP real del MPPS."

log_info "Secreto 'smtp' creado exitosamente."

# -----------------------------------------------------------------------------
# PASO 8: Crear política de acceso para el backend
# La política permite al backend leer (no escribir) todos los secretos de SNHCE
# -----------------------------------------------------------------------------
log_info "Creando política de acceso '${POLICY_NAME}'..."

vault policy write "${POLICY_NAME}" - <<EOF
# =============================================================================
# Política de Vault para el backend de SNHCE
# Permite lectura de todos los secretos bajo la ruta 'snhce/*'
# El backend NO tiene permisos de escritura ni de administración
# =============================================================================

# Lectura de todos los secretos del sistema
path "${SECRETS_PATH}/*" {
  capabilities = ["read", "list"]
}

# Lectura de datos versionados (KV v2 usa 'data/' como prefijo interno)
path "${SECRETS_PATH}/data/*" {
  capabilities = ["read", "list"]
}

# Lectura de metadata de secretos (para verificar versiones)
path "${SECRETS_PATH}/metadata/*" {
  capabilities = ["read", "list"]
}

# Renovación del propio token de acceso
path "auth/token/renew-self" {
  capabilities = ["update"]
}

# Consulta del propio token (para verificar validez)
path "auth/token/lookup-self" {
  capabilities = ["read"]
}
EOF

log_info "Política '${POLICY_NAME}' creada exitosamente."

# -----------------------------------------------------------------------------
# PASO 9: Habilitar método de autenticación AppRole
# AppRole es el método recomendado para autenticación máquina-a-máquina
# -----------------------------------------------------------------------------
log_info "Habilitando método de autenticación AppRole..."

if vault auth list | grep -q "^approle/"; then
    log_warn "AppRole ya está habilitado. Omitiendo."
else
    vault auth enable approle
    log_info "AppRole habilitado exitosamente."
fi

# -----------------------------------------------------------------------------
# PASO 10: Crear rol de AppRole para el backend
# El rol vincula el backend con la política de acceso correspondiente
# -----------------------------------------------------------------------------
log_info "Creando rol AppRole '${APPROLE_NAME}'..."

vault write auth/approle/role/"${APPROLE_NAME}" \
    token_policies="${POLICY_NAME}" \
    token_ttl="1h" \
    token_max_ttl="4h" \
    token_num_uses=0 \
    secret_id_ttl="720h" \
    secret_id_num_uses=0 \
    bind_secret_id=true

log_info "Rol AppRole '${APPROLE_NAME}' creado exitosamente."

# Obtener el Role ID (identificador público del AppRole)
ROLE_ID=$(vault read -field=role_id "auth/approle/role/${APPROLE_NAME}/role-id")
log_info "Role ID del backend: ${ROLE_ID}"

# Generar un Secret ID inicial para desarrollo
SECRET_ID=$(vault write -f -field=secret_id "auth/approle/role/${APPROLE_NAME}/secret-id")
log_warn "Secret ID generado (SOLO DEV, no compartir): ${SECRET_ID}"

# -----------------------------------------------------------------------------
# PASO 11: Habilitar el motor Transit (cifrado como servicio)
# Usado para cifrado de datos sensibles sin exponer las claves
# -----------------------------------------------------------------------------
log_info "Habilitando motor de cifrado Transit..."

if vault secrets list | grep -q "^transit/"; then
    log_warn "El motor Transit ya está habilitado. Omitiendo."
else
    vault secrets enable \
        -description="Motor de cifrado para datos sensibles del SNHCE" \
        transit
    log_info "Motor Transit habilitado."
fi

# Crear clave de cifrado para los datos clínicos
vault write transit/keys/snhce-clinical-data \
    type=aes256-gcm96 \
    exportable=false \
    allow_plaintext_backup=false

log_info "Clave de cifrado 'snhce-clinical-data' creada en Transit."

# Crear clave de cifrado para las credenciales de acceso
vault write transit/keys/snhce-credentials \
    type=aes256-gcm96 \
    exportable=false \
    allow_plaintext_backup=false

log_info "Clave de cifrado 'snhce-credentials' creada en Transit."

# -----------------------------------------------------------------------------
# Resumen final
# -----------------------------------------------------------------------------
echo ""
echo "============================================================================="
log_info "Inicialización de Vault completada exitosamente."
echo "============================================================================="
echo ""
echo "  Secretos creados:"
echo "    - ${SECRETS_PATH}/database"
echo "    - ${SECRETS_PATH}/encryption-keys"
echo "    - ${SECRETS_PATH}/jwt"
echo "    - ${SECRETS_PATH}/minio"
echo "    - ${SECRETS_PATH}/keycloak"
echo "    - ${SECRETS_PATH}/smtp"
echo ""
echo "  Políticas creadas:"
echo "    - ${POLICY_NAME}"
echo ""
echo "  Métodos de autenticación habilitados:"
echo "    - AppRole (rol: ${APPROLE_NAME})"
echo ""
echo "  Motores de secretos habilitados:"
echo "    - KV v2 en '${SECRETS_PATH}/'"
echo "    - Transit (claves: snhce-clinical-data, snhce-credentials)"
echo ""
log_warn "RECORDATORIO: Todos los valores son de SOLO DESARROLLO."
log_warn "En producción, usar credenciales generadas de forma segura."
echo "============================================================================="
