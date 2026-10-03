# Runbook: Respuesta a Incidentes SNHCE

Este documento outlinea los procedimientos operativos estándar (SOP) para fallas críticas.

## 1. Escenario: Caída Total del Enlace de Internet en Hospital (CANTV caído)

**Detección:** Los nodos locales del hospital entran en modo `AUTONOMO`. La cola de Redis local (Outbox) empieza a acumular eventos.
**Impacto:** El personal del hospital no puede consultar el historial *histórico* alojado en la nube, pero pueden seguir ingresando evoluciones y atendiendo citas del día localmente.
**RTO Objetivo:** Operación ininterrumpida localmente (Offline-First).
**Acciones:**
1. El personal médico es notificado automáticamente por el banner de la app ("Sin conexión - Sincronizando localmente").
2. No intervenir el nodo local. Seguir operando.
3. Al restablecer el servicio de red, el `OutboxWorkerService` sincronizará automáticamente enviando los datos mediante HTTP POST (Idempotente).
4. El comité de auditoría debe revisar si hubo accesos de emergencia o duplicados generados.

## 2. Escenario: Compromiso de Llave Criptográfica o Robo de Credenciales

**Detección:** Alertas del sistema de Anomalías (ej. más de 50 historias consultadas por un usuario inusual) o aviso de inteligencia.
**Impacto:** Riesgo severo de divulgación de información confidencial.
**Acciones (Break-Glass de Seguridad):**
1. **Contención Inmediata:** Deshabilitar el usuario en Keycloak.
2. **Rotación de Llaves (Key Rotation):** Si se sospecha compromiso de llave AES en Vault, desencadenar la rotación de llaves maestras. (Los datos existentes usan *envelope encryption* con un ID de llave, los datos nuevos usarán la nueva llave).
3. **Auditoría Forense:** Extraer el log de auditoría inmutable (hash-chain) para identificar exactamente qué IDs de pacientes fueron comprometidos.
4. **Notificación Legal:** Activar protocolo de notificación del Ministerio y SUDEBAN/SUSCERTE.

## 3. Pruebas de Recuperación (RTO y RPO)

- **RPO (Recovery Point Objective):** 5 minutos.
  - *Mecanismo:* Replicación streaming PostgreSQL (Hot Standby) entre Datacenter Principal y Datacenter Alterno.
- **RTO (Recovery Time Objective):** < 1 hora para caída total del Datacenter central.
  - *Mecanismo:* Failover a clúster K8s pasivo, cambio de registros DNS, promoción de base de datos réplica a maestro.
  - *Ejercicio Anual:* Ejecutar failover en ambiente staging simulando pérdida física del DC principal.
