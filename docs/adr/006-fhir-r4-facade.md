# ADR-006: Fachada HL7 FHIR R4 para Interoperabilidad

**Estado:** Aceptado  
**Fecha:** 2026-10-02  
**Autores:** Equipo SNHCE

---

## Contexto

El SNHCE debe integrarse eventualmente con otros sistemas de salud, tanto dentro de Venezuela (IVSS, IPASME, Defensa) como potencialmente con organismos internacionales (OPS/OMS, sistemas de salud de países vecinos). HL7 FHIR R4 es el estándar internacional dominante para interoperabilidad en salud digital.

El modelo de datos interno del SNHCE está optimizado para el rendimiento y la lógica de negocio venezolana (con campos en español, modelo de citas y episodios adaptado a la red pública). Hacer que el modelo interno **sea** FHIR introduciría una complejidad innecesaria en el desarrollo diario.

Los recursos FHIR requeridos inicialmente son: `Patient`, `Appointment`, `Encounter`, `Condition`, `AllergyIntolerance`, `MedicationRequest`, `Observation`, `DiagnosticReport`, `ServiceRequest`.

---

## Decisión

Se implementa una **fachada FHIR R4** como capa de traducción separada:

- El modelo interno de PostgreSQL/Prisma permanece en español y optimizado para la lógica SNHCE.
- Un módulo dedicado (`backend/src/modules/fhir/`) contiene los mappers bidireccionales entre el modelo interno y los recursos FHIR R4.
- Se expone un endpoint `/fhir/R4/` con los recursos FHIR estándar.
- La fachada es inicialmente de **lectura controlada** (GET). Las escrituras vía FHIR son evaluadas caso por caso.
- Se usa la librería `@medplum/fhirtypes` para las definiciones TypeScript de tipos FHIR R4.
- Un paquete compartido `packages/fhir-mapper/` centraliza la lógica de mapeo para reutilización.

```
Modelo Interno (PostgreSQL)
         ↕  mapper
Recursos FHIR R4 (en memoria)
         ↓
Endpoint /fhir/R4/ (REST)
```

---

## Consecuencias

### Positivas
- El modelo interno es libre de evolucionar sin romper la interfaz FHIR.
- Facilita integraciones futuras con sistemas externos que hablen FHIR.
- Permite certificación de conformidad con FHIR si se requiere en el futuro.
- Los desarrolladores trabajan con un modelo familiar, no con FHIR directamente.

### Negativas
- Requiere mantener los mappers actualizados cuando el modelo interno cambia.
- Overhead de traducción en cada llamada FHIR (mitigable con caché).
- Los mappers pueden volverse complejos si el modelo interno diverge mucho de FHIR.

### Neutrales
- La fachada puede ser usada como base para un servidor FHIR completo en el futuro.
- Permite cumplir con requisitos de interoperabilidad nacionales si el Estado venezolano los define.

---

## Alternativas consideradas

1. **FHIR como modelo interno**: Usar recursos FHIR directamente en PostgreSQL (ej. como JSON en columnas JSONB). *Rechazado*: Las consultas FHIR no coinciden bien con los patrones de acceso del SNHCE. Complejidad operacional alta para el equipo.

2. **Sin FHIR**: No implementar interoperabilidad FHIR. *Rechazado*: El requisito lo exige explícitamente y es esencial para la integración a largo plazo.

3. **Servidor FHIR dedicado (ej. HAPI FHIR)**: Correr un servidor FHIR independiente que replique los datos. *Pospuesto*: Es la evolución natural si la carga de FHIR crece significativamente.
