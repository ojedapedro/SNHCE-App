# ADR-005: PWA Offline-First con Service Worker e IndexedDB

**Estado:** Aceptado  
**Fecha:** 2026-10-02  
**Autores:** Equipo SNHCE  
**Revisado por:** Equipo de UX, Seguridad Informática MPPS

---

## Contexto

### La realidad de la infraestructura venezolana

El SNHCE opera en centros de salud a lo largo de todo el territorio venezolano, incluyendo zonas con:

- **Cortes eléctricos frecuentes y prolongados:** Plantas eléctricas, equipos de UPS y conectividad celular son el respaldo habitual. Cuando falla el generador, falla la red LAN y WAN simultáneamente.
- **Conectividad intermitente:** En muchos centros de salud del interior del país, la conexión a internet es vía celular 4G/LTE, con cobertura inconsistente. En hospitales de zonas rurales, la conectividad puede estar disponible solo por ventanas de tiempo.
- **Navegación degradada:** Velocidades de conexión de 1-5 Mbps en el mejor caso, con alta latencia. Una aplicación que requiera conexión constante es inutilizable.

### Impacto clínico de la desconexión

Una consulta médica **no puede detenerse** porque cayó el internet:
- El médico debe poder registrar diagnósticos, prescripciones y notas clínicas.
- Las enfermeras deben poder registrar signos vitales y administración de medicamentos.
- La farmacia debe poder dispensar medicamentos con constancia de la dispensación.

La pérdida de datos durante una consulta por fallo de red es inaceptable desde el punto de vista clínico y legal.

### Opciones técnicas para frontend

El SNHCE usa React (Vite) como framework de frontend. Las opciones para manejar la desconexión son:

1. **Degradación graceful:** Mostrar error cuando no hay conexión.
2. **Modo offline nativo (app móvil):** Reescribir los frontends como apps nativas.
3. **PWA offline-first:** Service Worker + IndexedDB en el navegador.

---

## Decisión

Se adopta la arquitectura **PWA (Progressive Web App) Offline-First** para la aplicación clínica (`app-clinica`), utilizando:

- **Workbox** para la gestión del Service Worker y estrategias de caché.
- **IndexedDB** (vía Dexie.js) como base de datos local en el navegador.
- **Patrón Outbox** para sincronización confiable al recuperar la conexión.
- **WebCrypto API** para cifrado de datos sensibles en IndexedDB.

### Alcance del modo offline

No toda la funcionalidad está disponible offline. Se distinguen tres niveles:

| Funcionalidad | Online | Offline | Notas |
|--------------|--------|---------|-------|
| Ver historia clínica del episodio actual | ✅ | ✅ | Cacheada al abrir la consulta |
| Registrar diagnósticos y notas | ✅ | ✅ | Guardado en IndexedDB, sync al reconectar |
| Prescribir medicamentos | ✅ | ✅ | Con advertencia de interacciones limitada |
| Consultar historial clínico completo | ✅ | ⚠️ Solo episodios cacheados | |
| Registrar signos vitales | ✅ | ✅ | |
| Ver catálogo de medicamentos | ✅ | ✅ | Catálogo precacheado |
| Buscar nuevo paciente | ✅ | ❌ | Requiere conexión al MPI |
| Autenticarse por primera vez | ✅ | ❌ | Requiere Keycloak |
| Re-autenticación con token válido | ✅ | ✅ | Token cacheado hasta expiración |

### Arquitectura offline

```
┌────────────────────────────────────────────────────────────┐
│  Navegador                                                 │
│                                                            │
│  ┌────────────────┐    ┌─────────────────────────────────┐│
│  │  React App     │◄──►│  Service Worker (Workbox)       ││
│  │  (UI/UX)       │    │  - Cache API (assets/queries)   ││
│  │                │    │  - Background Sync API          ││
│  └───────┬────────┘    └─────────────────────────────────┘│
│          │                                                  │
│  ┌───────▼────────────────────────────────────────────────┐│
│  │  Capa de Abstracción de Datos (OfflineDataService)     ││
│  │  - Detecta estado de conexión (navigator.onLine + API) ││
│  │  - Online: llama API REST directamente                 ││
│  │  - Offline: lee/escribe en IndexedDB                   ││
│  │  - Al reconectar: flush del Outbox                     ││
│  └───────┬────────────────────────────────────────────────┘│
│          │                                                  │
│  ┌───────▼────────────────────────────────────────────────┐│
│  │  IndexedDB (Dexie.js)                                  ││
│  │  ┌──────────────┐  ┌────────────────────────────────┐  ││
│  │  │ clinical_data│  │ outbox                         │  ││
│  │  │ (cifrado)    │  │ (operaciones pendientes)       │  ││
│  │  └──────────────┘  └────────────────────────────────┘  ││
│  │  ┌──────────────┐  ┌────────────────────────────────┐  ││
│  │  │ medications  │  │ sync_state                     │  ││
│  │  │ (catálogo)   │  │ (metadatos de sincronización)  │  ││
│  │  └──────────────┘  └────────────────────────────────┘  ││
│  └────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

### Patrón Outbox en el cliente

```typescript
// Cuando se crea una prescripción offline:
async function createPrescription(data: PrescriptionInput) {
  const idempotencyKey = generateUUID(); // UUIDv7
  
  // 1. Guardar en IndexedDB (cifrado)
  await db.transaction('rw', [db.clinicalData, db.outbox], async () => {
    await db.clinicalData.add({
      id: idempotencyKey,
      type: 'prescription',
      encryptedData: await encrypt(data),
      createdAt: new Date(),
      syncStatus: 'pending',
    });
    
    // 2. Agregar al outbox para sincronización
    await db.outbox.add({
      id: generateUUID(),
      idempotencyKey,
      operation: 'POST',
      endpoint: '/api/v1/prescriptions',
      payload: await encrypt(data),
      createdAt: new Date(),
      retryCount: 0,
    });
  });
  
  // 3. Si hay conexión, intentar sincronizar inmediatamente
  if (navigator.onLine) {
    await syncOutbox();
  }
  // Si no hay conexión, el Background Sync API lo reintentará automáticamente
}

// Al reconectar:
async function syncOutbox() {
  const pending = await db.outbox.where('syncStatus').equals('pending').toArray();
  
  for (const item of pending) {
    try {
      await api.request({
        method: item.operation,
        url: item.endpoint,
        data: await decrypt(item.payload),
        headers: { 'Idempotency-Key': item.idempotencyKey },
      });
      await db.outbox.delete(item.id);
      await db.clinicalData.update(item.idempotencyKey, { syncStatus: 'synced' });
    } catch (error) {
      if (error.status === 409) {
        // Conflicto: el servidor ya procesó esta operación (idempotencia)
        await db.outbox.delete(item.id);
      } else if (item.retryCount >= MAX_RETRIES) {
        await markAsFailedAndNotifyUser(item);
      } else {
        await db.outbox.update(item.id, { retryCount: item.retryCount + 1 });
      }
    }
  }
}
```

### Cifrado en IndexedDB

Los datos clínicos almacenados en IndexedDB son cifrados usando WebCrypto API:

```typescript
// Clave derivada de: token de sesión + salt del dispositivo
// Esto asegura que los datos no son legibles sin autenticación
const encryptionKey = await deriveKey({
  sessionToken: accessToken,  // del token de Keycloak
  deviceSalt: getDeviceSalt(), // almacenado en localStorage, generado al registrar el dispositivo
});
```

---

## Consecuencias

### Positivas

- **Continuidad operacional:** Las consultas médicas no se interrumpen por fallos de red o eléctricos.
- **Experiencia de usuario:** La aplicación responde instantáneamente incluso con conexión lenta (datos de consulta activa en caché local).
- **Confiabilidad de datos:** El patrón outbox con idempotency keys garantiza que ninguna operación se pierda ni se duplique.
- **Sin infraestructura adicional:** No se requiere una app móvil nativa. El navegador (Chrome, Firefox, Edge) es el runtime.

### Negativas

- **Complejidad de frontend significativamente mayor:** El equipo de frontend debe manejar estados de sincronización, conflictos, y cifrado. La complejidad del código aumenta considerablemente.
- **Riesgo de seguridad en dispositivos comprometidos:** Si un atacante tiene acceso físico al dispositivo y puede extraer IndexedDB, podría intentar descifrar los datos. Mitigación parcial: cifrado con clave derivada del token de sesión (expira al cerrar sesión), y política de dispositivos de confianza.
- **Compatibilidad de navegadores:** Service Workers e IndexedDB son ampliamente soportados (Chrome 76+, Firefox 60+, Edge 76+), pero requieren HTTPS. Se debe garantizar HTTPS en todos los entornos.
- **Límites de almacenamiento:** IndexedDB tiene límites de almacenamiento del navegador (~50-80% del espacio disponible en disco). Solo se cachean datos de consultas activas y el catálogo de medicamentos, no toda la historia clínica.
- **Sesiones offline limitadas:** Si el token de Keycloak expira mientras el usuario está offline, al reconectar debe re-autenticarse antes de poder sincronizar.

### Neutrales

- Solo la aplicación clínica (`app-clinica`) implementa offline-first completo. El portal de pacientes y la consola administrativa tienen degradación graceful.
- Se requiere una política de "sincronización de datos base" al inicio de cada jornada: el médico debe conectarse brevemente al inicio del día para cachear los datos de sus pacientes del día.

---

## Alternativas consideradas

### 1. Degradación graceful (mostrar error sin conexión)

**Descripción:** Cuando no hay conexión, mostrar un mensaje al usuario indicando que no puede continuar.

**Por qué fue rechazada:**
- Inaceptable clínicamente. Una consulta no puede detenerse porque cayó el internet.
- En zonas con cortes frecuentes, la aplicación sería inutilizable durante horas.

### 2. Aplicación nativa (Android/iOS/Windows)

**Descripción:** Reescribir la aplicación clínica como una app nativa con almacenamiento local.

**Por qué fue rechazada:**
- **Fuera de alcance:** Requiere equipos de desarrollo separados (Android/iOS/Windows), múltiples canales de distribución, y gestión de actualizaciones en dispositivos de toda Venezuela.
- **Distribución compleja:** Actualizar la app en cientos de dispositivos hospitalarios es un problema logístico significativo.
- **PWA cubre el caso de uso:** Con Chrome/Edge instalado en cualquier computadora del hospital, la PWA funciona sin instalación adicional. Las actualizaciones son automáticas vía Service Worker.

### 3. Electron (app de escritorio)

**Descripción:** Empaquetar la aplicación web en Electron para acceso a APIs nativas y almacenamiento local.

**Por qué no fue seleccionada:**
- Requiere instalación y actualización de un ejecutable en cada máquina.
- El overhead de Electron (~300MB por instalación) es significativo.
- Los navegadores modernos con PWA proveen las mismas capacidades offline que Electron para este caso de uso.

---

## Referencias

- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [Dexie.js Documentation](https://dexie.org/)
- [MDN Web Docs — Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Background Sync API](https://developer.chrome.com/docs/capabilities/background-sync)
- ADR-008: Patrón Outbox (el equivalente en el backend al outbox del cliente)
