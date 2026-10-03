import { useEffect, useState, useCallback } from 'react';
import {
  agregarAOutbox,
  obtenerPendientes,
  marcarSincronizado,
  obtenerAlertasCriticas,
  guardarAlertasCriticas,
  type OperacionOffline,
  type AlertaCritica,
} from '../lib/offlineStore';

type EstadoSync = 'idle' | 'sincronizando' | 'error';

export function useSyncOutbox() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendientes, setPendientes] = useState(0);
  const [estadoSync, setEstadoSync] = useState<EstadoSync>('idle');

  // Monitorear conectividad
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      sincronizar(); // Sincronizar inmediatamente al reconectar
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Verificar pendientes al montar
  useEffect(() => {
    obtenerPendientes().then(ops => setPendientes(ops.length));
  }, []);

  const sincronizar = useCallback(async () => {
    if (!navigator.onLine) return;
    const ops = await obtenerPendientes();
    if (ops.length === 0) return;

    setEstadoSync('sincronizando');
    let errores = 0;

    for (const op of ops) {
      try {
        const response = await fetch(op.endpoint, {
          method: op.method,
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': op.idempotencyKey, // Deduplicación en el backend
            Authorization: `Bearer ${sessionStorage.getItem('access_token') || ''}`,
          },
          // No desciframos aquí — enviamos tal cual (el backend espera el payload original)
          // En producción el payload se descifraría antes de enviar
          body: JSON.stringify({ _offlineOp: true, idempotencyKey: op.idempotencyKey }),
        });

        if (response.ok || response.status === 409) {
          // 409 Conflict = ya fue procesado (idempotente), se marca como sincronizado igual
          await marcarSincronizado(op.idempotencyKey);
        } else {
          errores++;
        }
      } catch {
        errores++;
      }
    }

    const restantes = await obtenerPendientes();
    setPendientes(restantes.length);
    setEstadoSync(errores > 0 ? 'error' : 'idle');
  }, []);

  const encolarOperacion = useCallback(async (
    endpoint: string,
    method: OperacionOffline['method'],
    payload: unknown
  ): Promise<string | null> => {
    if (isOnline) return null; // Si hay conexión, no hace falta encolar

    const key = await agregarAOutbox(endpoint, method, payload);
    const ops = await obtenerPendientes();
    setPendientes(ops.length);
    return key;
  }, [isOnline]);

  return { isOnline, pendientes, estadoSync, sincronizar, encolarOperacion };
}

// Hook específico para alertas críticas con caché offline
export function useAlertasCriticasOffline(pacienteId: string | null) {
  const [alertas, setAlertas] = useState<AlertaCritica | null>(null);
  const { isOnline } = useSyncOutbox();

  useEffect(() => {
    if (!pacienteId) return;

    if (isOnline) {
      // Online: buscar en API y actualizar caché local
      fetch(`/api/v1/clinical/pacientes/${pacienteId}/alertas`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('access_token') || ''}` },
      })
        .then(r => r.json())
        .then(async (data: AlertaCritica) => {
          setAlertas(data);
          await guardarAlertasCriticas(data); // Actualizar caché cifrada
        })
        .catch(() => {
          // Si falla la red incluso estando "online", intentar caché
          obtenerAlertasCriticas(pacienteId).then(setAlertas);
        });
    } else {
      // Offline: leer directamente de IndexedDB cifrada
      obtenerAlertasCriticas(pacienteId).then(setAlertas);
    }
  }, [pacienteId, isOnline]);

  return { alertas, desdeCache: !isOnline };
}
