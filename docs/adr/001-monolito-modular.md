# ADR-001: Monolito Modular con NestJS en lugar de Microservicios

**Estado:** Aceptado  
**Fecha:** 2026-10-02  
**Autores:** Equipo SNHCE  
**Revisado por:** Arquitectura de Software MPPS

---

## Contexto

El Sistema Nacional Interoperable de Historia Clínica Electrónica (SNHCE) debe atender la red hospitalaria venezolana, con nodos distribuidos en todo el territorio nacional. Al diseñar la arquitectura inicial, el equipo evaluó dos enfoques principales: microservicios y monolito modular.

### Condicionantes del entorno venezolano

- **Infraestructura de red:** Conectividad intermitente entre los nodos hospitalarios y los centros de datos. Los microservicios requieren comunicación inter-servicio confiable y de baja latencia.
- **Tamaño del equipo:** El equipo inicial es pequeño (menos de 10 desarrolladores backend), por lo que la sobrecarga operacional de gestionar múltiples servicios independientes sería desproporcionada.
- **Capacidad de DevOps:** No se cuenta con un equipo de plataforma dedicado para gestionar orquestación de contenedores (Kubernetes) a nivel de producción desde el inicio del proyecto.
- **Tiempo al primer despliegue:** El MPPS requiere un primer despliegue funcional en el menor tiempo posible para atender consultas médicas reales.

### Problema que se resuelve

Definir una arquitectura de backend que permita:
1. Desarrollo ágil con un equipo pequeño.
2. Despliegue simple en entornos con recursos limitados.
3. Capacidad de evolucionar hacia mayor distribución si el sistema crece.
4. Mantenimiento razonable a mediano y largo plazo.

---

## Decisión

Se adopta la arquitectura de **Monolito Modular** utilizando **NestJS** como framework principal del backend.

### Principios de diseño adoptados

1. **Módulos estrictamente delimitados:** Cada dominio del negocio (pacientes, consultas, medicamentos, farmacia, auditoría, notificaciones) vive en su propio módulo NestJS con interfaces públicas explícitas. Los módulos **no** acceden directamente a los repositorios de otros módulos.

2. **Extracción selectiva futura:** Los módulos de **notificaciones** y **auditoría** son candidatos a extraerse como servicios independientes si la carga lo justifica, ya que tienen dependencias mínimas hacia el núcleo del dominio clínico.

3. **API interna vs. API pública:** Los módulos se comunican a través de interfaces de TypeScript (inyección de dependencias de NestJS), no mediante HTTP, lo que facilita la futura extracción con cambios mínimos.

4. **Base de datos compartida con esquemas separados:** Cada módulo tiene su propio esquema PostgreSQL (`patients`, `clinical`, `pharmacy`, `audit`, `notifications`). Esto permite aislar los datos sin la complejidad de múltiples bases de datos independientes.

### Estructura de módulos

```
backend/
  src/
    modules/
      patients/         # Módulo de pacientes e identidad (MPI)
      clinical/         # Historia clínica, consultas, diagnósticos
      pharmacy/         # Medicamentos, dispensación, inventario
      appointments/     # Citas y agendamiento
      audit/            # Auditoría inmutable con hash chain
      notifications/    # Alertas, correos, SMS (candidato a extracción)
      auth/             # Integración con Keycloak (validación JWT)
      fhir/             # Facade FHIR R4 (ver ADR-006)
    shared/             # Utilidades, decoradores, guards compartidos
    infrastructure/     # Configuración de BD, Redis, Vault, etc.
```

---

## Consecuencias

### Positivas

- **Velocidad de desarrollo:** Un solo proceso para depurar, un solo repositorio que clonar, un solo servicio que desplegar inicialmente. El equipo puede iterar rápido.
- **Despliegue simple:** `docker compose up` levanta todo el sistema. No se requiere Kubernetes en fase inicial.
- **Transacciones ACID locales:** Al compartir la base de datos PostgreSQL, los módulos pueden participar en transacciones distribuidas sin coordinación adicional. Esto es crítico para el patrón Outbox (ver ADR-008).
- **Depuración y observabilidad:** Stack traces unificados, un solo punto de entrada para Prometheus/OpenTelemetry.
- **Escalado horizontal:** El monolito completo puede replicarse horizontalmente detrás de un balanceador de carga si la carga aumenta, sin rediseño arquitectural.
- **Menor costo operacional:** No se requiere service mesh, registro de servicios, circuit breakers inter-servicio ni orquestación compleja.

### Negativas

- **Escalado granular limitado:** No es posible escalar individualmente el módulo de notificaciones si este consume muchos recursos, sin escalar todo el proceso. Mitigación: separación en proceso independiente cuando sea necesario.
- **Acoplamiento tecnológico:** Todos los módulos deben usar el mismo runtime (Node.js/NestJS) y la misma versión de dependencias core. Mitigación: los límites de módulo son lo suficientemente claros para migrar uno a la vez.
- **Riesgo de "big ball of mud":** Si no se respetan los límites de módulo, el código puede degenerarse en un monolito no estructurado. Mitigación: `eslint-plugin-boundaries` con reglas que prohíben importaciones cruzadas directas entre módulos.
- **Despliegues acoplados:** Cualquier cambio requiere redesplegar todo el proceso. Mitigación: CI/CD rápido con pruebas automatizadas y feature flags.

### Neutrales

- NestJS impone una estructura de módulos que guía naturalmente hacia la separación de responsabilidades.
- El equipo debe conocer los patrones de NestJS (DI, Guards, Interceptors, Pipes), lo cual es aprendible en pocas semanas.
- La migración futura a microservicios —si fuera necesaria— es viable extrayendo módulo por módulo, comenzando por `notifications` y `audit`.

---

## Alternativas consideradas

### 1. Microservicios desde el inicio

**Descripción:** Desplegar cada módulo como un servicio independiente con su propia base de datos, comunicándose vía gRPC o mensajería (Redis Streams / RabbitMQ).

**Por qué fue rechazada:**
- Complejidad operacional desproporcionada para el tamaño del equipo y la etapa del proyecto (complejidad prematura).
- Requiere infraestructura adicional: API Gateway, service registry, distributed tracing, circuit breakers.
- Las transacciones distribuidas (saga pattern) son significativamente más complejas que las transacciones ACID locales, especialmente crítico para datos clínicos.
- El equipo tardaría meses en tener un sistema funcional end-to-end.
- La conectividad venezolana hace que la comunicación inter-servicio sea un punto de falla adicional.

**Cuándo reconsiderar:** Si el sistema supera los 100,000 pacientes activos diarios y el escalado horizontal del monolito completo resulta ineficiente, se evaluará la extracción de módulos específicos.

### 2. Monolito sin estructura modular

**Descripción:** Un único proyecto NestJS sin límites explícitos entre dominios, con acceso libre entre servicios y repositorios.

**Por qué fue rechazada:**
- Deuda técnica inevitable a mediano plazo. Los equipos tienden a crear dependencias cruzadas implícitas que hacen el código imposible de mantener.
- Imposible evolucionar hacia microservicios en el futuro sin una reescritura completa.
- Dificulta la asignación de responsabilidades claras entre subequipos.

### 3. Serverless (AWS Lambda / similar)

**Descripción:** Funciones serverless para cada endpoint o caso de uso.

**Por qué fue rechazada:**
- Dependencia total de infraestructura cloud extranjera, incompatible con los requisitos de soberanía de datos del MPPS.
- Latencia de cold start inaceptable para aplicaciones médicas críticas.
- Modelo de costos impredecible.

---

## Referencias

- Sam Newman, *Building Microservices* (2ª ed.) — Capítulos sobre cuándo NO usar microservicios
- [NestJS Modules Documentation](https://docs.nestjs.com/modules)
- [Modular Monolith: A Primer](https://www.kamilgrzybek.com/design/modular-monolith-primer/) — Kamil Grzybek
- ADR-008: Patrón Outbox Transaccional (dependencia de BD compartida)
