import React, { useState } from 'react';
import { Dialog } from '@snhce/ui';
import { Button, Input, Label } from '@snhce/ui';

interface AccesoEmergenciaModalProps {
  opaqueId: string;
  onClose: () => void;
  onConfirm: (opaqueId: string) => void;
}

const MIN_JUSTIFICACION = 30;

/**
 * Modal de Acceso de Emergencia (Break-Glass).
 *
 * Flujo:
 * 1. El médico ve la advertencia clara sobre auditoría
 * 2. Escribe una justificación obligatoria (mínimo 30 caracteres)
 * 3. Marca el checkbox de declaración
 * 4. Confirma → backend registra en bitácora y genera alerta
 * 5. Se abre el resumen clínico con banner 🚨 EMERGENCIA
 */
export function AccesoEmergenciaModal({
  opaqueId,
  onClose,
  onConfirm,
}: AccesoEmergenciaModalProps) {
  const [justificacion, setJustificacion] = useState('');
  const [declarado, setDeclarado] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charsRestantes = MIN_JUSTIFICACION - justificacion.trim().length;
  const puedeConfirmar =
    justificacion.trim().length >= MIN_JUSTIFICACION && declarado;

  const handleConfirmar = async () => {
    if (!puedeConfirmar) return;
    setIsLoading(true);
    setError(null);

    try {
      // Registrar el acceso de emergencia en el backend
      // El backend valida y genera la entrada de auditoría inmediatamente
      // TODO: await api.post(`/episodios/acceso-emergencia`, { opaqueId, justificacion });
      await new Promise((r) => setTimeout(r, 800));
      onConfirm(opaqueId);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          'Error al registrar el acceso de emergencia. Intente de nuevo.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergencia-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header rojo de advertencia */}
        <div className="rounded-t-xl bg-red-600 px-6 py-4">
          <h2
            id="emergencia-titulo"
            className="flex items-center gap-2 text-lg font-bold text-white"
          >
            <span aria-hidden="true">🚨</span> Acceso de Emergencia
          </h2>
          <p className="mt-1 text-sm text-red-100">
            Este acceso es auditado. Se generará una alerta al comité de auditoría.
          </p>
        </div>

        <div className="px-6 py-5">
          {/* Advertencias */}
          <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            <ul className="space-y-1">
              <li>• Este acceso queda registrado con su nombre, hora, centro e IP</li>
              <li>• Se notificará automáticamente al comité de auditoría</li>
              <li>• El acceso es temporal y se revisa obligatoriamente</li>
              <li>• El paciente podrá ver este acceso en su portal</li>
            </ul>
          </div>

          {/* Justificación */}
          <div className="mb-4">
            <Label htmlFor="justificacion-emergencia">
              Justificación médica <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="justificacion-emergencia"
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              rows={3}
              placeholder="Describa la razón clínica de este acceso de emergencia. Ejemplo: Paciente inconsciente ingresado por guardia, requiero revisar alergias y medicación activa antes de administrar tratamiento."
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              aria-required="true"
              aria-describedby="justificacion-counter"
            />
            <p
              id="justificacion-counter"
              className={`mt-1 text-xs ${charsRestantes > 0 ? 'text-red-500' : 'text-green-600'}`}
            >
              {charsRestantes > 0
                ? `Faltan ${charsRestantes} caracteres mínimos`
                : `✓ Justificación suficiente (${justificacion.trim().length} caracteres)`}
            </p>
          </div>

          {/* Checkbox de declaración */}
          <label className="mb-5 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={declarado}
              onChange={(e) => setDeclarado(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              aria-required="true"
            />
            <span className="text-sm text-gray-700">
              <strong>Declaro</strong> que este es un acceso de emergencia médica justificado y
              comprendo que queda registrado en la bitácora de auditoría.
            </span>
          </label>

          {error && (
            <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmar}
              disabled={!puedeConfirmar || isLoading}
              isLoading={isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300"
            >
              Confirmar acceso de emergencia
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
