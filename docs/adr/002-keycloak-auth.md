# ADR-002: Keycloak como Proveedor de Identidad Central

**Estado:** Aceptado  
**Fecha:** 2026-10-02  
**Autores:** Equipo SNHCE  
**Revisado por:** Seguridad Informática MPPS

---

## Contexto

El SNHCE maneja datos clínicos de alta sensibilidad y debe cumplir con requisitos estrictos de autenticación, autorización y auditoría de acceso. El sistema requiere:

### Requisitos funcionales de autenticación

1. **OpenID Connect (OIDC) y OAuth 2.0:** Para federar identidades entre los múltiples frontends (portal paciente, consola administrativa, aplicación clínica) y el backend.
2. **Autenticación Multifactor (MFA):** Obligatoria para personal médico y administrativo. Se requiere soporte para TOTP (Google Authenticator, Authy) y WebAuthn (llaves de seguridad físicas, biometría del dispositivo).
3. **Control de acceso basado en roles (RBAC):** Roles como `médico`, `enfermera`, `farmacéutico`, `auditor`, `administrador`, `paciente`. Los roles deben poder asignarse por recurso (un médico puede ser `jefe_guardia` en el Hospital Central pero solo `médico_base` en otro).
4. **Sesiones auditadas:** Todo intento de autenticación (exitoso o fallido), cambio de contraseña, activación de MFA y acceso de emergencia (break-glass) debe registrarse en el log de auditoría inmutable.
5. **Federación de directorios:** Posibilidad futura de federar con el directorio LDAP/Active Directory del MPPS.
6. **Soberanía de datos:** Las identidades y credenciales de los usuarios deben residir en infraestructura controlada por el MPPS, no en servicios de terceros extranjeros.

### Condicionantes

- Sin presupuesto para licencias de software propietario de gestión de identidades.
- El equipo tiene experiencia en soluciones open-source.
- La infraestructura corre en centros de datos venezolanos (on-premise o nube nacional).

---

## Decisión

Se adopta **Keycloak 24+** como el Proveedor de Identidad (IdP) centralizado del SNHCE.

### Configuración adoptada

#### Realm y estructura de roles

```
Realm: snhce
  ├── Clients:
  │     ├── snhce-backend         (confidential, service account)
  │     ├── portal-paciente       (public, PKCE)
  │     ├── consola-admin         (confidential)
  │     └── app-clinica           (confidential)
  ├── Roles de Realm:
  │     ├── medico
  │     ├── enfermera
  │     ├── farmaceutico
  │     ├── laboratorista
  │     ├── auditor
  │     ├── administrador_sistema
  │     ├── administrador_hospital
  │     └── paciente
  └── Identity Providers (futuro):
        └── LDAP/AD del MPPS
```

#### Flujos de autenticación

| Rol | Contraseña | MFA | Observaciones |
|-----|-----------|-----|---------------|
| Paciente | ✅ | Opcional (TOTP) | Alta asistida disponible |
| Personal médico | ✅ | **Obligatorio** (TOTP o WebAuthn) | Sin excepción |
| Farmacéutico | ✅ | **Obligatorio** (TOTP) | — |
| Administrador | ✅ | **Obligatorio** (WebAuthn preferido) | IP allowlist recomendada |
| Auditor | ✅ | **Obligatorio** (WebAuthn) | Solo lectura de logs |

#### Tokens JWT

- **Access token:** Vida útil 5 minutos. Contiene roles, `sub` (UUID de Keycloak), `preferred_username`.
- **Refresh token:** Vida útil 8 horas (jornada laboral). Rotación habilitada.
- **Offline token:** Deshabilitado por defecto. Solo habilitado para el módulo de sincronización offline bajo condiciones controladas.

#### Break-glass (Acceso de emergencia)

Se configura un flujo especial de break-glass que:
1. Requiere doble autenticación (dos personas autorizadas).
2. Genera una alerta inmediata al equipo de seguridad.
3. Registra el acceso en la cadena de auditoría inmutable (ADR-004).
4. El acceso de emergencia caduca automáticamente a las 4 horas.

### Integración en el backend NestJS

```typescript
// El backend valida JWTs emitidos por Keycloak
// usando passport-jwt y jwks-rsa (JWKS endpoint automático)
// Los roles se extraen del claim 'realm_access.roles'
// y se mapean a Guards de NestJS
```

---

## Consecuencias

### Positivas

- **Control total:** El MPPS controla completamente el sistema de identidades. No hay dependencia de terceros para autenticación.
- **Estándar abierto:** OIDC/OAuth 2.0 son estándares bien documentados. Cualquier cliente compatible puede integrarse.
- **MFA robusto:** Soporte nativo para TOTP, WebAuthn, OTP por email/SMS. Cumple con requisitos de salud.
- **Auditoría de eventos:** Keycloak genera eventos de auditoría que se integran con el sistema de auditoría del SNHCE.
- **Federación futura:** Cuando el MPPS tenga un directorio LDAP unificado, Keycloak puede federarlo sin cambios en el backend.
- **Sin costos de licencia:** Keycloak es open-source (Apache 2.0). Red Hat SSO (versión enterprise) disponible si se requiere soporte comercial.
- **Consola de administración:** Interfaz web para gestión de usuarios, roles y políticas sin desarrollo adicional.

### Negativas

- **Complejidad operacional adicional:** Keycloak es un servicio adicional que requiere alta disponibilidad, respaldo de su base de datos (PostgreSQL dedicada), y monitoreo propio.
- **Curva de aprendizaje:** La configuración de realms, flujos de autenticación y clientes en Keycloak tiene una curva de aprendizaje significativa.
- **Actualización delicada:** Las migraciones de versiones de Keycloak pueden ser complejas y requieren pruebas exhaustivas.
- **Recursos de hardware:** Keycloak requiere al menos 512 MB de RAM en producción (recomendado 1 GB+). En entornos con recursos limitados, esto es relevante.

### Neutrales

- Los tokens JWT deben renovarse cada 5 minutos, lo que requiere lógica de refresh en todos los clientes.
- El backend no mantiene estado de sesión propio; confía completamente en los tokens de Keycloak.
- Se requiere que el reloj del servidor Keycloak esté sincronizado (NTP) con los nodos del backend para evitar errores de validación de tokens.

---

## Alternativas consideradas

### 1. Auth0

**Descripción:** Plataforma SaaS de gestión de identidades.

**Por qué fue rechazada:**
- **Soberanía de datos:** Las credenciales de los usuarios venezolanos residirían en servidores extranjeros, incompatible con los requisitos del MPPS.
- **Costo:** El plan que incluye MFA, roles granulares y volúmenes de usuarios hospitalarios es prohibitivo para el presupuesto del sistema.
- **Cumplimiento legal:** Los datos de identidad de personal de salud no pueden salir de Venezuela según directrices del MPPS.

### 2. Autenticación personalizada (custom auth)

**Descripción:** Implementar registro, login, MFA y gestión de sesiones directamente en el backend NestJS.

**Por qué fue rechazada:**
- **Riesgo de seguridad:** Implementar criptografía y flujos de autenticación correctamente es extremadamente difícil. Los errores pueden ser catastróficos.
- **Tiempo de desarrollo:** Implementar TOTP, WebAuthn, gestión de sesiones, refresh tokens, y revocación correctamente tomaría meses.
- **Sin auditoría de terceros:** Las implementaciones de auth propias raramente son revisadas por expertos en seguridad externos.
- Regla de oro en seguridad: *No implementes tu propia criptografía ni tu propio sistema de autenticación.*

### 3. Authentik

**Descripción:** Alternativa open-source moderna a Keycloak, más reciente y con UI más moderna.

**Evaluación:** Authentik es una alternativa viable técnicamente. Soporta OIDC, SAML, LDAP y MFA. Su configuración se realiza principalmente vía código (blueprints en YAML), lo que facilita la reproducibilidad.

**Por qué no fue seleccionada (esta vez):**
- Comunidad y ecosistema más pequeño que Keycloak.
- Menos documentación sobre integración con stacks NestJS en entornos de salud.
- Keycloak tiene mayor adopción en proyectos gubernamentales similares en Latinoamérica.
- **Recomendación:** Si en el futuro Keycloak presenta problemas de mantenimiento o la comunidad de Authentik madura suficientemente, reevaluar esta decisión.

### 4. Casdoor

**Descripción:** Sistema de gestión de identidades con enfoque en simplicidad y recursos bajos.

**Por qué fue rechazada:**
- Ecosistema muy pequeño. Riesgo de abandono del proyecto.
- Soporte de WebAuthn limitado al momento de la evaluación.

---

## Referencias

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP MFA Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- ADR-004: Cadena de auditoría inmutable (eventos de autenticación)
- `docs/security/guia-seguridad.md`: Configuración detallada de Keycloak para producción
