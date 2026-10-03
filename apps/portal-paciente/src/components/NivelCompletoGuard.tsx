import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

/**
 * Guard para rutas que requieren cuenta en nivel COMPLETO (validación presencial).
 * Si el paciente está en nivel BÁSICO, muestra una página explicativa
 * en lugar de la historia clínica.
 */
export function NivelCompletoGuard() {
  const { usuario } = useAuthStore();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (usuario.nivelCuenta !== 'COMPLETO') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-3xl">
            🔒
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Validación de identidad requerida
          </h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Para consultar su historia clínica electrónica, debe validar su identidad
            presencialmente en cualquier establecimiento de salud de la red pública.
          </p>

          <div className="rounded-lg border border-gray-200 bg-white p-5 text-left space-y-3 mb-6">
            <h2 className="font-semibold text-gray-800">¿Cómo activar el acceso completo?</h2>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">1</span>
                Acuda a cualquier hospital, CDI, ambulatorio o módulo de Barrio Adentro de la red pública.
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">2</span>
                Muestre su cédula de identidad o documento original al personal de admisión.
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">3</span>
                El personal validará su identidad en el sistema. El proceso toma menos de 5 minutos.
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">4</span>
                Su cuenta será elevada a nivel Completo y podrá consultar su historia en línea.
              </li>
            </ol>
          </div>

          <a
            href="/ayuda"
            className="text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            Más información en el Centro de Ayuda →
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
