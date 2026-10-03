import React, { useState } from 'react';
import { Card, Button, Badge } from '@snhce/ui';
import { useNavigate } from 'react-router-dom';

export default function ConsentimientosPage() {
  const navigate = useNavigate();

  const [consentimientos, setConsentimientos] = useState([
    {
      id: 'c1',
      tipo: 'TRATAMIENTO_DATOS',
      titulo: 'Tratamiento de Datos Personales de Salud',
      descripcion: 'Autorizo al SNHCE a procesar mis datos personales y de salud para los fines exclusivos de atención médica en la red pública venezolana, de acuerdo con la Ley de Protección de Datos Personales.',
      version: 'v2.1 — 01/01/2024',
      otorgado: true,
      fechaOtorgamiento: '14/02/2024',
      revocable: false,
      motivoNoRevocable: 'Este consentimiento es obligatorio para recibir atención médica en la red SNHCE.',
    },
    {
      id: 'c2',
      tipo: 'INVESTIGACION',
      titulo: 'Participación en Investigación Epidemiológica (Anónima)',
      descripcion: 'Autorizo el uso de mis datos de salud seudonimizados (sin identificadores directos) para estudios estadísticos y epidemiológicos del Ministerio de Salud. Su nombre, cédula y datos de contacto NUNCA serán compartidos.',
      version: 'v1.0 — 01/06/2023',
      otorgado: true,
      fechaOtorgamiento: '14/02/2024',
      revocable: true,
    },
    {
      id: 'c3',
      tipo: 'ACCESO_HISTORIA',
      titulo: 'Compartir Historia con Médicos de Otros Centros',
      descripcion: 'Permito que cualquier médico con relación asistencial activa en cualquier centro de la red pública pueda acceder a mi historia clínica completa.',
      version: 'v1.3 — 15/03/2024',
      otorgado: true,
      fechaOtorgamiento: '14/02/2024',
      revocable: true,
    },
  ]);

  const revocar = (id: string) => {
    if (!confirm('¿Está seguro de que desea revocar este consentimiento? Esto puede limitar la atención médica que puede recibir.')) return;
    setConsentimientos(prev =>
      prev.map(c => c.id === id ? { ...c, otorgado: false, fechaRevocacion: new Date().toLocaleDateString('es-VE') } : c)
    );
    alert('Consentimiento revocado. El cambio ha sido registrado en la bitácora con fecha y hora.');
  };

  const iconoTipo: Record<string, string> = {
    TRATAMIENTO_DATOS: '🔒',
    INVESTIGACION: '🔬',
    ACCESO_HISTORIA: '🏥',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-700 px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Mis Consentimientos</h1>
            <p className="text-blue-200 text-sm">Gestione cómo se usan sus datos de salud</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="bg-blue-600 border-blue-500 text-white hover:bg-blue-500">
            Volver
          </Button>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-3xl w-full p-4 md:py-8 space-y-5">
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md text-sm">
          <strong>Sus derechos:</strong> Puede revocar los consentimientos marcados como revocables en cualquier momento. La revocación queda registrada de forma inmutable en la bitácora de auditoría.
        </div>

        {consentimientos.map((c) => {
          const vigente = c.otorgado && !(c as any).fechaRevocacion;
          return (
            <Card key={c.id} className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{iconoTipo[c.tipo]}</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{c.titulo}</h3>
                    <p className="text-xs text-gray-400">Versión del documento: {c.version}</p>
                  </div>
                </div>
                <Badge variant={vigente ? 'success' : 'default'}>
                  {vigente ? 'Otorgado' : 'Revocado'}
                </Badge>
              </div>

              <p className="text-sm text-gray-600 mb-4">{c.descripcion}</p>

              <div className="pt-3 border-t border-gray-100">
                {vigente ? (
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-400">Otorgado el: {c.fechaOtorgamiento}</p>
                    {c.revocable ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => revocar(c.id)}
                      >
                        Revocar Consentimiento
                      </Button>
                    ) : (
                      <p className="text-xs text-gray-400 italic max-w-xs text-right">{c.motivoNoRevocable}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-red-500">
                    Revocado el: {(c as any).fechaRevocacion}. Para reactivarlo, diríjase a cualquier establecimiento de la red.
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </main>
    </div>
  );
}
