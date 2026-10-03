import React, { useState } from 'react';
import { Card, Button, Input, Badge } from '@snhce/ui';

export default function NuevaPrescripcionPage() {
  const [rx, setRx] = useState({ medicamento: '', dosis: '', frecuencia: '', dias: '' });
  const [alerta, setAlerta] = useState<string | null>(null);

  const medicamentosRxNorm = [
    { nombre: 'Amoxicilina 500mg', rxnorm: '12345', alergiaComun: 'Penicilina' },
    { nombre: 'Ibuprofeno 400mg', rxnorm: '67890', alergiaComun: 'AINEs' },
    { nombre: 'Losartán Potásico 50mg', rxnorm: '54321', alergiaComun: 'ARA II' }
  ];

  // Simula alergias del paciente activo
  const alergiasPaciente = ['Penicilina', 'Látex'];

  const handleMedicamentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRx({ ...rx, medicamento: val });
    
    // Disparador de motor de alertas clínicas simulado
    const med = medicamentosRxNorm.find(m => m.nombre.toLowerCase().includes(val.toLowerCase()));
    if (med && alergiasPaciente.includes(med.alergiaComun)) {
      setAlerta(`ALERTA CRÍTICA: El paciente tiene registro de alergia cruzada o directa a [${med.alergiaComun}]. Contraindicado.`);
    } else {
      setAlerta(null);
    }
  };

  const emitirReceta = (e: React.FormEvent) => {
    e.preventDefault();
    if (alerta) {
      alert('Debe justificar o cambiar la prescripción debido a la alerta de alergia.');
      return;
    }
    alert('Receta firmada electrónicamente. QR generado para dispensación.');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Prescripción de Medicamentos</h1>

      {alerta && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6 shadow-sm">
          <div className="flex items-center">
            <span className="text-red-600 font-bold mr-2">⚠️</span>
            <p className="text-red-800 font-medium text-sm">{alerta}</p>
          </div>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={emitirReceta} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Medicamento (Buscador RxNorm)</label>
              <Input 
                list="rxnorm-list"
                value={rx.medicamento} 
                onChange={handleMedicamentoChange} 
                placeholder="Ej: Amoxicilina 500mg..."
                required 
              />
              <datalist id="rxnorm-list">
                {medicamentosRxNorm.map((m, i) => <option key={i} value={m.nombre} />)}
              </datalist>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Dosis</label>
              <Input value={rx.dosis} onChange={e => setRx({...rx, dosis: e.target.value})} placeholder="Ej: 1 tableta" required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Frecuencia</label>
              <Input value={rx.frecuencia} onChange={e => setRx({...rx, frecuencia: e.target.value})} placeholder="Ej: Cada 8 horas" required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Duración (Días)</label>
              <Input type="number" value={rx.dias} onChange={e => setRx({...rx, dias: e.target.value})} placeholder="Ej: 7" required />
            </div>
          </div>

          <div className="mt-6 border-t pt-4 flex justify-between items-center">
            <p className="text-sm text-gray-500">El documento será firmado con su certificado digital acreditado.</p>
            <Button type="submit" disabled={!!alerta} className={alerta ? 'opacity-50 cursor-not-allowed' : ''}>
              Firmar y Emitir Receta
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
