# ADR-004: Registro de Auditoría Append-Only con Encadenamiento de Hash SHA-256

**Estado:** Aceptado  
**Fecha:** 2026-10-02  
**Autores:** Equipo SNHCE  
**Revisado por:** Equipo Legal MPPS, Auditoría Interna

---

## Contexto

### Requisitos legales y éticos

Los sistemas de historia clínica electrónica están sujetos a requisitos estrictos de trazabilidad en Venezuela. Cualquier acceso, modificación, creación o eliminación de datos clínicos debe quedar registrado de forma:

1. **Inmutable:** No debe ser posible modificar o eliminar registros de auditoría una vez creados, ni siquiera por administradores del sistema.
2. **Verificable:** Debe existir un mecanismo técnico que permita detectar si los registros de auditoría han sido alterados.
3. **Completa:** Cada operación sobre datos clínicos debe generar al menos un evento de auditoría.
4. **Atribuible:** Cada evento debe estar asociado a un usuario identificado (o al sistema en procesos automáticos).

### Alcance de la auditoría

Los siguientes eventos deben auditarse:

| Categoría | Eventos |
|-----------|---------|
| Identidad | Login, logout, fallo de autenticación, activación de MFA, break-glass |
| Pacientes | Creación, modificación de datos demográficos, fusión de registros |
| Historia clínica | Consulta, creación, modificación de episodios clínicos |
| Medicamentos | Prescripción, dispensación, anulación |
| Acceso a datos | Visualización de historia clínica completa, exportación |
| Administración | Cambio de roles, alta/baja de usuarios, cambios de configuración |

### El problema con los logs convencionales

Un registro de auditoría en una tabla SQL convencional es susceptible de manipulación:
- Un DBA (administrador de base de datos) con acceso directo puede ejecutar `UPDATE` o `DELETE`.
- Un atacante con credenciales de administrador puede borrar su rastro.
- Un error humano puede truncar tablas.

La auditoría debe ser **técnicamente inviolable**, no solo protegida por control de acceso.

---

## Decisión

Se implementa un **registro de auditoría append-only con encadenamiento de hash SHA-256**, inspirado en el diseño de logs de blockchain sin la complejidad distribuida.

### Modelo de datos

```sql
CREATE TABLE audit.event (
    -- Identificador del evento
    id              BIGSERIAL PRIMARY KEY,         -- secuencial para orden garantizado
    event_uuid      UUID NOT NULL DEFAULT gen_uuid_v7(),  -- UUID para referencias externas

    -- Cuándo
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Quién
    actor_id        UUID NOT NULL,                -- ID de Keycloak del usuario o 'SYSTEM'
    actor_type      VARCHAR(20) NOT NULL,         -- 'user', 'service', 'system'
    actor_ip        INET,                         -- IP del cliente
    actor_session   VARCHAR(255),                 -- ID de sesión Keycloak

    -- Qué
    event_type      VARCHAR(100) NOT NULL,        -- 'patient.view', 'prescription.create', etc.
    resource_type   VARCHAR(100) NOT NULL,        -- 'Patient', 'Prescription', 'User'
    resource_id     UUID,                         -- ID del recurso afectado

    -- Detalles del evento (payload)
    payload         JSONB NOT NULL DEFAULT '{}',  -- datos adicionales del evento
    outcome         VARCHAR(20) NOT NULL,         -- 'success', 'failure', 'partial'

    -- Encadenamiento de hash
    payload_hash    BYTEA NOT NULL,               -- SHA-256(payload_json)
    previous_hash   BYTEA,                        -- SHA-256 del registro anterior (NULL solo en el primero)
    chain_hash      BYTEA NOT NULL,               -- SHA-256(payload_hash || previous_hash)

    -- Control de integridad
    verified_at     TIMESTAMPTZ,                  -- cuándo se verificó por última vez
    
    CONSTRAINT no_update CHECK (TRUE)             -- semántica: este registro no debe actualizarse
);

-- Solo INSERT permitido. No UPDATE, no DELETE.
-- Esto se refuerza a nivel de rol de base de datos:
-- REVOKE UPDATE, DELETE ON audit.event FROM snhce_app;

-- Índices de consulta
CREATE INDEX idx_audit_actor     ON audit.event(actor_id, occurred_at DESC);
CREATE INDEX idx_audit_resource  ON audit.event(resource_type, resource_id, occurred_at DESC);
CREATE INDEX idx_audit_type      ON audit.event(event_type, occurred_at DESC);
CREATE INDEX idx_audit_uuid      ON audit.event(event_uuid);
```

### Algoritmo de encadenamiento

```
Para el PRIMER registro de la cadena:
  payload_hash  = SHA-256(JSON.stringify(payload))
  previous_hash = NULL
  chain_hash    = SHA-256(payload_hash || "GENESIS")

Para cada registro SUBSIGUIENTE:
  payload_hash  = SHA-256(JSON.stringify(payload))
  previous_hash = chain_hash del registro anterior (por id BIGSERIAL)
  chain_hash    = SHA-256(payload_hash || previous_hash)
```

### Herramienta de verificación

Se provee un script CLI para verificar la integridad de la cadena:

```bash
# Verificar toda la cadena
pnpm audit:verify

# Verificar un rango de registros
pnpm audit:verify --from 1 --to 10000

# Verificar desde el último checkpoint verificado
pnpm audit:verify --incremental
```

El script lee los registros en orden secuencial, recalcula los hashes y los compara con los almacenados. Si detecta una discrepancia, reporta el ID del primer registro comprometido.

### Permisos de base de datos

```sql
-- El usuario de la aplicación solo puede INSERT
GRANT INSERT, SELECT ON audit.event TO snhce_app;
REVOKE UPDATE, DELETE ON audit.event FROM snhce_app;

-- El usuario auditor solo puede SELECT
GRANT SELECT ON audit.event TO snhce_auditor;

-- NINGÚN usuario de aplicación tiene acceso al rol postgres/superuser
-- La verificación se ejecuta con un rol separado: snhce_verifier
```

---

## Consecuencias

### Positivas

- **Detección de manipulación:** Cualquier modificación de un registro (por mínima que sea) invalida la cadena de hash desde ese punto. El sistema puede detectar exactamente qué registro fue alterado.
- **Defensa legal:** La integridad técnica de los logs puede demostrarse ante un tribunal si fuera necesario.
- **No repudio:** Un actor no puede negar haber realizado una acción registrada sin invalidar toda la cadena de auditoría.
- **Simplicidad relativa:** El mecanismo es comprensible por cualquier desarrollador. No requiere infraestructura de blockchain.
- **Rendimiento aceptable:** La inserción de un registro de auditoría es O(1). Solo la verificación es O(n).

### Negativas

- **No se pueden eliminar registros:** Por diseño. Esto incluye datos que, en circunstancias normales, podrían eliminarse por errores (ej. un evento creado por error de código). Para corregir errores se agrega un nuevo evento de tipo `correction` en lugar de modificar el anterior.
- **Crecimiento de almacenamiento:** La tabla de auditoría crecerá indefinidamente. Se requiere una política de archivado (mover a almacenamiento frío después de N años) con verificación de hash antes del archivado.
- **Verificación O(n):** Verificar la integridad de toda la cadena requiere leer todos los registros secuencialmente. Para millones de registros, esto puede tomar horas. Mitigación: checkpoints periódicos (el hash de un bloque de N registros se firma y almacena).
- **Complejidad de inserción:** Cada inserción requiere leer el `chain_hash` del registro anterior para calcular el nuevo. Esto crea un cuello de botella de concurrencia: los inserts de auditoría son serializados. Mitigación: cola de auditoría con procesamiento secuencial asíncrono vía Outbox pattern (ADR-008).

### Neutrales

- Los registros de auditoría no contienen datos clínicos completos del payload, sino metadatos del evento (qué recurso, qué acción, qué resultado). Los datos clínicos viven en las tablas correspondientes.
- Se define una política de retención: los registros de auditoría se conservan mínimo 10 años, acorde con los requisitos de historia clínica venezolana.

---

## Alternativas consideradas

### 1. Tabla de auditoría simple (sin hash chaining)

**Descripción:** Tabla SQL convencional con solo INSERT permitido (por control de acceso), sin mecanismo de verificación criptográfica.

**Por qué fue rechazada:**
- Un administrador de base de datos malintencionado puede deshabilitar temporalmente el rol y hacer UPDATE/DELETE.
- No hay forma técnica de demostrar que los registros no fueron alterados.
- Insuficiente para requerimientos de auditoría médica legalmente defendible.

### 2. Blockchain (Hyperledger Fabric / similar)

**Descripción:** Usar una red blockchain permisionada para el registro de auditoría.

**Por qué fue rechazada:**
- **Complejidad desproporcionada:** Operar una red Hyperledger Fabric requiere múltiples nodos, smart contracts, y expertise especializado. El costo operacional es enorme.
- **Latencia:** Las transacciones de blockchain tienen latencia mucho mayor que un INSERT de PostgreSQL.
- **Solución a un problema ya resuelto:** El hash chaining provee las mismas garantías de integridad para un registro de auditoría centralizado, sin la complejidad distribuida.
- Blockchain añade valor cuando hay múltiples partes **mutuamente desconfiadas**. En este caso, hay una sola organización operando el sistema.

### 3. Write-Ahead Log (WAL) de PostgreSQL como auditoría

**Descripción:** Usar la replicación lógica de PostgreSQL para capturar cambios y enviarlos a un sistema de auditoría externo.

**Por qué no fue seleccionada (en esta fase):**
- Requiere infraestructura adicional para recibir y almacenar los cambios de WAL.
- No provee el mecanismo de hash chaining nativamente.
- Posible en el futuro como capa adicional de auditoría (defense in depth).

---

## Referencias

- [Certificate Transparency — RFC 9162](https://www.rfc-editor.org/rfc/rfc9162) (inspiración del diseño de hash chaining)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- ADR-008: Patrón Outbox Transaccional (publicación asíncrona de eventos de auditoría)
- `docs/security/guia-seguridad.md`: Sección de auditoría y retención
