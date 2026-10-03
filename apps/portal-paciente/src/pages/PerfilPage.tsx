import React, { useState } from 'react';
import { Card, Button, Badge } from '@snhce/ui';
import { useNavigate } from 'react-router-dom';

export default function PerfilPage() {
  const navigate = useNavigate();
  // Simulación de datos de sesión. En la realidad vendría de Zustand/AuthContext
  const [user] = useState({
    nombres: 'María Alejandra',
    apellidos: 'Pérez González',
    documento: 'V-12345678',
    nivelCuenta: 'BASICO', // Puede ser BASICO o COMPLETO
    mfaActivo: true,
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-700 px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-lg font-semibold">Perfil y Seguridad</h1>
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="bg-blue-600 border-blue-500 hover:bg-blue-500 text-white hover:text-white">
            Volver
          </Button>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-3xl w-full p-4 md:py-8 space-y-6">
        <Card className="p-6">
          <div className="flex items-start justify-between border-b pb-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.nombres} {user.apellidos}</h2>
              <p className="text-sm text-gray-500">C.I: {user.documento}</p>
            </div>
            <Badge variant={user.nivelCuenta === 'COMPLETO' ? 'success' : 'warning'} className="text-xs uppercase">
              Cuenta {user.nivelCuenta}
            </Badge>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Nivel de Acceso</h3>
              {user.nivelCuenta === 'BASICO' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-800">
                  <p className="font-semibold mb-1">Limitado (Solo solicitud de citas)</p>
                  <p>
                    Para acceder a su historia clínica completa, diagnósticos y reportes, debe realizar el proceso de 
                    <strong> Validación de Identidad Presencial</strong>. Acérquese a cualquier establecimiento de salud 
                    de la red pública con su cédula laminada original para que el personal administrativo active su cuenta al nivel COMPLETO.
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 text-sm text-green-800">
                  <p className="font-semibold">Acceso Completo (Verificado)</p>
                  <p>Su identidad ha sido validada mediante biometría o de forma presencial. Tiene acceso a su historia clínica completa.</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Seguridad</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Autenticación de dos pasos (MFA)</p>
                <p className="text-sm text-gray-500">Protege su cuenta médica exigiendo un código temporal al iniciar sesión.</p>
              </div>
              <div>
                {user.mfaActivo ? (
                  <Badge variant="success">Activado</Badge>
                ) : (
                  <Button size="sm">Configurar</Button>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Auditoría de Accesos</p>
                <p className="text-sm text-gray-500">Revise qué médicos han consultado su historia clínica.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/historia/accesos')} disabled={user.nivelCuenta === 'BASICO'}>
                Ver Bitácora
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
