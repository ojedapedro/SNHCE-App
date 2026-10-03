#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# SNHCE - Backup Cifrado, Inmutable y de Retención Larga
# Ejecución: Cronjob diario a las 02:00 AM.
# ─────────────────────────────────────────────────────────────────────────────

set -e

DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/tmp/snhce_backups"
DB_NAME="snhce_prod"
GCS_BUCKET="gs://snhce-backups-immutable"
PUBLIC_KEY_PATH="/etc/snhce/keys/backup_public.pem"

mkdir -p $BACKUP_DIR
echo "[$(date)] Iniciando backup de base de datos..."

# 1. Dump de PostgreSQL
DUMP_FILE="$BACKUP_DIR/db_$DATE.sql.gz"
pg_dump -h $PG_HOST -U $PG_USER -d $DB_NAME | gzip > $DUMP_FILE

# 2. Cifrado asimétrico con clave pública (solo descifrable con clave privada resguardada en bóveda)
ENCRYPTED_FILE="$DUMP_FILE.enc"
openssl smime -encrypt -binary -text -aes256 -in $DUMP_FILE -out $ENCRYPTED_FILE -outform DER $PUBLIC_KEY_PATH
echo "[$(date)] Backup cifrado con AES-256 (Envelope PKCS#7)."

# 3. Subida a Object Storage Inmutable (WORM - Write Once Read Many)
# El bucket debe tener políticas de retención activas (Bucket Lock) por ej. 5 años.
echo "[$(date)] Subiendo a almacenamiento inmutable..."
# Se asume uso de gsutil o rclone compatible con S3
gsutil cp $ENCRYPTED_FILE $GCS_BUCKET/db_$DATE.sql.gz.enc

# 4. Limpieza local
rm -f $DUMP_FILE $ENCRYPTED_FILE
echo "[$(date)] Proceso finalizado exitosamente."
