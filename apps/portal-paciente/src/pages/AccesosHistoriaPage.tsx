import React, { useState } from 'react';
import { Card, Button, Badge } from '@snhce/ui';

export default function AccesosHistoriaPage() {
  const [reportando, setReportando] = useState<string | null>(null);

  // En producción vendría de GET /api/v1/auditoria/mis-accesos
  const accesos = [
    {
      id: 'a1',
      medico: 'Dr. Carlos Rivas',
      especialidad: 'Medicina Interna',
      centro: 'Hospital General Caracas',
      fecha: '02/10/2024, 09:15',
      tipo: 'CONSULTA_NORMAL',
      esEmergencia: false,
    },
    {
      id: 'a2',
      medico: 'Dra. Laura González',
      especialidad: 'Cardiología',
      centro: 'Hospital Vargas',
      fecha: '15/09/2024, 14:30',
      tipo: 'ACCESO_EMERGENCIA',
      esEmergencia: true,
      justificacion: 'Dolor precordial intenso. Acceso de urgencia para verificar historia cardiovascular.',
    },
    {
      id: 'a3',
      medico: 'Enf. Miguel Sosa',
      especialidad: 'Enfermería',
      centro: 'CDI Petare',
      fecha: '02/09/2024, 10:00',
      tipo: 'CONSULTA_NORMAL',
      esEmergencia: false,
    },
  ];

  const reportarAccesoSospechoso = (accesoId: string) => {
    setReportando(accesoId);
    // POST /api/v1/auditoria/reportar
    setTimeout(() => {
      alert('Su reporte ha sido enviado al comité de auditoría del SNHCE para revisión dentro de las 48 horas. Gracias.');
      setReportando(null);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-700 px-4 py-4 text-white shadow-md">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-lg font-semibold">Quién Vio Mi Historia</h1>
          <p className="text-blue-200 text-sm">Registro completo de accesos a su expediente clínico</p>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-3xl w-full p-4 md:py-8 space-y-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md text-sm">
          <strong>Su derecho:</strong> Puede ver quién ha accedido a su historia clínica. Si detecta un acceso que no le parece legítimo, puede reportarlo directamente desde aquí.
        </div>

        {accesos.map((acceso) => (
          <Card
            key={acceso.id}
            className={`p-5 ${acceso.esEmergencia ? 'border-l-4 border-l-orange-500 bg-orange-50' : ''}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-gray-900">{acceso.medico}</p>
                <p className="text-sm text-gray-500">{acceso.especialidad} · {acceso.centro}</p>
              </div>
              <div className="text-right">
                {acceso.esEmergencia && (
                  <Badge variant="destructive" className="mb-1 block">
                    🚨 Acceso de Emergencia
                  </Badge>
                )}
                <p className="text-xs text-gray-400">{acceso.fecha}</p>
              </div>
            </div>

            {acceso.esEmergencia && acceso.justificacion && (
              <div className="bg-white border border-orange-200 rounded p-3 mb-3">
                <p className="text-xs font-bold text-orange-600 mb-1">JUSTIFICACIÓN DECLARADA POR EL MÉDICO:</p>
                <p className="text-sm italic text-gray-700">"{acceso.justificacion}"</p>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                isLoading={reportando === acceso.id}
                onClick={() => reportarAccesoSospechoso(acceso.id)}
              >
                Reportar Acceso Sospechoso
              </Button>
            </div>
          </Card>
        ))}
      </main>
    </div>
  );
}
