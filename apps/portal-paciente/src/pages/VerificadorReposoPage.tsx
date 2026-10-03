import React, { useState } from 'react';
import { Card, Button, Input, Badge } from '@snhce/ui';

export default function VerificadorReposoPage() {
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [buscando, setBuscando] = useState(false);

  const verificar = (e: React.FormEvent) => {
    e.preventDefault();
    setBuscando(true);
    
    // GET /api/v1/prescriptions/reposos/verificar/:codigo
    setTimeout(() => {
      setResultado({
        valido: true,
        paciente: 'C. Pérez',
        cedulaOculta: 'V-*****678',
        diasOtorgados: 3,
        fechaInicio: '2024-10-02',
        fechaFin: '2024-10-04',
        establecimientoEmisor: 'Hospital Central',
        estado: 'VIGENTE',
        firma: 'FIRMA-SIM-X9A8B7'
      });
      setBuscando(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-800">SNHCE</h1>
          <p className="text-gray-600">Verificador Público de Reposos Médicos</p>
        </div>

        <Card className="p-6 shadow-lg mb-4">
          <form onSubmit={verificar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-center">Ingrese el Código de Verificación</label>
              <Input 
                value={codigo} 
                onChange={e => setCodigo(e.target.value.toUpperCase())} 
                placeholder="Ej: A8B9-C123" 
                className="text-center text-lg tracking-widest"
                required 
              />
            </div>
            <Button type="submit" className="w-full" isLoading={buscando}>Validar Autenticidad</Button>
          </form>
        </Card>

        {resultado && (
          <Card className="p-6 shadow-lg border-t-4 border-t-green-500">
            <div className="text-center mb-4">
              <Badge variant="success" className="text-lg py-1 px-4">REPOSO AUTÉNTICO Y {resultado.estado}</Badge>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-500">Paciente:</span>
                <span className="font-bold">{resultado.paciente} ({resultado.cedulaOculta})</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-500">Días otorgados:</span>
                <span className="font-bold text-blue-700">{resultado.diasOtorgados} días</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-500">Período:</span>
                <span className="font-bold">{resultado.fechaInicio} al {resultado.fechaFin}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-500">Emisor:</span>
                <span className="font-bold">{resultado.establecimientoEmisor}</span>
              </div>
              <div className="pt-2 text-xs text-gray-400 text-center">
                Firma Electrónica: {resultado.firma}
              </div>
            </div>

            <div className="mt-6 bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200">
              <strong>Nota de Privacidad:</strong> Por la Ley de Protección de Datos en Salud, el diagnóstico médico no se muestra en este certificado público.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
