# ADR-003: UUID como Clave Primaria de Pacientes — La Cédula es Solo un Identificador de Búsqueda

**Estado:** Aceptado  
**Fecha:** 2026-10-02  
**Autores:** Equipo SNHCE  
**Revisado por:** Equipo Legal MPPS, Arquitectura de Datos

---

## Contexto

El SNHCE implementa un **Índice Maestro de Pacientes (MPI — Master Patient Index)**, que es el componente que garantiza que cada persona física tenga exactamente una identidad en el sistema, evitando registros duplicados o fragmentados.

### El problema con la cédula de identidad como clave primaria

La cédula de identidad venezolana (V-XXXXXXXX, E-XXXXXXXX) es el identificador nacional más común para personas, pero presenta múltiples problemas cuando se usa como clave primaria de base de datos:

1. **Pacientes sin documentos:** Neonatos no registrados, personas en situación de calle, solicitantes de refugio, víctimas de emergencias que no portan documentos. El sistema debe poder registrarlos y tratarlos igualmente.
2. **Cambios de cédula:** Personas que naturalizan (de E- a V-), menores que obtienen su primera cédula, correcciones de errores en el Registro Civil.
3. **Privacidad y LOPD:** La Ley Orgánica de Protección de Datos venezolana clasifica los datos de salud como datos sensibles. Exponer la cédula en URLs, logs de aplicación, o respuestas de API representa un riesgo de privacidad inaceptable.
4. **Duplicados:** En sistemas de salud reales, es común que un mismo paciente tenga múltiples registros con diferentes cédulas (por errores de transcripción) o la misma cédula con diferentes nombres. El MPI debe poder fusionar estos registros.
5. **Números de cédula reutilizados históricamente:** En algunos países y en Venezuela, ha habido casos de reasignación de números de identidad o asignación incorreta.
6. **Integración con extranjeros:** Personas con pasaportes extranjeros, venezolanos en el exterior consultando vía telemedicina.

### Requisitos del MPI

- Cada persona física tiene un único `patientId` interno que nunca cambia.
- La cédula (u otros identificadores nacionales) son atributos buscables asociados al `patientId`.
- El sistema puede gestionar múltiples identificadores por persona (cédula, pasaporte, historia clínica antigua).
- Las búsquedas por cédula deben ser eficientes.
- Los identificadores sensibles no deben aparecer en URLs, tokens, ni logs.

---

## Decisión

Se adopta **UUIDv7** como clave primaria interna para todas las entidades de pacientes. La cédula de identidad se almacena como un atributo cifrado con un hash de búsqueda, nunca como clave primaria ni en URLs.

### Detalles de implementación

#### Tabla de pacientes

```sql
-- Tabla principal del paciente
CREATE TABLE patients.patient (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),  -- PK interna, nunca expuesta al exterior
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    -- datos demográficos cifrados (ver ADR-007)
    encrypted_data  BYTEA NOT NULL,  -- AES-256-GCM: nombre, apellido, fecha nacimiento, sexo
    dek_id          UUID NOT NULL REFERENCES vault.dek(id)  -- referencia a la clave de cifrado
);

-- Tabla de identificadores (MPI)
CREATE TABLE patients.patient_identifier (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    patient_id      UUID NOT NULL REFERENCES patients.patient(id),
    type            VARCHAR(20) NOT NULL,  -- 'cedula_v', 'cedula_e', 'pasaporte', 'historia_previa', etc.
    value_encrypted BYTEA NOT NULL,        -- valor cifrado con AES-256-GCM (ADR-007)
    value_hash      BYTEA NOT NULL,        -- SHA-256(salt_global || valor_normalizado) para búsqueda
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    issued_by       VARCHAR(100),          -- 'SAIME', 'ONIDEX', 'SENIAT'
    valid_from      DATE,
    valid_until     DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsqueda eficiente por hash de identificador
CREATE UNIQUE INDEX idx_patient_identifier_hash 
    ON patients.patient_identifier(type, value_hash)
    WHERE is_active = TRUE;  -- solo identificadores activos son únicos
```

#### Por qué UUIDv7 en lugar de UUIDv4

- **UUIDv7** incluye timestamp de alta resolución en los bits más significativos, lo que significa que los registros recientes tienen UUIDs cercanos entre sí. Esto mejora significativamente el rendimiento de los índices B-tree de PostgreSQL (menor fragmentación que UUIDv4 completamente aleatorio).
- **UUIDv7** sigue siendo globalmente único sin coordinación central.
- Compatible con los estándares FHIR R4 que usan UUIDs como identificadores de recursos.

#### Flujo de búsqueda por cédula

```
1. Recibir: tipo="cedula_v", valor="12345678"
2. Normalizar: strip espacios, mayúsculas, validar formato
3. Calcular: hash = SHA-256(SALT_GLOBAL || "V-12345678")
4. Buscar: SELECT patient_id FROM patient_identifier 
           WHERE type='cedula_v' AND value_hash = $hash
5. Si hay resultado: retornar patient_id para uso interno
6. Si no hay resultado: flujo de registro de nuevo paciente o alerta de paciente no encontrado
```

#### URLs y referencias externas

```
✅ CORRECTO:   GET /api/v1/patients/018f2a3b-7c4e-7d8f-9e0a-1b2c3d4e5f6a
❌ INCORRECTO: GET /api/v1/patients/V-12345678
❌ INCORRECTO: GET /api/v1/patients/12345678
```

#### En respuestas de API

La cédula nunca aparece en respuestas de API directas. Solo se devuelve si el usuario tiene permiso explícito para ver datos de identificación (rol `administrador_hospital` o `médico_tratante` con relación activa con el paciente).

---

## Consecuencias

### Positivas

- **Privacidad por diseño:** La cédula nunca aparece en URLs, logs de acceso HTTP, parámetros de query, ni tokens JWT. Un log comprometido no revela identidades.
- **Modelo correcto para MPI:** El sistema puede manejar pacientes sin documentos, documentos múltiples, y fusión de registros sin rediseño.
- **Cumplimiento LOPD:** Se minimiza la exposición de datos de identificación personal en sistemas periféricos.
- **Deduplicación:** Pueden existir múltiples identificadores (`patient_identifier`) apuntando al mismo `patient.id`. El proceso de deduplicación puede fusionar registros actualizando referencias en lugar de eliminar datos.
- **Inmutabilidad de referencias:** Un `patientId` asignado nunca cambia, incluso si el paciente obtiene una nueva cédula. Las referencias en historias clínicas, órdenes médicas y auditoría son siempre válidas.
- **Rendimiento:** UUIDv7 tiene mejor comportamiento en índices B-tree que UUIDv4.

### Negativas

- **Búsqueda más compleja:** Buscar por cédula requiere calcular el hash y hacer un JOIN, en lugar de una búsqueda directa por PK. Mitigado por el índice `value_hash`.
- **No se puede "leer" el ID:** A diferencia de IDs secuenciales o cédulas, un UUID no le dice nada al usuario sobre el paciente. Requiere siempre ir a la base de datos para obtener información.
- **Complejidad de onboarding:** El personal debe entender que el "número de historia clínica" del sistema es el UUID (o un alias legible derivado de él), no la cédula.
- **Tamaño de almacenamiento:** UUID (16 bytes) vs. entero (4-8 bytes). Para volúmenes grandes esto importa, aunque es manejable con PostgreSQL.

### Neutrales

- Se deberá desarrollar una función de "número de historia clínica" legible para el personal médico (ej. `HCE-2026-000001`), mapeada al UUID interno.
- El equipo de integración con sistemas legacy deberá implementar un proceso de mapeo entre identificadores históricos (ej. números de historia clínica en papel) y los nuevos UUIDs.

---

## Alternativas consideradas

### 1. Cédula como clave primaria

**Descripción:** Usar `cedula_v` o el número de cédula directamente como `VARCHAR` PRIMARY KEY en la tabla de pacientes.

**Por qué fue rechazada:**
- Pacientes sin documentos: el sistema no podría registrarlos.
- Un cambio de cédula requeriría actualizar TODAS las referencias (historia clínica, órdenes, auditoría) mediante un `UPDATE CASCADE` masivo.
- La cédula aparecería en URLs, logs, tokens, violando la privacidad.
- No permite deduplicación (no puede haber dos registros con la misma cédula como PK).
- Las cédulas con errores tipográficos crearían pacientes fantasma imposibles de fusionar.

### 2. UUID v4 puro

**Descripción:** UUID aleatorio estándar (v4) como PK.

**Por qué no fue seleccionado:** UUIDv7 es estrictamente superior en rendimiento de índices por el componente temporal. No hay razón para preferir UUIDv4 en nuevos diseños.

### 3. ULID (Universally Unique Lexicographically Sortable Identifier)

**Descripción:** Alternativa a UUID con componente temporal y representación en base32.

**Evaluación:** Técnicamente comparable a UUIDv7. Se prefirió UUIDv7 porque:
- Es un estándar IETF (RFC 9562) con soporte nativo en PostgreSQL 17+.
- FHIR R4 usa UUIDs, no ULIDs.
- `gen_uuid_v7()` disponible en PostgreSQL 17 sin extensiones adicionales.

---

## Referencias

- [RFC 9562 — UUID Version 7](https://www.rfc-editor.org/rfc/rfc9562)
- [HL7 FHIR R4 — Patient Resource](https://hl7.org/fhir/R4/patient.html)
- [IHE — Master Patient Index (PIX/PDQ)](https://profiles.ihe.net/ITI/TF/Volume1/ch-5.html)
- ADR-007: Cifrado de campos sensibles (cómo se cifra el valor de la cédula)
- ADR-006: FHIR R4 como facade (mapeo de Patient.identifier)
