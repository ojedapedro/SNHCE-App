# Checklist de Pendientes para Puesta en Producción (Go-Live)

Este sistema cuenta con una arquitectura técnica robusta, pero para operar legalmente y ser desplegado en el mundo real en Venezuela, se deben resolver los siguientes bloqueadores administrativos, legales y de infraestructura física:

## 1. Integraciones Gubernamentales Reales
- [ ] **Validación de Identidad (SAIME):** Reemplazar el `SaimeSimulatorAdapter` por un convenio técnico con el SAIME. Requiere VPN IPsec y consumo del servicio SOAP/REST oficial para validación de cédulas.
- [ ] **Firma Electrónica Acreditada (SUSCERTE):** Reemplazar el `FirmaElectronicaSimulatorAdapter`. Negociar con proveedores acreditados por SUSCERTE (Ej. Proveedor de Servicios de Certificación) para la emisión y validación de tokens o certificados en la nube para los médicos.
- [ ] **Pasarela SMS:** Contratar pasarela SMS corporativa local (Movilnet, Digitel, Movistar, o un integrador) para reemplazar el `SmsSimulatorAdapter` y enviar los OTP de MFA y recordatorios.

## 2. Infraestructura y Datacenters
- [ ] **Cotizaciones de Infraestructura (On-Premise / Soberana):** Al tratarse de datos sensibles del estado, la nube pública internacional (AWS/GCP) puede violar políticas de soberanía de datos. Se requiere cotizar servidores físicos en centros de datos del Estado (CANTV / Data Center del MPPS) para desplegar los manifiestos de Kubernetes.
- [ ] **Despliegue del Nodo Local:** Adquisición y configuración de micro-servidores (Ej. Intel NUC o servidores rack pequeños) para instalar en los 296 hospitales y 573 CDI para que el sistema *Offline-First* pueda operar físicamente mediante red local (LAN).
- [ ] **Dominio Oficial y Certificados:** Solicitar el dominio `.gob.ve` a CONATEL. Emitir certificados TLS/SSL válidos e instalar en el Ingress/Load Balancer.

## 3. Legal y Cumplimiento
- [ ] **Revisión Legal de Protección de Datos:** Auditoría legal de los textos en la pantalla de "Consentimientos". Debe estar avalado por consultoría jurídica del MPPS.
- [ ] **Aprobación de la Bitácora Inmutable:** Peritaje técnico por parte de la contraloría para certificar que el mecanismo de Hash-Chain implementado es válido como evidencia digital inmutable ante negligencias médicas.

## 4. Pruebas Finales y Auditoría Externa
- [ ] **Ejecutar Penetration Test Oficial:** Contratar a un tercero para ejecutar pruebas de pentesting dinámico sobre los endpoints de autenticación y FHIR.
- [ ] **Prueba de Carga Física:** Ejecutar los scripts de K6 desde servidores remotos para validar la concurrencia de 50.000+ sesiones que requerirá el país.
- [ ] **Informe de Accesibilidad (a11y):** Validar que las PWA del portal del paciente cumplan WCAG 2.1 AA (contraste para adultos mayores, lectura de pantalla para invidentes). El andamiaje de los componentes UI (Radix) ya lo soporta por defecto, pero requiere auditoría manual.
