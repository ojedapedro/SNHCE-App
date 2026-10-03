#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# SNHCE - DAST & SAST Baseline Script
# Se ejecuta en el CI/CD (.github/workflows/ci.yml)
# ─────────────────────────────────────────────────────────────────────────────

# 1. SAST - Escaneo de código estático usando Semgrep (OWASP Top 10)
echo "[$(date)] Ejecutando Semgrep SAST..."
semgrep scan --config="p/owasp-top-ten" --config="p/typescript" --error

# 2. Análisis de Vulnerabilidades en Dependencias y Contenedores (Trivy)
echo "[$(date)] Ejecutando escaneo Trivy..."
trivy image --severity HIGH,CRITICAL registry.snhce.gob.ve/snhce/backend:latest

# 3. DAST - Pruebas de penetración automatizadas (OWASP ZAP)
# Requiere que el contenedor backend esté corriendo en localhost:3000
echo "[$(date)] Levantando entorno temporal para DAST..."
docker-compose up -d backend postgres redis
sleep 15 # Esperar a que el backend levante

echo "[$(date)] Ejecutando OWASP ZAP Baseline Scan..."
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000/api/v1/health \
  -J zap_report.json \
  -r zap_report.html \
  -a # (Activa escaneo Ajax Spider para SPA, opcional según nivel)

# Limpieza
docker-compose stop
echo "[$(date)] Finalizado. Reportes guardados."
