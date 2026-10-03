import React, { useState } from 'react';
import { Card, Button, Input, Badge } from '@snhce/ui';

export default function NuevaConsultaPage() {
  const [signos, setSignos] = useState({ peso: '', talla: '', presionSistolica: '', presionDiastolica: '', fc: '', fr: '', temp: '' });
  const [soap, setSoap] = useState({ subjetivo: '', objetivo: '', analisis: '', plan: '' });
  const [diagnosticos, setDiagnosticos] = useState([{ cie10: '', descripcion: '' }]);

  // Autocompletado simulado
  const sugerenciasCie10 = ['J06.9 - Infección aguda de las vías respiratorias superiores', 'I10.X - Hipertensión esencial (primaria)', 'E11.9 - Diabetes mellitus tipo 2 sin complicaciones'];

  const aplicarPlantilla = (tipo: string) => {
    if (tipo === 'general') {
      setSoap({
        subjetivo: 'Paciente refiere malestar general de X días de evolución...',
        objetivo: 'Paciente en aparentes buenas condiciones generales. Consciente, orientado...',
        analisis: 'Cuadro clínico sugestivo de...',
        plan: '1. Reposo relativo.\n2. Tratamiento sintomático.\n3. Control en X días.'
      });
    }
  };

  const guardarEvolucion = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Evolución guardada. Los registros clínicos son de solo anexar (Inmutables).');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Nueva Consulta (Evolución)</h1>
        <Button variant="outline" onClick={() => aplicarPlantilla('general')}>📄 Aplicar Plantilla SOAP</Button>
      </div>

      <form onSubmit={guardarEvolucion} className="space-y-6">
        {/* Signos Vitales */}
        <Card className="p-6">
          <h2 className="font-bold text-gray-800 mb-4 border-b pb-2">1. Signos Vitales</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Presión Arterial (mmHg)</label>
              <div className="flex items-center gap-2">
                <Input placeholder="120" value={signos.presionSistolica} onChange={e => setSignos({...signos, presionSistolica: e.target.value})} />
                <span>/</span>
                <Input placeholder="80" value={signos.presionDiastolica} onChange={e => setSignos({...signos, presionDiastolica: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Frecuencia Cardíaca (lpm)</label>
              <Input placeholder="80" value={signos.fc} onChange={e => setSignos({...signos, fc: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Temperatura (°C)</label>
              <Input placeholder="37.0" value={signos.temp} onChange={e => setSignos({...signos, temp: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Peso (Kg)</label>
              <Input placeholder="70" value={signos.peso} onChange={e => setSignos({...signos, peso: e.target.value})} />
            </div>
          </div>
        </Card>

        {/* Formato SOAP */}
        <Card className="p-6">
          <h2 className="font-bold text-gray-800 mb-4 border-b pb-2">2. Evolución (SOAP)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">S - Subjetivo (Motivo de consulta y síntomas)</label>
              <textarea className="w-full border rounded-md p-2 text-sm h-20" value={soap.subjetivo} onChange={e => setSoap({...soap, subjetivo: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">O - Objetivo (Examen físico)</label>
              <textarea className="w-full border rounded-md p-2 text-sm h-20" value={soap.objetivo} onChange={e => setSoap({...soap, objetivo: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">A - Análisis (Impresión diagnóstica)</label>
              <textarea className="w-full border rounded-md p-2 text-sm h-16" value={soap.analisis} onChange={e => setSoap({...soap, analisis: e.target.value})} required />
            </div>
          </div>
        </Card>

        {/* Diagnósticos CIE-10 */}
        <Card className="p-6">
          <h2 className="font-bold text-gray-800 mb-4 border-b pb-2">3. Diagnósticos (CIE-10)</h2>
          <div className="space-y-2">
            <div className="flex gap-4">
              <Input placeholder="Escriba código o nombre de patología..." list="cie10-suggestions" className="flex-1" required />
              <datalist id="cie10-suggestions">
                {sugerenciasCie10.map((s, i) => <option key={i} value={s} />)}
              </datalist>
              <Button type="button" variant="outline">Añadir Dx Secundario</Button>
            </div>
          </div>
        </Card>

        {/* Plan y Tratamiento */}
        <Card className="p-6">
          <h2 className="font-bold text-gray-800 mb-4 border-b pb-2">4. P - Plan de Tratamiento</h2>
          <textarea className="w-full border rounded-md p-2 text-sm h-24" value={soap.plan} onChange={e => setSoap({...soap, plan: e.target.value})} required />
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline">Guardar Borrador</Button>
          <Button type="submit">Firmar y Guardar Evolución</Button>
        </div>
      </form>
    </div>
  );
}
