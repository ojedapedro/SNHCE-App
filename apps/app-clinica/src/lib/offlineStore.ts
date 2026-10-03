/**
 * SNHCE — Offline Crypto Store
 * IndexedDB cifrada mediante WebCrypto API.
 * 
 * Principio de seguridad: NINGÚN dato clínico se guarda en texto plano en el dispositivo.
 * - Clave AES-GCM derivada del JWT del médico (HKDF) y almacenada en sessionStorage
 *   (se limpia al cerrar la pestaña, NO en localStorage).
 * - Al cerrar sesión o expirar el token se llama a clearAll() para vaciar IndexedDB.
 */

const DB_NAME = 'snhce_offline';
const DB_VERSION = 1;

const STORES = {
  OUTBOX: 'outbox',           // Operaciones pendientes de sincronizar
  ALERTAS: 'alertas_criticas', // Alergias y medicamentos activos (caché cifrada)
  BORRADORES: 'borradores',    // Notas SOAP no enviadas
} as const;

// ─── Manejo de la clave de cifrado ────────────────────────────────────────────

let _cryptoKey: CryptoKey | null = null;

/**
 * Deriva la clave AES-GCM a partir del JWT del médico usando HKDF.
 * La clave nunca sale del contexto de la pestaña.
 */
export async function initCryptoKey(jwtToken: string): Promise<void> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(jwtToken.slice(0, 32)), // Usamos los primeros 32 chars del JWT como semilla
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  _cryptoKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode('snhce-idb-salt-v1'),
      info: encoder.encode('snhce-clinical-offline-key'),
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function getCryptoKey(): CryptoKey {
  if (!_cryptoKey) throw new Error('CryptoKey no inicializada. El médico debe estar autenticado.');
  return _cryptoKey;
}

// ─── Cifrado / Descifrado ─────────────────────────────────────────────────────

async function cifrar(data: unknown): Promise<{ iv: string; ciphertext: string }> {
  const key = getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  };
}

async function descifrar<T>(payload: { iv: string; ciphertext: string }): Promise<T> {
  const key = getCryptoKey();
  const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

// ─── Apertura de la Base de Datos ─────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.OUTBOX)) {
        const outbox = db.createObjectStore(STORES.OUTBOX, { keyPath: 'idempotencyKey' });
        outbox.createIndex('timestamp', 'timestamp');
        outbox.createIndex('status', 'status');
      }
      if (!db.objectStoreNames.contains(STORES.ALERTAS)) {
        db.createObjectStore(STORES.ALERTAS, { keyPath: 'pacienteId' });
      }
      if (!db.objectStoreNames.contains(STORES.BORRADORES)) {
        db.createObjectStore(STORES.BORRADORES, { keyPath: 'citaId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── OUTBOX — Cola de operaciones pendientes ──────────────────────────────────

export interface OperacionOffline {
  idempotencyKey: string;   // UUID estable para deduplicación en el servidor
  endpoint: string;         // Ej: '/api/v1/episodios'
  method: 'POST' | 'PUT' | 'PATCH';
  payloadCifrado: { iv: string; ciphertext: string };
  timestamp: number;
  status: 'PENDIENTE' | 'SINCRONIZANDO' | 'SINCRONIZADO' | 'ERROR';
  intentos: number;
}

export async function agregarAOutbox(endpoint: string, method: OperacionOffline['method'], payload: unknown): Promise<string> {
  const db = await openDb();
  const idempotencyKey = crypto.randomUUID();
  const payloadCifrado = await cifrar(payload);

  const op: OperacionOffline = {
    idempotencyKey,
    endpoint,
    method,
    payloadCifrado,
    timestamp: Date.now(),
    status: 'PENDIENTE',
    intentos: 0,
  };

  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORES.OUTBOX, 'readwrite');
    tx.objectStore(STORES.OUTBOX).add(op);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });

  return idempotencyKey;
}

export async function obtenerPendientes(): Promise<OperacionOffline[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OUTBOX, 'readonly');
    const index = tx.objectStore(STORES.OUTBOX).index('status');
    const req = index.getAll(IDBKeyRange.only('PENDIENTE'));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function marcarSincronizado(idempotencyKey: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORES.OUTBOX, 'readwrite');
    const store = tx.objectStore(STORES.OUTBOX);
    const getReq = store.get(idempotencyKey);
    getReq.onsuccess = () => {
      const op = getReq.result;
      if (op) store.put({ ...op, status: 'SINCRONIZADO' });
    };
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

// ─── ALERTAS CRÍTICAS — Caché cifrada (Alergias + Medicación activa) ──────────

export interface AlertaCritica {
  pacienteId: string;
  alergias: Array<{ agente: string; severidad: string }>;
  medicamentosActivos: Array<{ nombre: string; dosis: string }>;
  actualizadoEn: string;
}

export async function guardarAlertasCriticas(data: AlertaCritica): Promise<void> {
  const db = await openDb();
  const cifrado = await cifrar(data);
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORES.ALERTAS, 'readwrite');
    tx.objectStore(STORES.ALERTAS).put({ pacienteId: data.pacienteId, ...cifrado });
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function obtenerAlertasCriticas(pacienteId: string): Promise<AlertaCritica | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ALERTAS, 'readonly');
    const req = tx.objectStore(STORES.ALERTAS).get(pacienteId);
    req.onsuccess = async () => {
      if (!req.result) return resolve(null);
      try {
        const data = await descifrar<AlertaCritica>(req.result);
        resolve(data);
      } catch {
        resolve(null); // Clave inválida = sesión expirada
      }
    };
    req.onerror = () => reject(req.error);
  });
}

// ─── LIMPIEZA AL CERRAR SESIÓN ────────────────────────────────────────────────

export async function limpiarDatosOffline(): Promise<void> {
  _cryptoKey = null;
  const db = await openDb();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction([STORES.OUTBOX, STORES.ALERTAS, STORES.BORRADORES], 'readwrite');
    tx.objectStore(STORES.OUTBOX).clear();
    tx.objectStore(STORES.ALERTAS).clear();
    tx.objectStore(STORES.BORRADORES).clear();
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
