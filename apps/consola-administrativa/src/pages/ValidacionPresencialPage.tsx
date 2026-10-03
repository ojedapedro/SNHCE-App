import React, { useState } from 'react';
import { Card, Button, Input, Badge, Toast } from '@snhce/ui';

export default function ValidacionPresencialPage() {
  const [cedula, setCedula] = useState('');
  const [paciente, setPaciente] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [validando, setValidando] = useState(false);

  const buscarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simular búsqueda en el backend
    setTimeout(() => {
      setPaciente({
        id: 'pac-123',
        nombres: 'Carlos Eduardo',
        apellidos: 'López',
        documento: 'V-12345678',
        nivelCuenta: 'BASICO',
        estadoIdentidad: 'PROVISIONAL',
        tieneDocFisico: false,
      });
      setLoading(false);
    }, 600);
  };

  const validarPresencialmente = () => {
    setValidando(true);
    // Simular llamada al endpoint de validación
    // POST /api/v1/admin/pacientes/:id/validar
    setTimeout(() => {
      setPaciente({ ...paciente, nivelCuenta: 'COMPLETO', estadoIdentidad: 'VERIFICADO' });
      setValidando(false);
      alert('Paciente validado exitosamente. Ahora tiene nivel COMPLETO.');
    }, 800);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Validación Presencial de Identidad</h1>
      <p className="text-gray-600 mb-6">Valide la cédula original del paciente para elevar su cuenta de BÁSICA a COMPLETA.</p>

      <Card className="p-6 max-w-2xl mb-6">
        <form onSubmit={buscarPaciente} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Cédula del Paciente</label>
            <Input 
              value={cedula} 
              onChange={(e) => setCedula(e.target.value)} 
              placeholder="Ej: V-12345678" 
              required 
            />
          </div>
          <Button type="submit" isLoading={loading}>Buscar</Button>
        </form>
      </Card>

      {paciente && (
        <Card className="p-6 max-w-2xl">
          <div className="flex justify-between items-start border-b pb-4 mb-4">
            <div>
              <h2 className="text-xl font-bold">{paciente.nombres} {paciente.apellidos}</h2>
              <p className="text-gray-500">C.I: {paciente.documento}</p>
            </div>
            <Badge variant={paciente.nivelCuenta === 'COMPLETO' ? 'success' : 'warning'}>
              NIVEL: {paciente.nivelCuenta}
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm border border-blue-200">
              <h3 className="font-bold mb-2">Lista de verificación del personal:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>El paciente está presente físicamente en el establecimiento.</li>
                <li>Se presentó la Cédula de Identidad original (no copia, no foto).</li>
                <li>La fotografía del documento coincide con el paciente.</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button 
                onClick={validarPresencialmente} 
                disabled={paciente.nivelCuenta === 'COMPLETO'}
                isLoading={validando}
              >
                ✓ Confirmar Validación Presencial
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
