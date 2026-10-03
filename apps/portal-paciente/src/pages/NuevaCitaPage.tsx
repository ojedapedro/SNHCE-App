import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '@snhce/ui';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

export default function NuevaCitaPage() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(1);
  const [especialidad, setEspecialidad] = useState('');
  const [centro, setCentro] = useState('');
  const [fecha, setFecha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { enqueue, isOnline } = useOfflineQueue('solicitudes_citas');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isOnline) {
        // Enviar a la API directamente
        // await api.post('/citas', { especialidad, centro, fecha, motivo });
        await new Promise(r => setTimeout(r, 600)); // Simular red
      } else {
        // Guardar en la cola local si está offline
        enqueue({
          type: 'CREATE_CITA',
          payload: { especialidad, centro, fecha, motivo }
        });
      }
      setPaso(4); // Pantalla de éxito
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ConnectionBanner />
      
      <header className="bg-blue-700 px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-semibold">Solicitar nueva cita</h1>
          <Button variant="outline" size="sm" onClick={() => navigate('/citas')} className="bg-blue-600 border-blue-500 hover:bg-blue-500 text-white hover:text-white">
            Cancelar
          </Button>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-2xl w-full p-4 md:py-8">
        {!isOnline && paso < 4 && (
          <div className="mb-6 rounded-md bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <p className="font-semibold flex items-center gap-2">
              <span aria-hidden="true">⚠️</span> Modo sin conexión activo
            </p>
            <p className="mt-1">
              Puede continuar y solicitar su cita. La solicitud se guardará en su dispositivo y se enviará automáticamente cuando recupere la conexión a internet.
            </p>
          </div>
        )}

        <Card className="p-6">
          {paso === 1 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Paso 1: ¿Qué especialidad busca?</h2>
              <div className="space-y-3">
                {['Medicina General', 'Medicina Interna', 'Pediatría', 'Ginecología y Obstetricia', 'Traumatología'].map(esp => (
                  <label key={esp} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
                    <input 
                      type="radio" 
                      name="especialidad" 
                      value={esp} 
                      className="text-blue-600 focus:ring-blue-500"
                      onChange={(e) => setEspecialidad(e.target.value)}
                      checked={especialidad === esp}
                    />
                    <span className="ml-3 font-medium text-gray-800">{esp}</span>
                  </label>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setPaso(2)} disabled={!especialidad}>Siguiente →</Button>
              </div>
            </div>
          )}

          {paso === 2 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Paso 2: Seleccione el centro de salud</h2>
              <p className="text-sm text-gray-500 mb-4">Centros con disponibilidad para {especialidad} cercanos a usted.</p>
              
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {['Hospital General Dr. José Ignacio Baldó', 'Hospital José María Vargas', 'Ambulatorio Tipo III La Pastora', 'CDI San Martín'].map(c => (
                  <label key={c} className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
                    <input 
                      type="radio" 
                      name="centro" 
                      value={c} 
                      className="text-blue-600 focus:ring-blue-500 mt-1"
                      onChange={(e) => setCentro(e.target.value)}
                      checked={centro === c}
                    />
                    <div className="ml-3">
                      <span className="block font-medium text-gray-800">{c}</span>
                      <span className="block text-xs text-gray-500 mt-1">Caracas, Dto. Capital</span>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setPaso(1)}>← Atrás</Button>
                <Button onClick={() => setPaso(3)} disabled={!centro}>Siguiente →</Button>
              </div>
            </div>
          )}

          {paso === 3 && (
            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Paso 3: Confirmación de fecha y motivo</h2>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6">
                <p className="text-sm"><span className="text-gray-500 font-semibold uppercase">Especialidad:</span> <span className="font-medium text-gray-900">{especialidad}</span></p>
                <p className="text-sm mt-2"><span className="text-gray-500 font-semibold uppercase">Centro:</span> <span className="font-medium text-gray-900">{centro}</span></p>
              </div>

              <div className="mb-4">
                <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-1">Día de preferencia</label>
                <input 
                  type="date" 
                  id="fecha"
                  required
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="motivo" className="block text-sm font-medium text-gray-700 mb-1">Motivo breve de la consulta (Opcional)</label>
                <textarea 
                  id="motivo" 
                  rows={2}
                  maxLength={100}
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Ej: Control de tensión, dolor de cabeza..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setPaso(2)}>← Atrás</Button>
                <Button type="submit" isLoading={isSubmitting}>
                  {isOnline ? 'Confirmar Solicitud' : 'Guardar Solicitud (Offline)'}
                </Button>
              </div>
            </form>
          )}

          {paso === 4 && (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 text-3xl font-bold">
                ✓
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {isOnline ? 'Cita solicitada exitosamente' : 'Solicitud guardada en el dispositivo'}
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {isOnline 
                  ? 'Su solicitud ha sido registrada. Se le notificará cuando el establecimiento asigne la hora exacta.' 
                  : 'Se ha perdido la conexión. La solicitud se enviará automáticamente en cuanto su dispositivo vuelva a tener internet.'}
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left inline-block w-full max-w-sm mb-6 text-sm">
                <p><span className="text-gray-500 font-semibold uppercase">Especialidad:</span> {especialidad}</p>
                <p className="mt-2"><span className="text-gray-500 font-semibold uppercase">Centro:</span> {centro}</p>
                <p className="mt-2"><span className="text-gray-500 font-semibold uppercase">Fecha:</span> {new Date(fecha).toLocaleDateString('es-VE')}</p>
              </div>

              <Button onClick={() => navigate('/citas')} className="w-full max-w-sm">
                Ir a Mis Citas
              </Button>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
