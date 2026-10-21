import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, Badge, Button, Spinner } from '@snhce/ui';
import { AccesoEmergenciaModal } from '../components/AccesoEmergenciaModal';

interface Cita {
  id: string;
  fechaHora: string;
  pacienteNombre: string;
  especialidad: string;
  estado: 'CONFIRMADA' | 'EN_ESPERA' | 'ATENDIDA' | 'INASISTENCIA';
  opaqueId: string;
}

const ESTADO_CONFIG = {
  CONFIRMADA: { label: 'Confirmada', color: 'success' as const },
  EN_ESPERA: { label: 'En espera', color: 'warning' as const },
  ATENDIDA: { label: 'Atendida', color: 'default' as const },
  INASISTENCIA: { label: 'Inasistencia', color: 'destructive' as const },
};

export default function AgendaPage() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    format(new Date(), 'yyyy-MM-dd'),
  );
  const [pacienteEmergencia, setPacienteEmergencia] = useState<string | null>(null);

  const { data: citas, isLoading } = useQuery<Cita[]>({
    queryKey: ['agenda', fechaSeleccionada],
    queryFn: async () => {
      // TODO: GET /api/v1/agenda?fecha=${fechaSeleccionada}
      await new Promise((r) => setTimeout(r, 300));
      // Datos sintéticos de demostración
      return [
        { id: '1', fechaHora: `${fechaSeleccionada}T08:00:00`, pacienteNombre: 'M. G. S.', especialidad: 'Medicina Interna', estado: 'ATENDIDA', opaqueId: 'opq001' },
        { id: '2', fechaHora: `${fechaSeleccionada}T09:00:00`, pacienteNombre: 'J. A. P.', especialidad: 'Medicina Interna', estado: 'CONFIRMADA', opaqueId: 'opq002' },
        { id: '3', fechaHora: `${fechaSeleccionada}T09:20:00`, pacienteNombre: 'A. L. M.', especialidad: 'Medicina Interna', estado: 'EN_ESPERA', opaqueId: 'opq003' },
        { id: '4', fechaHora: `${fechaSeleccionada}T10:00:00`, pacienteNombre: 'C. E. R.', especialidad: 'Medicina Interna', estado: 'CONFIRMADA', opaqueId: 'opq004' },
      ];
    },
    staleTime: 1000 * 30, // Actualizar cada 30s
    refetchInterval: 1000 * 60, // Re-fetch cada minuto
  });

  const pendientes = citas?.filter((c) => ['CONFIRMADA', 'EN_ESPERA'].includes(c.estado)).length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header clínico */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Agenda del día</h1>
            <p className="text-xs text-gray-500">Aplicación Clínica — SNHCE</p>
          </div>
          <div className="flex items-center gap-3">
            {pendientes > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 text-xs font-bold text-white">
                {pendientes}
              </span>
            )}
            <Button variant="outline" size="sm" asChild>
              <a href="/paciente/buscar">🔍 Buscar paciente</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Selector de fecha */}
        <div className="mb-5 flex items-center gap-3">
          <button
            onClick={() => setFechaSeleccionada(format(addDays(new Date(fechaSeleccionada), -1), 'yyyy-MM-dd'))}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Día anterior"
          >
            ←
          </button>
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Seleccionar fecha"
          />
          <button
            onClick={() => setFechaSeleccionada(format(addDays(new Date(fechaSeleccionada), 1), 'yyyy-MM-dd'))}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Día siguiente"
          >
            →
          </button>
          <span className="text-sm text-gray-500 capitalize">
            {format(new Date(fechaSeleccionada + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
          </span>
          <button
            onClick={() => setFechaSeleccionada(format(new Date(), 'yyyy-MM-dd'))}
            className="ml-auto rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Hoy
          </button>
        </div>

        {/* Lista de citas */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner aria-label="Cargando agenda..." />
          </div>
        )}

        {!isLoading && citas?.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
            <p className="text-4xl mb-3">📅</p>
            <p>No hay citas programadas para este día.</p>
          </div>
        )}

        <div className="space-y-3">
          {citas?.map((cita) => {
            const hora = format(new Date(cita.fechaHora), 'HH:mm');
            const estadoCfg = ESTADO_CONFIG[cita.estado];
            const esAtendible = ['CONFIRMADA', 'EN_ESPERA'].includes(cita.estado);

            return (
              <Card key={cita.id}>
                <div className="flex items-center gap-4 p-4">
                  {/* Hora */}
                  <div className="w-14 flex-shrink-0 text-center">
                    <p className="text-lg font-bold text-gray-800">{hora}</p>
                  </div>

                  {/* Divider */}
                  <div className="w-0.5 self-stretch bg-gray-200" />

                  {/* Info del paciente */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{cita.pacienteNombre}</p>
                    <p className="text-sm text-gray-500">{cita.especialidad}</p>
                  </div>

                  {/* Estado */}
                  <Badge variant={estadoCfg.color}>{estadoCfg.label}</Badge>

                  {/* Acciones */}
                  {esAtendible && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" asChild>
                        <a href={`/paciente/${cita.opaqueId}/resumen`}>Atender</a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPacienteEmergencia(cita.opaqueId)}
                        title="Acceso de emergencia"
                      >
                        🚨
                      </Button>
                    </div>
                  )}
                  {cita.estado === 'ATENDIDA' && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={`/paciente/${cita.opaqueId}/historial`}>Ver historial</a>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Modal de acceso de emergencia */}
      {pacienteEmergencia && (
        <AccesoEmergenciaModal
          opaqueId={pacienteEmergencia}
          onClose={() => setPacienteEmergencia(null)}
          onConfirm={(opaqueId) => {
            setPacienteEmergencia(null);
            window.location.href = `/paciente/${opaqueId}/resumen`;
          }}
        />
      )}
    </div>
  );
}
