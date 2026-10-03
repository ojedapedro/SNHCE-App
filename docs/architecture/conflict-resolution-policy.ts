/**
 * Política de Resolución de Conflictos — SNHCE
 * ================================================
 * Documento técnico que especifica cómo se resuelven las discrepancias
 * entre el nodo local de un establecimiento y el servidor central cuando
 * el nodo reconecta tras un período de operación autónoma (offline).
 *
 * Principio rector: NUNCA se pierde información clínica.
 *
 * TABLA DE POLÍTICAS:
 *
 * | Tipo de Dato          | Política            | Justificación                               |
 * |----------------------|---------------------|---------------------------------------------|
 * | Signos Vitales       | Last-Write-Wins     | Cada medición es un registro independiente  |
 * | Notas SOAP           | Merge-Concatenation | El médico puede tener perspectivas distintas |
 * | Diagnósticos (CIE-10)| Union               | Nunca se descarta un diagnóstico clínico    |
 * | Alergias             | Union               | CRÍTICO: nunca perder una alerta de alergia |
 * | Prescripciones       | Manual Review Flag  | Posible doble prescripción → revisión médica |
 * | Citas                | Last-Write-Wins     | Estado final de la cita es el correcto      |
 * | Reposos              | Immutable           | El reposo emitido no se puede modificar     |
 *
 * PROCESO DE SINCRONIZACIÓN:
 *
 * 1. El nodo local detecta reconexión (event 'online')
 * 2. Lee el outbox de IndexedDB en orden FIFO por timestamp
 * 3. Para cada operación:
 *    a. Envía al central con header `Idempotency-Key: <uuid>`
 *    b. Si responde 200/201: marca como SINCRONIZADO en IDB
 *    c. Si responde 409 Conflict: aplica la política de resolución de la tabla
 *    d. Si responde 5xx o timeout: reintentar con backoff exponencial (máx. 1h)
 * 4. Al completar el outbox: notificar al médico con banner de confirmación
 *
 * DETECCIÓN DE CONFLICTO DE VERSIÓN:
 *
 * - Cada episodio tiene un campo `version` (int, incremental).
 * - El nodo local envía `X-Expected-Version: N` en el header.
 * - Si el central tiene version > N → conflicto detectado → aplica política.
 *
 * GARANTÍAS:
 *
 * - At-least-once delivery: el outbox se reintenta hasta confirmar.
 * - Idempotencia: el central ignora reintentos con la misma Idempotency-Key.
 * - Auditabilidad: cada operación de sync se registra en la bitácora central.
 */

// Este archivo sirve como documentación ejecutable.
// Los tests en offline.spec.ts verifican estas políticas.

export const CONFLICT_RESOLUTION_POLICY = {
  signosVitales: 'LAST_WRITE_WINS',
  notasSOAP: 'MERGE_CONCATENATION',
  diagnosticos: 'UNION',
  alergias: 'UNION',
  prescripciones: 'MANUAL_REVIEW',
  citas: 'LAST_WRITE_WINS',
  reposos: 'IMMUTABLE',
} as const;
