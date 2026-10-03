# =============================================================================
# SNHCE - Sistema Nacional de Historia Clínica Electrónica
# Configuración de HashiCorp Vault
# =============================================================================
#
# ADVERTENCIA DE SEGURIDAD:
#   Esta configuración es para DESARROLLO LOCAL ÚNICAMENTE.
#   En PRODUCCIÓN es OBLIGATORIO:
#     1. Habilitar TLS con certificado válido (tls_cert_file / tls_key_file)
#     2. Usar un backend de almacenamiento distribuido (Consul, Raft integrado)
#     3. Configurar alta disponibilidad (HA) con al menos 3 nodos
#     4. Deshabilitar la interfaz UI o restringirla por IP
#     5. Configurar audit logging hacia un SIEM
#     6. Eliminar VAULT_DEV_ROOT_TOKEN_ID y usar unseal keys seguras
#     7. Almacenar las unseal keys en un HSM o KMS del proveedor cloud
#
# Referencia: https://developer.hashicorp.com/vault/docs/configuration
# =============================================================================

# -----------------------------------------------------------------------------
# Backend de almacenamiento
# En desarrollo: almacenamiento en sistema de archivos local del contenedor
# EN PRODUCCIÓN: usar integrated_storage (Raft) o Consul para HA
# -----------------------------------------------------------------------------
storage "file" {
  # Ruta dentro del contenedor donde Vault almacena sus datos cifrados
  path = "/vault/data"
}

# Ejemplo de configuración Raft para producción (comentado):
# storage "raft" {
#   path    = "/vault/data"
#   node_id = "vault-node-1"
#
#   retry_join {
#     leader_api_addr = "https://vault-node-2.snhce.internal:8200"
#   }
#   retry_join {
#     leader_api_addr = "https://vault-node-3.snhce.internal:8200"
#   }
# }

# -----------------------------------------------------------------------------
# Listener TCP - Punto de acceso al API de Vault
# EN PRODUCCIÓN: tls_disable DEBE ser 0 y se deben configurar certificados TLS
# -----------------------------------------------------------------------------
listener "tcp" {
  # Escuchar en todas las interfaces para ser accesible desde los contenedores
  address = "0.0.0.0:8200"

  # ADVERTENCIA: TLS deshabilitado solo para desarrollo local.
  # EN PRODUCCIÓN: cambiar a 0 y configurar tls_cert_file / tls_key_file
  tls_disable = 1

  # Configuración TLS para producción (comentada):
  # tls_disable      = 0
  # tls_cert_file    = "/vault/tls/vault-cert.pem"
  # tls_key_file     = "/vault/tls/vault-key.pem"
  # tls_client_ca_file = "/vault/tls/ca-cert.pem"
  # tls_min_version  = "tls13"

  # Headers de respuesta para seguridad adicional
  # Descomentar en producción:
  # x_forwarded_for_authorized_addrs = "10.0.0.0/8"
}

# -----------------------------------------------------------------------------
# Dirección de la API de Vault
# Usada por los clientes para conectarse al servidor
# -----------------------------------------------------------------------------
api_addr = "http://0.0.0.0:8200"

# En producción usar HTTPS:
# api_addr = "https://vault.snhce.internal:8200"

# -----------------------------------------------------------------------------
# Dirección del cluster (para configuración HA con Raft)
# Descomentar en producción con múltiples nodos
# -----------------------------------------------------------------------------
# cluster_addr = "https://vault-node-1.snhce.internal:8201"

# -----------------------------------------------------------------------------
# Interfaz web de administración de Vault
# Facilita la gestión visual de secretos durante el desarrollo
# EN PRODUCCIÓN: considerar deshabilitar (ui = false) o restringir por red
# -----------------------------------------------------------------------------
ui = true

# -----------------------------------------------------------------------------
# Configuración de telemetría (opcional, para Prometheus/Grafana)
# Descomentar para habilitar métricas de Vault
# -----------------------------------------------------------------------------
# telemetry {
#   prometheus_retention_time = "30s"
#   disable_hostname          = true
# }

# -----------------------------------------------------------------------------
# Registro de auditoría
# EN PRODUCCIÓN: es OBLIGATORIO habilitar al menos un dispositivo de auditoría
# Configurar desde el CLI de Vault:
#   vault audit enable file file_path=/vault/logs/audit.log
#   vault audit enable syslog tag="vault" facility="AUTH"
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# Configuración de sellado/desellado automático con KMS
# (Cloud KMS para producción, evita el desellado manual)
# Descomentar y configurar según el proveedor cloud:
# -----------------------------------------------------------------------------
# seal "awskms" {
#   region     = "us-east-1"
#   kms_key_id = "arn:aws:kms:..."
# }

# seal "gcpckms" {
#   project    = "snhce-proyecto"
#   region     = "us-central1"
#   key_ring   = "vault-key-ring"
#   crypto_key = "vault-unseal-key"
# }

# -----------------------------------------------------------------------------
# Tiempo máximo de duración de lease por defecto
# -----------------------------------------------------------------------------
default_lease_ttl = "168h"   # 7 días
max_lease_ttl     = "720h"   # 30 días
