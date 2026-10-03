import React from 'react';
import { Card, Badge, Button } from '@snhce/ui';

export default function NuevoReposoPage() {
  const emitirReposo = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Reposo firmado electrónicamente. Se ha generado un QR de validación público y el diagnóstico ha sido ocultado para el patrono.');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Emisión de Reposo Médico</h1>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md mb-6 text-sm">
        <strong>Aviso Legal:</strong> Este documento será firmado criptográficamente. El patrono del paciente podrá verificar su autenticidad mediante un código QR o URL pública, pero <strong>NO</strong> tendrá acceso al diagnóstico médico (CIE-10) en cumplimiento del derecho a la privacidad.
      </div>

      <Card className="p-6">
        <form onSubmit={emitirReposo} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Diagnóstico Causante (Solo visible internamente)</label>
            <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" required>
              <option value="">Seleccione el diagnóstico principal de la consulta actual...</option>
              <option value="J069">J06.9 - Infección aguda de vías respiratorias</option>
              <option value="S934">S93.4 - Esguince y torcedura de tobillo</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fecha de Inicio</label>
              <input type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duración (Días)</label>
              <input type="number" min="1" max="90" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Ej: 3" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Observaciones Opcionales (No clínicas)</label>
            <textarea className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Ej: Reposo absoluto, prohibición de levantar cargas pesadas..."></textarea>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit">Firmar y Emitir Reposo</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
