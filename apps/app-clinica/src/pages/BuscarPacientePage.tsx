import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label, Card } from '@snhce/ui';

const buscarSchema = z.object({
  tipoDocumento: z.enum(['CEDULA_VE', 'RNE', 'PASAPORTE', 'CEDULA_MADRE_HIJO', 'PROVISIONAL']),
  nroDocumento: z.string().min(5, 'Ingrese un número válido').regex(/^[\d.\-A-Za-z]+$/),
});

type BuscarForm = z.infer<typeof buscarSchema>;

export default function BuscarPacientePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<BuscarForm>({
    resolver: zodResolver(buscarSchema),
    defaultValues: { tipoDocumento: 'CEDULA_VE', nroDocumento: '' },
  });

  const onSubmit = async (data: BuscarForm) => {
    setIsLoading(true);
    setError(null);
    try {
      // 🔒 SEGURIDAD: La búsqueda SIEMPRE se hace por POST
      // El documento NUNCA viaja en la URL
      // const res = await api.post('/pacientes/buscar', data);
      
      // Simulación de respuesta exitosa del backend
      await new Promise((r) => setTimeout(r, 600));
      const res = { data: { encontrado: true, opaqueId: 'opq-abc-123', estadoIdentidad: 'VERIFICADO' } };

      if (res.data.encontrado) {
        // Redirigir usando el ID opaco de sesión, NUNCA la cédula ni el UUID
        navigate(`/paciente/${res.data.opaqueId}/resumen`);
      } else {
        setError('Paciente no encontrado en el Índice Maestro (MPI). Verifique el número ingresado.');
      }
    } catch (err) {
      setError('Ocurrió un error al realizar la búsqueda. Por favor intente de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Buscar Paciente</h1>
            <p className="text-xs text-gray-500">Aplicación Clínica — SNHCE</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            Volver a la Agenda
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xl">
                🔍
              </div>
              <h2 className="text-xl font-bold text-gray-800">Búsqueda en MPI</h2>
              <p className="text-sm text-gray-500 mt-1">Índice Maestro de Pacientes</p>
            </div>

            {error && (
              <div role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="mb-4">
                <Label htmlFor="tipo">Tipo de documento</Label>
                <select
                  id="tipo"
                  {...register('tipoDocumento')}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="CEDULA_VE">V — Venezolano/a</option>
                  <option value="RNE">E — Extranjero/a (RNE)</option>
                  <option value="PASAPORTE">P — Pasaporte</option>
                  <option value="CEDULA_MADRE_HIJO">M — Cédula Madre + Correlativo</option>
                  <option value="PROVISIONAL">PR — Registro Provisional</option>
                </select>
              </div>

              <div className="mb-6">
                <Label htmlFor="nro">Número de documento</Label>
                <Input
                  id="nro"
                  type="text"
                  placeholder="Ej: 12345678"
                  className="mt-1"
                  autoFocus
                  {...register('nroDocumento')}
                />
                {errors.nroDocumento && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {errors.nroDocumento.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
                Buscar Paciente
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-400">
                Toda búsqueda queda registrada en la bitácora de auditoría.
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
