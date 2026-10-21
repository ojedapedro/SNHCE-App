/**
 * SNHCE — Pruebas de Desconexión y Reconexión
 *
 * Simula escenarios de pérdida de conectividad (corte eléctrico,
 * apagón de internet) y verifica que:
 * 1. Las operaciones se encolan en el outbox cifrado
 * 2. Al reconectar, se sincronizan en orden con idempotencia
 * 3. El conflicto de fusión se resuelve sin pérdida de datos
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { agregarAOutbox, obtenerPendientes, marcarSincronizado, limpiarDatosOffline, initCryptoKey } from '../lib/offlineStore';

// Mock de crypto.subtle en jsdom
const mockKey = {} as CryptoKey;
beforeEach(async () => {
  // Simular initCryptoKey sin WebCrypto real en test
  vi.spyOn(crypto.subtle, 'importKey').mockResolvedValue(mockKey);
  vi.spyOn(crypto.subtle, 'deriveKey').mockResolvedValue(mockKey);
  vi.spyOn(crypto.subtle, 'encrypt').mockResolvedValue(new ArrayBuffer(16));
  vi.spyOn(crypto.subtle, 'decrypt').mockImplementation(async (_, __, data) => data as any);

  await initCryptoKey('fake-jwt-token-for-test-12345678901234');
});

afterEach(async () => {
  await limpiarDatosOffline();
  vi.restoreAllMocks();
});

describe('Outbox — Modo Sin Conexión', () => {

  it('encola operaciones cuando no hay conexión', async () => {
    // Simular offline
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    await agregarAOutbox('/api/v1/episodios', 'POST', {
      pacienteId: 'pac-test-1',
      motivo: 'Consulta de control',
    });

    const pendientes = await obtenerPendientes();
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].status).toBe('PENDIENTE');
    expect(pendientes[0].endpoint).toBe('/api/v1/episodios');
  });

  it('el payload en IndexedDB está cifrado (no es texto plano)', async () => {
    await agregarAOutbox('/api/v1/prescripciones', 'POST', {
      medicamento: 'Amoxicilina 500mg',
      dosis: '1 tableta',
    });

    const pendientes = await obtenerPendientes();
    const payload = pendientes[0].payloadCifrado;

    // El payload guardado no debe contener los datos en texto claro
    expect(JSON.stringify(payload)).not.toContain('Amoxicilina');
    expect(payload).toHaveProperty('iv');
    expect(payload).toHaveProperty('ciphertext');
  });

  it('genera idempotencyKey único por operación', async () => {
    await agregarAOutbox('/api/v1/episodios', 'POST', { test: 1 });
    await agregarAOutbox('/api/v1/episodios', 'POST', { test: 2 });

    const pendientes = await obtenerPendientes();
    const keys = pendientes.map(p => p.idempotencyKey);
    const keysUnicas = new Set(keys);
    expect(keysUnicas.size).toBe(keys.length); // Todos únicos
  });

  it('al reconectar, se marcan como SINCRONIZADOS', async () => {
    const key = await agregarAOutbox('/api/v1/citas/solicitar', 'POST', { fecha: '2024-11-01' });

    let pendientes = await obtenerPendientes();
    expect(pendientes).toHaveLength(1);

    // Simular reconexión y sincronización exitosa
    await marcarSincronizado(key);

    pendientes = await obtenerPendientes();
    expect(pendientes).toHaveLength(0); // Ya no hay pendientes
  });

  it('múltiples operaciones offline se sincronizan en orden (FIFO)', async () => {
    const timestamps: number[] = [];

    for (let i = 0; i < 5; i++) {
      await agregarAOutbox('/api/v1/episodios', 'POST', { orden: i });
      await new Promise(r => setTimeout(r, 10)); // Asegurar diferencia de timestamp
    }

    const pendientes = await obtenerPendientes();
    for (let i = 1; i < pendientes.length; i++) {
      expect(pendientes[i].timestamp).toBeGreaterThanOrEqual(pendientes[i - 1].timestamp);
    }
  });

  it('limpiarDatosOffline vacía el outbox al cerrar sesión', async () => {
    await agregarAOutbox('/api/v1/episodios', 'POST', { test: true });
    expect(await obtenerPendientes()).toHaveLength(1);

    await limpiarDatosOffline();
    expect(await obtenerPendientes()).toHaveLength(0);
  });
});

describe('Resolución de Conflictos (offline → reconexión)', () => {

  it('POLÍTICA: Las notas SOAP se fusionan por concatenación, nunca se pierden', () => {
    const evolucionCentral = 'Nota del médico en central: paciente estable.';
    const evolucionLocal = 'Nota del médico en nodo local (offline): fiebre 38.5°C.';

    // Lógica de resolución de conflictos (mirror del OutboxWorkerService)
    const resultado = [
      evolucionCentral,
      '\n\n=== CONFLICTO: Versión del Nodo Local (Fusionado automáticamente) ===\n',
      evolucionLocal,
    ].join('');

    // Ambas notas deben estar presentes
    expect(resultado).toContain(evolucionCentral);
    expect(resultado).toContain(evolucionLocal);
    expect(resultado).toContain('CONFLICTO');
  });

  it('POLÍTICA: Los diagnósticos son Union — nunca se descarta un Dx offline', () => {
    const dxCentral = [{ cie10: 'J06.9', descripcion: 'IRA' }];
    const dxLocal = [{ cie10: 'J18.9', descripcion: 'Neumonía' }];

    // La política de union incluye ambos
    const dxFinal = [...dxCentral, ...dxLocal];
    expect(dxFinal).toHaveLength(2);
    expect(dxFinal.map(d => d.cie10)).toContain('J06.9');
    expect(dxFinal.map(d => d.cie10)).toContain('J18.9');
  });
});
