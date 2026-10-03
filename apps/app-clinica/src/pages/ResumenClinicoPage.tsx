import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Badge, Button, Spinner } from '@snhce/ui';

interface ResumenClinico {
  paciente: {
    nombres: string;
    apellidos: string;
    sexo: string;
    edad: number;
    estadoIdentidad: string;
  };
  alergias: Array<{ id: string; agente: string; severidad: string; reaccion: string }>;
  medicacionActiva: Array<{ id: string; medicamento: string; posologia: string }>;
  ultimosDiagnosticos: Array<{ id: string; descripcion: string; fecha: string; estado: string }>;
  esAccesoEmergencia: boolean;
}

export default function ResumenClinicoPage() {
  const { opaqueId } = useParams<{ opaqueId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery<ResumenClinico>({
    queryKey: ['resumen-clinico', opaqueId],
    queryFn: async () => {
      // TODO: GET /api/v1/clinical/pacientes/${opaqueId}/resumen
      // El backend verificará el ABAC (RelacionAsistencialGuard) antes de devolver datos
      await new Promise((r) => setTimeout(r, 400));
      
      return {
        paciente: { nombres: 'María Gabriela', apellidos: 'Silva Pérez', sexo: 'FEMENINO', edad: 45, estadoIdentidad: 'VERIFICADO' },
        alergias: [{ id: 'a1', agente: 'Penicilina', severidad: 'GRAVE', reaccion: 'Anafilaxia' }],
        medicacionActiva: [{ id: 'm1', medicamento: 'Losartán 50mg', posologia: '1 tableta VO cada 24h' }],
        ultimosDiagnosticos: [{ id: 'd1', descripcion: 'Hipertensión esencial (primaria)', fecha: '2023-10-15', estado: 'CRONICO' }],
        esAccesoEmergencia: false,
      };
    },
    retry: false, // Fallar rápido si hay error de autorización
  });

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50">
        <Spinner size="lg" aria-label="Cargando resumen clínico..." />
        <p className="mt-4 text-sm text-gray-500">Recuperando historia clínica de forma segura...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md text-center p-6 border-red-200">
          <div className="text-4xl mb-3">⛔</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-sm text-gray-600 mb-6">
            No pudimos verificar una relación asistencial activa con este paciente o la sesión expiró.
          </p>
          <Button onClick={() => navigate('/')} className="w-full">Volver a la Agenda</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Banner de Emergencia (Si aplica) */}
      {data.esAccesoEmergencia && (
        <div className="bg-red-600 text-white px-4 py-2 text-sm font-medium flex justify-center items-center gap-2">
          <span aria-hidden="true">🚨</span> 
          ATENCIÓN: Está visualizando esta historia bajo la modalidad de Acceso de Emergencia.
        </div>
      )}

      {/* Header del Paciente (Sticky) */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
              {data.paciente.nombres[0]}{data.paciente.apellidos[0]}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                {data.paciente.apellidos}, {data.paciente.nombres}
              </h1>
              <div className="flex gap-2 text-xs text-gray-600 mt-0.5">
                <span>{data.paciente.edad} años</span>
                <span>•</span>
                <span>{data.paciente.sexo}</span>
                <span>•</span>
                <Badge variant={data.paciente.estadoIdentidad === 'VERIFICADO' ? 'success' : 'warning'} size="sm">
                  {data.paciente.estadoIdentidad === 'VERIFICADO' ? 'Identidad Validada' : 'No Validada'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/')}>Volver</Button>
            <Button onClick={() => navigate(`/paciente/${opaqueId}/nueva-consulta`)}>
              Iniciar Consulta
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-5xl w-full p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda: Alertas Críticas (Alergias) */}
        <div className="space-y-6 md:col-span-1">
          <Card className="border-red-100 shadow-sm">
            <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex justify-between items-center">
              <h2 className="font-bold text-red-800 text-sm uppercase flex items-center gap-2">
                <span>⚠️</span> Alergias
              </h2>
            </div>
            <div className="p-4">
              {data.alergias.length > 0 ? (
                <ul className="space-y-3">
                  {data.alergias.map(a => (
                    <li key={a.id} className="text-sm">
                      <span className="font-semibold text-gray-800 block">{a.agente}</span>
                      <span className="text-gray-600">{a.reaccion} ({a.severidad})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No se registran alergias conocidas.</p>
              )}
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h2 className="font-bold text-gray-800 text-sm uppercase">Medicamentos Activos</h2>
            </div>
            <div className="p-4">
              {data.medicacionActiva.length > 0 ? (
                <ul className="space-y-3">
                  {data.medicacionActiva.map(m => (
                    <li key={m.id} className="text-sm">
                      <span className="font-semibold text-gray-800 block">{m.medicamento}</span>
                      <span className="text-gray-600">{m.posologia}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No hay medicación activa.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Columna Derecha: Diagnósticos y Resumen */}
        <div className="space-y-6 md:col-span-2">
          <Card className="shadow-sm h-full">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-bold text-gray-800 text-sm uppercase">Lista de Problemas / Diagnósticos</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/paciente/${opaqueId}/historial`)}>
                Ver historial completo →
              </Button>
            </div>
            <div className="p-4">
              {data.ultimosDiagnosticos.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {data.ultimosDiagnosticos.map(d => (
                    <div key={d.id} className="py-3 flex justify-between items-start first:pt-0 last:pb-0">
                      <div>
                        <p className="font-medium text-gray-800">{d.descripcion}</p>
                        <p className="text-xs text-gray-500 mt-1">Registrado el: {d.fecha}</p>
                      </div>
                      <Badge variant="default" size="sm">{d.estado}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic text-center py-8">No hay diagnósticos registrados.</p>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
