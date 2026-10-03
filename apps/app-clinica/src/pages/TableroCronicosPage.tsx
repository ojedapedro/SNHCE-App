import React from 'react';
import { Card, Badge, Button } from '@snhce/ui';

export default function TableroCronicosPage() {
  const pacientes = [
    { id: 1, nombre: 'J. Ramírez', diagnostico: 'Diabetes Mellitus Tipo 2', adherencia: 'PARCIAL', ultimaCita: 'Hace 3 meses', proximaCita: 'Vencida' },
    { id: 2, nombre: 'M. González', diagnostico: 'Hipertensión Esencial', adherencia: 'NO_ADHERENTE', ultimaCita: 'Hace 6 meses', proximaCita: 'Vencida' },
    { id: 3, nombre: 'C. López', diagnostico: 'Asma Bronquial', adherencia: 'COMPLETA', ultimaCita: 'Hace 1 mes', proximaCita: 'En 2 meses' },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Seguimiento de Pacientes Crónicos</h1>
          <p className="text-gray-600">Tablero epidemiológico del centro de salud.</p>
        </div>
        <Button>Generar Reporte Excel</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-800 font-bold mb-1">Alertas Críticas (Abandono)</p>
          <p className="text-3xl font-bold text-red-600">12</p>
        </Card>
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-800 font-bold mb-1">Citas Vencidas</p>
          <p className="text-3xl font-bold text-yellow-600">45</p>
        </Card>
        <Card className="p-4 bg-green-50 border-green-200">
          <p className="text-sm text-green-800 font-bold mb-1">Adherencia Completa</p>
          <p className="text-3xl font-bold text-green-600">89%</p>
        </Card>
      </div>

      <Card>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500">Paciente</th>
              <th className="px-6 py-3 font-medium text-gray-500">Patología Crónica</th>
              <th className="px-6 py-3 font-medium text-gray-500">Adherencia Farmacológica</th>
              <th className="px-6 py-3 font-medium text-gray-500">Último Control</th>
              <th className="px-6 py-3 font-medium text-gray-500">Próximo Control</th>
              <th className="px-6 py-3 font-medium text-gray-500">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pacientes.map((p) => (
              <tr key={p.id}>
                <td className="px-6 py-4 font-bold">{p.nombre}</td>
                <td className="px-6 py-4">{p.diagnostico}</td>
                <td className="px-6 py-4">
                  <Badge variant={p.adherencia === 'COMPLETA' ? 'success' : p.adherencia === 'PARCIAL' ? 'warning' : 'destructive'}>
                    {p.adherencia}
                  </Badge>
                </td>
                <td className="px-6 py-4">{p.ultimaCita}</td>
                <td className="px-6 py-4 text-red-600 font-medium">{p.proximaCita}</td>
                <td className="px-6 py-4">
                  <Button variant="outline" size="sm">Llamar / SMS</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
