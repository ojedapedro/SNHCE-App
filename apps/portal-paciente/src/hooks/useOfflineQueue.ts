import { useState, useEffect } from 'react';

/**
 * Hook para gestionar la cola de operaciones offline (Outbox local).
 * 
 * Permite a la PWA o App Clínica guardar operaciones cuando no hay conexión,
 * y reintentarlas automáticamente cuando vuelve la red.
 */
export function useOfflineQueue(queueName: string) {
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Cargar cola desde IndexedDB (simulado con localStorage por brevedad)
    const stored = localStorage.getItem(`snhce_queue_${queueName}`);
    if (stored) {
      setPendingItems(JSON.parse(stored));
    }

    const handleOnline = () => {
      setIsOnline(true);
      // Disparar sincronización al volver la conexión
      sync();
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queueName]);

  // Persistir en cada cambio
  useEffect(() => {
    localStorage.setItem(`snhce_queue_${queueName}`, JSON.stringify(pendingItems));
  }, [pendingItems, queueName]);

  const enqueue = (operation: { type: string; payload: any }) => {
    const item = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...operation
    };
    setPendingItems(prev => [...prev, item]);
    return item.id;
  };

  const remove = (id: string) => {
    setPendingItems(prev => prev.filter(item => item.id !== id));
  };

  const sync = async () => {
    if (!navigator.onLine || pendingItems.length === 0 || isSyncing) return;
    
    setIsSyncing(true);
    
    // Simulación de procesamiento de la cola (FIFO)
    const itemsToProcess = [...pendingItems];
    
    for (const item of itemsToProcess) {
      try {
        // En producción: llamar a la API real según el type
        console.log(`[OfflineQueue] Sincronizando operación ${item.id} (${item.type})`);
        await new Promise(r => setTimeout(r, 500));
        
        // Si tiene éxito, remover de la cola
        remove(item.id);
      } catch (err) {
        console.error(`[OfflineQueue] Error sincronizando ${item.id}:`, err);
        // Si hay error (ej. 500), se deja en la cola para intentar después
        // Si es 400 (Bad Request), en producción habría que enviarlo a una Dead Letter Queue (DLQ)
      }
    }
    
    setIsSyncing(false);
  };

  return {
    enqueue,
    pendingItems,
    isSyncing,
    isOnline,
    sync,
    pendingCount: pendingItems.length
  };
}
