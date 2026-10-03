import React, { useState } from 'react';
import { Card, Button, Input } from '@snhce/ui';

export default function RegistroProvisionalPage() {
  const [form, setForm] = useState({ nombres: '', apellidos: '', motivo: 'indocumentado' });

  const registrar = (e: React.FormEvent) => {
    e.preventDefault();
    // Simula registro de emergencia/indocumentado en el MPI
    alert('Paciente registrado provisionalmente. ID temporal generado.');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Registro Provisional (MPI)</h1>
      <p className="text-gray-600 mb-6">Registro de pacientes sin documento de identidad (menores no cedulados, emergencias inconscientes, indígenas, extranjeros sin pasaporte).</p>

      <Card className="p-6 max-w-2xl">
        <form onSubmit={registrar} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombres (Aproximados o 'Desconocido')</label>
              <Input 
                value={form.nombres} 
                onChange={(e) => setForm({...form, nombres: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Apellidos (Opcional)</label>
              <Input 
                value={form.apellidos} 
                onChange={(e) => setForm({...form, apellidos: e.target.value})} 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Motivo de Registro Provisional</label>
            <select 
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.motivo}
              onChange={(e) => setForm({...form, motivo: e.target.value})}
            >
              <option value="indocumentado">Indocumentado de la localidad</option>
              <option value="emergencia">Paciente de emergencia (Inconsciente/Sin cartera)</option>
              <option value="menor">Menor de edad (sin partida de nacimiento a la mano)</option>
              <option value="extranjero">Extranjero sin pasaporte</option>
            </select>
          </div>

          <div className="bg-amber-50 p-4 border border-amber-200 rounded text-sm text-amber-800">
            <strong>Atención:</strong> Esto creará una historia clínica temporal bajo el estado `PROVISIONAL`. Una vez el paciente se identifique formalmente, se usará la función de "Fusión de Duplicados" para unir esta historia con su registro principal.
          </div>

          <Button type="submit">Generar Registro Provisional</Button>
        </form>
      </Card>
    </div>
  );
}
