# Diagrama de Componentes SNHCE

Este documento ilustra la arquitectura de alto nivel del Sistema Nacional Interoperable de Historia Clínica Electrónica (SNHCE) para la red de salud pública de Venezuela.

## Arquitectura General (Monolito Modular)

```mermaid
flowchart TD
    %% Usuarios y Clientes
    Paciente((Paciente))
    Medico((Personal Médico\nEnfermería))
    Admin((Administrativo\nAuditor))

    %% Frontend Apps (PWA / SPA)
    subgraph Frontend [Aplicaciones Frontend - Vercel / CDN]
        PortalPaciente[Portal del Paciente\nReact + Vite + Workbox]
        AppClinica[App Clínica\nReact + Vite]
        ConsolaAdmin[Consola Administrativa\nReact + Vite]
    end

    %% API Gateway / Load Balancer
    Gateway{API Gateway / Nginx}

    %% Identidad
    subgraph IAM [Gestión de Identidad]
        Keycloak[Keycloak OIDC\nMFA, RBAC, Tokens]
    end

    %% Backend (NestJS Monolith)
    subgraph Backend [Backend - NestJS - Docker]
        API[Controladores REST]
        
        %% Módulos de Dominio
        subgraph Modulos [Módulos de Dominio]
            MPI[Índice Maestro\nde Pacientes]
            Clinical[Módulo Clínico\nEvolución, Alergias]
            Rx[Prescripciones\ny Reposos]
            Agenda[Citas y\nAgendamiento]
            Sync[Cola de Sincronización\nOffline-first]
        end
        
        %% Servicios Core
        subgraph Core [Servicios Transversales]
            Audit[Bitácora de Auditoría\nHash-chain]
            Crypto[Envelope Encryption\nKMS Adapter]
            AuthGuard[Control de Acceso\nABAC + RBAC]
        end
        
        API --> Modulos
        Modulos --> Core
    end

    %% Persistencia
    subgraph Datos [Persistencia y Caché]
        PG[(PostgreSQL\nPrimario)]
        PG_Rep[(PostgreSQL\nRéplica Lectura)]
        Redis[(Redis\nCaché y Opaque IDs)]
        MinIO[(MinIO\nDocs y Archivos)]
        Vault[(HashiCorp Vault\nGestión de Llaves)]
    end

    %% Nodos Locales (Establecimientos)
    subgraph NodoLocal [Nodos en Hospitales / CDI]
        Relay[Relay de Sincronización\nNestJS Local]
        PG_Local[(PostgreSQL Local)]
    end

    %% Conexiones Clientes -> Frontend
    Paciente --> PortalPaciente
    Medico --> AppClinica
    Admin --> ConsolaAdmin

    %% Conexiones Frontend -> Gateway -> Auth & Backend
    PortalPaciente --> Gateway
    AppClinica --> Gateway
    ConsolaAdmin --> Gateway
    
    Gateway --> API
    Gateway --> Keycloak

    %% Conexiones Backend -> Datos
    Core --> PG
    Core --> Redis
    Core --> MinIO
    Crypto --> Vault
    
    PG -. Replicación asíncrona .-> PG_Rep

    %% Conexiones Nodos Locales
    Relay <-- HTTP Idempotente --> Sync
    Relay --> PG_Local
    AppClinica -. Modo Offline .-> Relay
```

## Flujos Críticos de Seguridad

1. **Autenticación (Keycloak):** Todos los frontends usan el flujo Authorization Code con PKCE. Los tokens son de corta duración.
2. **Cifrado en reposo:** Los datos sensibles (nombres de pacientes, evolución médica, etc.) pasan por el `CryptoService` antes de guardarse en base de datos.
3. **Auditoría inmutable:** Cualquier lectura o escritura en los módulos clínicos llama al `AuditService`, que encadena el hash con el registro anterior, garantizando que no se puedan borrar o alterar accesos.
4. **Offline-first:** Cuando la conexión del hospital cae, la *App Clínica* encola las operaciones (Outbox pattern). Si el hospital tiene un *Nodo Local*, la app se conecta al relay; si no, espera a recuperar conexión 4G/Wifi.
