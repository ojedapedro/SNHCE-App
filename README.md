# SNHCE — Sistema Nacional Interoperable de Historia Clínica Electrónica

El **SNHCE** es una plataforma integral de salud pública diseñada para gestionar las historias clínicas electrónicas de toda la red de establecimientos de salud (Hospitales, CDI, Ambulatorios). Desarrollado con una arquitectura moderna, segura, y resiliente (Offline-First), garantiza la continuidad operativa incluso en condiciones de conectividad limitada, manteniendo estrictos estándares de privacidad y criptografía.

---

## 🏗️ Arquitectura y Stack Tecnológico

El proyecto está estructurado como un **Monorepo** gestionado por `pnpm` y `Turborepo`.

### Stack
*   **Backend:** NestJS, Prisma ORM.
*   **Base de Datos & Caché:** PostgreSQL 16 (Maestro-Esclavo), Redis 7 (Cola, Rate Limiting, Caché).
*   **Identidad y Seguridad:** Keycloak 24 (OIDC, MFA), HashiCorp Vault (Gestión de secretos y cifrado KMS).
*   **Almacenamiento de Objetos:** MinIO (S3-compatible) para documentos, DICOM y resultados.
*   **Frontend (Apps):** React 18, Vite, TailwindCSS, Zustand, Radix UI (Accesibilidad WCAG 2.1 AA).
*   **Infraestructura:** Docker Compose (Desarrollo/Nodo Local), Kubernetes Helm (Producción).

---

## 📂 Estructura del Monorepo

```text
/
├── apps/
│   ├── portal-paciente/      # PWA para pacientes (Citas, Mi Historia, Consentimientos)
│   ├── app-clinica/          # PWA para personal de salud (Offline-first, SOAP, Recetas)
│   └── consola-administrativa/ # Dashboard de gestión (Doble aprobación, Auditoría, MPI)
├── packages/
│   ├── ui/                   # Sistema de diseño compartido (@snhce/ui)
│   └── i18n/                 # Internacionalización y diccionarios
├── backend/                  # Monolito modular NestJS (API central)
├── infrastructure/           # Docker, Helm, MinIO, Keycloak, Scripts de backup
└── docs/                     # ADRs (Decisiones de arquitectura), STRIDE, Runbooks
```

---

## 🚀 Capacidades y Módulos Implementados

El desarrollo se ejecutó en 8 fases continuas, logrando un sistema "Production-Ready":

1.  **Índice Maestro de Pacientes (MPI):** Gestión de identidades con detección/fusión reversible de duplicados y adaptadores de validación de identidad (ej. SAIME).
2.  **Seguridad y Auditoría Inmutable:** Modelo ABAC (Control de Acceso Basado en Atributos). Todo evento se registra en una bitácora "Append-Only" asegurada por una **cadena de hashes (Hash-Chain)**.
3.  **Núcleo Clínico (Interoperable):** Evoluciones SOAP, Diagnósticos (CIE-10), Alergias (SNOMED CT), Órdenes (LOINC). Incluye fachada de interoperabilidad **HL7 FHIR R4**.
4.  **Prescripciones y Reposos:** Emisión de recetas (RxNorm) con alertas automáticas de alergias, reposos firmados electrónicamente con código QR para verificación pública anónima.
5.  **Offline-First (Edge Computing):** La *App Clínica* puede operar sin internet. Los datos se guardan en IndexedDB **cifrados con AES-GCM 256** y se sincronizan automáticamente (Outbox Pattern) al recuperar la conexión mediante el nodo local.
6.  **Accesos de Emergencia (Break-Glass):** Permite a médicos acceder a historias sin cita previa justificando la urgencia médica, disparando alertas al comité de auditoría.
7.  **Alta Disponibilidad y Resiliencia:** Pruebas de carga con k6 (soporta picos masivos de las 8:00 AM), backups cifrados asimétricamente y arquitectura Activo-Activo en Kubernetes.

---

## ⚙️ Inicio Rápido (Desarrollo)

### Requisitos previos
- Node.js 20+ y `pnpm` v9+
- Docker y Docker Compose
- `make` (Opcional, recomendado)

### Instrucciones

1.  **Levantar la Infraestructura Core:**
    ```bash
    cd infrastructure/docker
    cp .env.example .env
    docker-compose up -d postgres redis minio keycloak vault maildev
    ```
    *(Nota: El script de inicialización de Vault y MinIO creará los buckets y las llaves de cifrado maestras automáticamente).*

2.  **Instalar dependencias del Monorepo:**
    ```bash
    cd ../../
    pnpm install
    ```

3.  **Configurar y levantar el Backend:**
    ```bash
    cd backend
    pnpm migrate:dev  # Aplica las migraciones de Prisma
    pnpm seed         # Inserta datos sintéticos y centros médicos
    pnpm start:dev
    ```

4.  **Levantar las Aplicaciones Frontend (En paralelo):**
    Abre una nueva terminal en la raíz del proyecto:
    ```bash
    pnpm dev
    ```
    - Portal del Paciente: `http://localhost:5173`
    - App Clínica: `http://localhost:5175`
    - Consola Administrativa: `http://localhost:5174`

---

## 🛡️ Entorno de Producción

Para el paso a producción (Go-Live), revisa exhaustivamente los documentos en la carpeta `docs/`:
- **`docs/produccion-pendientes.md`**: Checklist de integraciones legales (SAIME, SUSCERTE).
- **`docs/security/modelo-amenazas-stride.md`**: Modelo de amenazas y mitigaciones implementadas.
- **`docs/ops/runbook-respuesta-incidentes.md`**: Protocolos operativos estándar ante caídas de enlace y brechas de seguridad.

> ⚠️ **Advertencia de Seguridad:** Este repositorio contiene código diseñado para manejar datos altamente sensibles. Bajo ninguna circunstancia se deben usar las contraseñas, semillas o tokens por defecto del archivo `.env.example` en un entorno en vivo.
