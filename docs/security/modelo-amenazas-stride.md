# Modelo de Amenazas (STRIDE) - SNHCE

Este documento evalúa los riesgos del Sistema Nacional de Historia Clínica Electrónica utilizando la metodología STRIDE de Microsoft.

## 1. Spoofing (Suplantación de Identidad)
*   **Amenaza:** Un atacante intenta hacerse pasar por un médico para recetar estupefacientes o por un paciente para ver historias ajenas.
*   **Mitigación:** 
    *   Integración con OIDC/Keycloak.
    *   MFA obligatorio (WebAuthn/TOTP) para nivel `COMPLETO` y personal de salud.
    *   Validación presencial (cédula laminada física verificada en taquilla) requerida para elevar privilegios.
    *   Firmas electrónicas cualificadas para recetas y reposos.

## 2. Tampering (Manipulación de Datos)
*   **Amenaza:** Un administrador de base de datos o atacante interno modifica un diagnóstico para ocultar negligencia médica.
*   **Mitigación:**
    *   Bitácora de auditoría de **solo inserción (append-only) con hash encadenado** (SHA-256). Cualquier alteración directa en la DB rompe la cadena.
    *   Registros clínicos inmutables (solo se permiten adendos/anexos versionados).
    *   Cifrado a nivel de campo (Envelope Encryption) para notas clínicas usando llaves maestras en HSM/Vault.

## 3. Repudiation (Repudio)
*   **Amenaza:** Un médico niega haber emitido un reposo o prescripción fraudulenta.
*   **Mitigación:**
    *   Firma electrónica criptográfica atada a la identidad legal del médico.
    *   Registro de IP, Timestamp, User-Agent y Session ID en cada acción mediante el `AuditService`.
    *   Verificación pública por código QR (sin revelar diagnóstico).

## 4. Information Disclosure (Divulgación de Información)
*   **Amenaza:** Fuga masiva de datos clínicos por un endpoint mal protegido o robo de backups.
*   **Mitigación:**
    *   Cifrado en reposo (AES-256) en discos y copias de seguridad (MinIO/Postgres).
    *   Cifrado en tránsito estricto (TLS 1.3).
    *   Autorización ABAC: `RelacionAsistencialGuard` bloquea consultas de historias si no hay una cita o emergencia activa.
    *   Enmascaramiento de datos (seudonimización) en tableros y endpoints públicos.

## 5. Denial of Service (Denegación de Servicio)
*   **Amenaza:** Ataque DDoS o picos masivos al abrir agendas (ej. 8:00 AM) que tumban el sistema central, aislando a los hospitales.
*   **Mitigación:**
    *   Arquitectura **Offline-first**: Nodos locales en CDI/Hospitales que siguen operando y encolan datos en IndexedDB/Redis.
    *   Rate limiting global (`@nestjs/throttler`) y CAPTCHAs en endpoints públicos.
    *   Infraestructura Active-Active en Kubernetes con auto-scaling.

## 6. Elevation of Privilege (Elevación de Privilegios)
*   **Amenaza:** Un usuario administrativo compromete su cuenta para asignarse rol de Médico o Administrador de TI.
*   **Mitigación:**
    *   Flujo de **Doble Aprobación** para cambios de roles sensibles (requiere dos cuentas `ADMIN_TI` distintas).
    *   Monitoreo de anomalías (alertas si un rol administrativo intenta acceder a endpoints `/clinical/*`).
