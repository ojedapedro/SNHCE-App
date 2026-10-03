import React from 'react';
import { Card, Badge, Button } from '@snhce/ui';

export default function MiHistoriaPage() {
  // Datos mockeados de la historia clínica del paciente
  const timeline = [
    {
      id: 1,
      fecha: '2024-10-01',
      centro: 'Hospital General Caracas',
      especialidad: 'Medicina Interna',
      diagnostico: 'Infección respiratoria aguda',
      medico: 'Dra. Silva',
      tieneReceta: true,
      tieneReposo: true,
    },
    {
      id: 2,
      fecha: '2023-05-14',
      centro: 'CDI Petare',
      especialidad: 'Medicina General',
      diagnostico: 'Hipertensión arterial (Control)',
      medico: 'Dr. Mendoza',
      tieneReceta: true,
      tieneReposo: false,
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-700 px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-lg font-semibold">Mi Historia Clínica</h1>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-4xl w-full p-4 md:py-8">
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md mb-6 text-sm">
          <strong>Modo Solo Lectura:</strong> Usted tiene nivel de cuenta COMPLETO. Esta es una vista inmutable de su expediente de salud unificado a nivel nacional.
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Línea de Tiempo Clínica</h2>
          
          <div className="relative border-l border-gray-200 ml-3 space-y-8">
            {timeline.map((item) => (
              <div key={item.id} className="mb-8 ml-6">
                <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white">
                  <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
                </span>
                
                <Card className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-900">{item.especialidad}</h3>
                    <span className="text-sm font-medium text-gray-500">{item.fecha}</span>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 mb-1"><strong>Centro:</strong> {item.centro}</p>
                    <p className="text-sm text-gray-700 mb-1"><strong>Médico Tratante:</strong> {item.medico}</p>
                    <p className="text-sm text-gray-700"><strong>Diagnóstico Principal:</strong> {item.diagnostico}</p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
                    <Button variant="outline" size="sm">Ver Evolución Completa</Button>
                    
                    {item.tieneReceta && (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                        📄 Descargar Receta (PDF)
                      </Button>
                    )}
                    
                    {item.tieneReposo && (
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                        📄 Descargar Reposo Médico
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
