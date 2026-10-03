import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge } from '@snhce/ui';
import { useQuery } from '@tanstack/react-query';
import { ConnectionBanner } from '../components/ConnectionBanner';

interface Cita {
  id: string;
  fechaHora: string;
  especialidad: string;
  establecimiento: string;
  medico: string;
  estado: 'SOLICITADA' | 'CONFIRMADA' | 'EN_ESPERA' | 'ATENDIDA' | 'INASISTENCIA' | 'CANCELADA' | 'REPROGRAMADA';
}

export default function MisCitasPage() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<'proximas' | 'pasadas'>('proximas');

  const { data: citas, isLoading, error } = useQuery<Cita[]>({
    queryKey: ['mis-citas'],
    queryFn: async () => {
      // TODO: GET /api/v1/citas/me
      await new Promise((r) => setTimeout(r, 500));
      return [
        {
          id: 'c-1',
          fechaHora: new Date(Date.now() + 86400000 * 3).toISOString(), // En 3 días
          especialidad: 'Medicina Interna',
          establecimiento: 'Hospital General Dr. José Ignacio Baldó',
          medico: 'Dra. Carmen Rodríguez',
          estado: 'CONFIRMADA',
        },
        {
          id: 'c-2',
          fechaHora: new Date(Date.now() - 86400000 * 15).toISOString(), // Hace 15 días
          especialidad: 'Traumatología',
          establecimiento: 'CDI La Pastora',
          medico: 'Dr. Alejandro Mendoza',
          estado: 'ATENDIDA',
        },
      ];
    },
  });

  const getBadgeVariant = (estado: Cita['estado']) => {
    switch (estado) {
      case 'CONFIRMADA': return 'success';
      case 'EN_ESPERA': return 'warning';
      case 'ATENDIDA': return 'default';
      case 'CANCELADA': return 'danger';
      case 'INASISTENCIA': return 'danger';
      default: return 'default';
    }
  };

  const now = new Date();
  const citasFiltradas = citas?.filter(c => {
    const fecha = new Date(c.fechaHora);
    if (filtro === 'proximas') {
      return fecha >= now && !['CANCELADA', 'ATENDIDA', 'INASISTENCIA'].includes(c.estado);
    } else {
      return fecha < now || ['CANCELADA', 'ATENDIDA', 'INASISTENCIA'].includes(c.estado);
    }
  }).sort((a, b) => {
    if (filtro === 'proximas') {
      return new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime();
    } else {
      return new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime();
    }
  }) || [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ConnectionBanner />
      
      <header className="bg-blue-700 px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Mis Citas</h1>
            <p className="text-xs text-blue-200 mt-0.5">Gestión de atención médica</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="bg-blue-600 text-white border-blue-500 hover:bg-blue-500 hover:text-white">
            Volver
          </Button>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-3xl w-full p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setFiltro('proximas')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${filtro === 'proximas' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Próximas
            </button>
            <button
              onClick={() => setFiltro('pasadas')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${filtro === 'pasadas' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Historial
            </button>
          </div>
          <Button onClick={() => navigate('/citas/nueva')}>+ Solicitar Cita</Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Cargando citas...</div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-md">Error al cargar las citas.</div>
        ) : citasFiltradas.length === 0 ? (
          <Card className="text-center py-16 text-gray-500">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-gray-600">No tiene citas {filtro === 'proximas' ? 'próximas' : 'en el historial'}.</p>
            {filtro === 'proximas' && (
              <Button onClick={() => navigate('/citas/nueva')} className="mt-4">Solicitar nueva cita</Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {citasFiltradas.map(cita => {
              const fecha = new Date(cita.fechaHora);
              return (
                <Card key={cita.id} className="p-4 sm:p-5 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant={getBadgeVariant(cita.estado)}>{cita.estado}</Badge>
                    <time className="text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                      {fecha.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })} a las {fecha.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-4">
                    <div>
                      <p className="text-gray-500 text-xs font-semibold uppercase">Especialidad</p>
                      <p className="text-gray-900 font-medium">{cita.especialidad}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs font-semibold uppercase">Establecimiento</p>
                      <p className="text-gray-900">{cita.establecimiento}</p>
                    </div>
                    <div className="sm:col-span-2 border-t border-gray-100 pt-3">
                      <p className="text-gray-500 text-xs font-semibold uppercase">Personal Médico Asignado</p>
                      <p className="text-gray-700">{cita.medico}</p>
                    </div>
                  </div>

                  {filtro === 'proximas' && cita.estado !== 'CANCELADA' && (
                    <div className="mt-5 pt-4 border-t border-gray-100 flex gap-3">
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                        Cancelar cita
                      </Button>
                      <Button variant="outline" size="sm">
                        Reprogramar
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
