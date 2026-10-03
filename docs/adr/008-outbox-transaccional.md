# ADR-008: Outbox Transaccional para Sincronización con Nodos Locales

**Estado:** Aceptado  
**Fecha:** 2026-10-02  
**Autores:** Equipo SNHCE

---

## Contexto

Los ~13.000+ establecimientos de la red pública venezolana deben poder operar sin conexión a internet (diseño offline-first). Cada establecimiento tendrá un **nodo local** (relay) que sincroniza con los centros de datos centrales. Cuando un médico registra una consulta en un nodo local sin conexión, ese registro debe propagarse al servidor central cuando la conexión se restaure, **sin pérdida de datos ni duplicados**.

El problema fundamental es la **dualidad escritura**: si primero escribimos en la BD y luego publicamos el evento al bus, y la app falla entre ambas operaciones, el evento se pierde. Si hacemos lo inverso, podemos publicar un evento de un dato que nunca se persistió.

---

## Decisión

Se implementa el **Patrón Outbox Transaccional**:

### Mecanismo
1. **Escritura atómica**: En la misma transacción PostgreSQL que escribe el dato de dominio, se inserta un registro en la tabla `outbox_eventos`.
2. **Worker de publicación**: Un proceso separado (NestJS `@Cron`) lee periódicamente la tabla `outbox_eventos` y publica los eventos al bus (Redis Streams).
3. **Marcado de procesado**: Una vez publicado exitosamente, el evento se marca como `PUBLICADO` (o se elimina según política de retención).
4. **Idempotencia**: Cada evento tiene un `idempotency_key` único. El consumidor verifica antes de procesar que no haya procesado ya ese ID.

```sql
-- Tabla outbox
CREATE TABLE outbox_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_evento VARCHAR(100) NOT NULL,  -- ej. 'episodio.creado'
  payload JSONB NOT NULL,
  estado VARCHAR(20) DEFAULT 'PENDIENTE',  -- PENDIENTE | PUBLICADO | FALLIDO
  idempotency_key UUID UNIQUE NOT NULL,
  intentos INT DEFAULT 0,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  publicado_en TIMESTAMPTZ
);
```

### Flujo de sincronización nodo local → central
```
[Nodo Local]
  Médico crea episodio
    → INSERT episodio + INSERT outbox_evento (transacción atómica)
    → Worker lee outbox
    → Publica a Redis Stream "snhce:sync:episodios"
    → Centro de datos consume el stream
    → Aplica con verificación de idempotency_key
    → Actualiza estado = PUBLICADO
```

### Resolución de conflictos
- Los registros clínicos son **solo-anexar** (append-only): nunca se hace UPDATE a datos clínicos, se crea una nueva versión.
- Las correcciones crean un nuevo registro con `version = anterior + 1` y referencia al registro corregido.
- En caso de conflicto de versión (mismo `id + version` desde dos nodos), el sistema aplica la primera recibida y registra el conflicto para revisión manual en la consola de administración.

---

## Consecuencias

### Positivas
- **Garantía at-least-once**: Los eventos nunca se pierden, incluso si la app falla.
- **Consistencia eventual**: El sistema central eventualmente tendrá todos los datos de los nodos.
- **Sin dependencia de commit distribuido (2PC)**: Más simple y resiliente.
- Funciona con cualquier broker (Redis Streams, NATS, Kafka) sin cambiar la lógica de escritura.

### Negativas
- **Consistencia eventual** (no inmediata): Un registro creado en el nodo local puede tardar segundos/minutos en aparecer en el central según conectividad.
- La tabla `outbox_eventos` crece; requiere limpieza periódica de eventos procesados.
- El worker de publicación debe manejar backpressure y reintentos con backoff exponencial.

### Neutrales
- En la Fase 1 el broker es Redis Streams. En la Fase 6 se puede migrar a NATS o Kafka sin cambiar el código de escritura de dominio.
- Los nodos locales son relay-only (sin UI propia, según ADR).

---

## Alternativas consideradas

1. **Publicación directa al broker en la misma transacción**: Imposible — los brokers de mensajes no participan en transacciones ACID de PostgreSQL.

2. **CDC (Change Data Capture) con Debezium**: Capturar cambios desde el WAL de PostgreSQL. *Válido técnicamente* pero agrega complejidad operacional (Kafka + Debezium + Zookeeper). Documentado como opción de migración futura si el volumen lo justifica.

3. **Polling periódico sin outbox**: El consumidor hace polling directo a la BD. *Rechazado*: Acoplamiento entre consumidor y productor, imposible escalar.
