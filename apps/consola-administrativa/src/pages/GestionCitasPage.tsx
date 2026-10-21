import { useState } from 'react';
import { Card, Button, Badge } from '@snhce/ui';
import { useQuery } from '@tanstack/react-query';

export default function GestionCitasPage() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  const { data: agenda, isLoading } = useQuery({
    queryKey: ['agenda-admin', fecha],
    queryFn: async () => {
      // GET /api/v1/citas/agenda?fecha=...
      await new Promise(r => setTimeout(r, 600));
      return [
        { id: '1', hora: '08:00', paciente: 'M. P.', especialidad: 'Medicina Interna', estado: 'CONFIRMADA' },
        { id: '2', hora: '08:30', paciente: 'C. L.', especialidad: 'Medicina Interna', estado: 'EN_ESPERA' },
        { id: '3', hora: '09:00', paciente: 'A. M.', especialidad: 'Traumatología', estado: 'SOLICITADA' },
      ];
    }
  });

  const getBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'CONFIRMADA': return 'success';
      case 'EN_ESPERA': return 'warning';
      case 'ATENDIDA': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Gestión de Citas y Agendas</h1>
      <p className="text-gray-600 mb-6">Administre la disponibilidad y el estado de las citas del establecimiento.</p>

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <input 
            type="date" 
            value={fecha} 
            onChange={e => setFecha(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <Button variant="outline">Filtrar por Especialidad</Button>
        </div>
        <Button>+ Nueva Cita (Asistida)</Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Cargando agenda...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Hora</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Paciente</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Especialidad</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {agenda?.map((cita) => (
                <tr key={cita.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{cita.hora}</td>
                  <td className="px-6 py-4 text-gray-600">{cita.paciente}</td>
                  <td className="px-6 py-4 text-gray-600">{cita.especialidad}</td>
                  <td className="px-6 py-4">
                    <Badge variant={getBadgeVariant(cita.estado)}>{cita.estado}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {cita.estado !== 'CONFIRMADA' && cita.estado !== 'ATENDIDA' && (
                      <Button variant="outline" size="sm" className="mr-2">Confirmar</Button>
                    )}
                    <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">Anular</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
