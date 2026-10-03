# Guía de Seguridad — SNHCE

> **Clasificación:** Confidencial  
> **Versión:** 1.0  
> **Fecha:** 2026-10-02

---

## 1. Autenticación y Gestión de Sesiones

### 1.1 Proveedor de identidad
- **Keycloak 24+** como IdP central con OIDC/OAuth 2.0
- Tokens de acceso de **vida corta: 5 minutos** (configurado en realm SNHCE)
- Tokens de refresco: **8 horas** (sesión de trabajo), con refresco rotatorio
- Las cookies de sesión usan: `HttpOnly`, `Secure`, `SameSite=Strict`
- **CSRF**: protegido por SameSite + token de doble submit en formularios sensibles

### 1.2 MFA — Obligatorio para todos los usuarios
| Factor | Estado | Uso |
|---|---|---|
| TOTP (Google Authenticator, Authy) | ✅ Implementado | Factor principal |
| WebAuthn / Passkeys | ✅ Implementado | Factor alternativo recomendado |
| SMS OTP | ⚠️ Solo respaldo | Requiere adaptador externo (simulado en dev) |

### 1.3 Política de contraseñas
- Mínimo **12 caracteres**
- Al menos 1 mayúscula, 1 minúscula, 1 dígito, 1 carácter especial
- No puede contener el nombre de usuario
- Historial de las últimas 10 contraseñas (no puede reutilizar)

### 1.4 Protección contra fuerza bruta
- **5 intentos fallidos** → cuenta bloqueada 30 segundos
- **10 intentos** → bloqueo de 15 minutos
- El desbloqueo manual requiere intervención de `admin_ti`
- Rate limiting por IP: máximo 20 intentos de login por minuto por IP

---

## 2. Autorización

### 2.1 Modelo RBAC + ABAC

**Roles del sistema:**

| Rol | Descripción |
|---|---|
| `PACIENTE` | Usuario final del portal de citas e historia |
| `MEDICO` | Acceso clínico completo con relación asistencial |
| `ENFERMERIA` | Acceso parcial (signos vitales, evolución, medicación) |
| `ADMINISTRATIVO` | Solo identificación y citas, NUNCA contenido clínico |
| `ADMINISTRADOR_DATOS` | Gestión del MPI, catálogos, usuarios |
| `AUDITOR` | Solo lectura de bitácora de auditoría |
| `ADMIN_TI` | Administración técnica del sistema |

**Condiciones ABAC (además del rol):**

Para médicos y enfermería, el acceso a datos clínicos requiere **una de**:
1. Cita activa con el paciente en el establecimiento actual
2. Episodio abierto del paciente asignado al profesional
3. Referencia aceptada hacia el establecimiento actual
4. **Acceso de emergencia (break-glass)** con justificación obligatoria

### 2.2 Acceso de emergencia (break-glass)
1. El médico declara emergencia en el modal correspondiente
2. Debe escribir una **justificación de mínimo 20 caracteres**
3. Debe marcar el checkbox de declaración de emergencia médica
4. El acceso se registra inmediatamente en la bitácora de auditoría
5. Se genera una **alerta automática al comité de auditoría**
6. El acceso es temporal (expira al cerrar el episodio o en 4 horas)
7. Se revisa obligatoriamente en la próxima sesión de auditoría

### 2.3 Paciente — Niveles de cuenta
| Nivel | Qué puede hacer |
|---|---|
| `BASICO` | Solicitar citas, ver sus citas, gestionar perfil |
| `COMPLETO` | Todo lo anterior + ver su historia clínica (solo lectura) |

El paso de `BASICO` a `COMPLETO` requiere:
- Validación presencial en un establecimiento de salud
- Personal administrativo verifica el documento original
- El proceso queda registrado en la bitácora de auditoría

---

## 3. Cifrado de Datos

### 3.1 En tránsito
- **TLS 1.3** en todos los endpoints (sin TLS 1.2 en producción)
- Certificados con rotación automática
- HSTS habilitado con `max-age=31536000; includeSubDomains; preload`

### 3.2 En reposo
- Disco cifrado en los servidores de base de datos
- PostgreSQL con `pgcrypto` para funciones de cifrado SQL
- MinIO con cifrado SSE-S3 (AES-256) en todos los objetos

### 3.3 A nivel de campo (Envelope Encryption)
Ver [ADR-007](../adr/007-envelope-encryption.md) para detalles técnicos.

**Campos cifrados:**
- `paciente.nombres`, `paciente.apellidos` → AES-256-GCM
- `identificadorPaciente.valor` (cédulas, pasaportes) → AES-256-GCM + hash para búsqueda
- `paciente.telefono`, `paciente.correo` → AES-256-GCM
- `episodio.motivoConsulta`, `episodio.evolucion` → AES-256-GCM
- `archivoResultado.minioKey` → AES-256-GCM

**En desarrollo:** Se usa `LocalKmsAdapter` con clave fija en `.env` (NUNCA en producción).  
**En producción:** Se usa `VaultKmsAdapter` con HashiCorp Vault.

---

## 4. Bitácora de Auditoría

- **Append-only**: Nunca se actualiza ni elimina un registro de auditoría
- **Hash encadenado**: `hash_actual = SHA256(payload || hash_anterior)`
- Se registra: `usuario`, `paciente`, `acción`, `recurso`, `establecimiento`, `IP`, `user-agent`, `justificación` (si aplica)
- Toda lectura de datos clínicos genera un registro (no solo escrituras)
- La tabla está **particionada por fecha** en PostgreSQL para rendimiento

### 4.1 Verificación de integridad
```bash
# Herramienta CLI incluida (Fase 7):
cd backend && pnpm audit:verify
# Verifica toda la cadena de hash y reporta si hay manipulación
```

### 4.2 Detección de anomalías
El sistema genera alertas automáticas ante:
- Un usuario consultando > 20 historias en < 1 hora
- Accesos desde un establecimiento diferente al asignado
- Múltiples accesos de emergencia del mismo médico en un día
- Accesos fuera del horario habitual del usuario

---

## 5. Datos sin conexión (Offline)

- Los datos clínicos **nunca** se almacenan en `localStorage`
- Para el modo offline, se usa **IndexedDB** con cifrado WebCrypto (AES-GCM)
- La clave de cifrado local se genera por sesión y se elimina al cerrar sesión
- Solo se cachean: alertas críticas (alergias, medicación activa), lista de citas próximas
- Los datos clínicos completos requieren conexión

---

## 6. Cabeceras de Seguridad HTTP

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' [BACKEND_URL]; frame-ancestors 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## 7. Checklist Antes de Producción

> ⚠️ Esta lista DEBE completarse antes de cualquier despliegue productivo.

### Infraestructura
- [ ] TLS 1.3 configurado y TLS 1.2 deshabilitado
- [ ] Certificados válidos (no autofirmados)
- [ ] Vault en modo producción (no dev mode, sin dev root token)
- [ ] Llaves de cifrado generadas y almacenadas en Vault (no en .env)
- [ ] PostgreSQL con replicación configurada
- [ ] Backups automáticos con RPO ≤ 15 minutos
- [ ] Monitoreo y alertas activos (Prometheus + Grafana)

### Keycloak
- [ ] Realm configurado con política de contraseñas estricta
- [ ] MFA obligatorio en todos los roles
- [ ] Credenciales de admin cambiadas (no usar las de desarrollo)
- [ ] SMTP configurado para emails de verificación y recuperación
- [ ] Logs de auditoría de Keycloak habilitados

### Backend
- [ ] `NODE_ENV=production`
- [ ] Swagger UI deshabilitado (`/api/docs` no accesible)
- [ ] Rate limiting calibrado para tráfico de producción
- [ ] CORS configurado solo para dominios autorizados
- [ ] Variables de entorno desde Vault (no desde .env)
- [ ] `KMS_ADAPTER=vault` (no local)

### Base de datos
- [ ] Contraseñas de PostgreSQL rotadas
- [ ] Acceso de red restringido (solo desde el backend)
- [ ] Tablas de auditoría con protección adicional (sin DELETE ni UPDATE para el rol de app)
- [ ] Particionamiento de tablas de alto volumen verificado

### Aplicación
- [ ] Content Security Policy verificada y estricta
- [ ] Headers de seguridad presentes en todas las respuestas
- [ ] CAPTCHA configurado para registro y solicitud de citas

---

## 8. Incidentes de Seguridad

### Pasos iniciales ante un incidente
1. **Contener**: Aislar el sistema o cuenta afectada si es posible
2. **Notificar**: Informar inmediatamente al responsable de seguridad del MPPS
3. **Preservar evidencia**: No apagar sistemas afectados sin autorización; preservar logs
4. **Evaluar**: Determinar qué datos fueron o podrían haber sido comprometidos
5. **Notificar a afectados**: Si hay exposición de datos de salud, notificar a los pacientes según LOPD
6. **Remediar**: Aplicar parches, rotar credenciales, fortalecer controles
7. **Documentar**: Generar informe de incidente con cronología y acciones tomadas

### Contactos de emergencia
- Responsable de seguridad: [Completar en producción]
- Equipo de TI MPPS: [Completar en producción]
- Proveedor de infraestructura: [Completar en producción]
