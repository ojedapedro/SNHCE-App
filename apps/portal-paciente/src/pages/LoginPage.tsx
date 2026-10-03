import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button, Input, Label, Card } from '@snhce/ui';
import { ConnectionBanner } from '../components/ConnectionBanner';

type Paso = 'credenciales' | 'mfa';

const credencialesSchema = z.object({
  tipoDocumento: z.enum(['V', 'E', 'P', 'J'], {
    required_error: 'Seleccione el tipo de documento',
  }),
  nroDocumento: z
    .string()
    .min(5, 'El número de documento debe tener al menos 5 caracteres')
    .max(15, 'El número de documento no puede tener más de 15 caracteres')
    .regex(/^[\d.-]+$/, 'Solo se permiten números, puntos y guiones'),
  contrasena: z.string().min(1, 'La contraseña es obligatoria'),
});

const mfaSchema = z.object({
  codigoMfa: z
    .string()
    .length(6, 'El código debe tener exactamente 6 dígitos')
    .regex(/^\d{6}$/, 'Solo se permiten dígitos'),
});

type CredencialesForm = z.infer<typeof credencialesSchema>;
type MfaForm = z.infer<typeof mfaSchema>;

export default function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [paso, setPaso] = useState<Paso>('credenciales');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const credencialesForm = useForm<CredencialesForm>({
    resolver: zodResolver(credencialesSchema),
    defaultValues: { tipoDocumento: 'V', nroDocumento: '', contrasena: '' },
  });

  const mfaForm = useForm<MfaForm>({
    resolver: zodResolver(mfaSchema),
  });

  const handleCredenciales = async (data: CredencialesForm) => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Llamar al backend /api/v1/auth/login
      // Por ahora simula la llamada
      await new Promise((r) => setTimeout(r, 800));
      // Si el usuario tiene MFA activo (que es obligatorio), ir al paso MFA
      setPaso('mfa');
    } catch (err: any) {
      setError(err?.response?.data?.message || t('login.errorCredenciales', 'Documento o contraseña incorrectos'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfa = async (data: MfaForm) => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Verificar código MFA con el backend
      await new Promise((r) => setTimeout(r, 600));
      navigate('/');
    } catch (err: any) {
      setError(t('login.errorMfa', 'Código de verificación incorrecto o expirado'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <ConnectionBanner />

      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* Logo e identificación del sistema */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-700 text-white text-2xl font-bold shadow-lg">
            ⚕
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SNHCE</h1>
          <p className="mt-1 text-sm text-gray-600">Sistema Nacional de Historia Clínica Electrónica</p>
        </div>

        <Card className="w-full max-w-md shadow-lg">
          <div className="p-6 sm:p-8">
            {paso === 'credenciales' ? (
              <>
                <h2 className="mb-1 text-xl font-semibold text-gray-900">{t('login.titulo')}</h2>
                <p className="mb-6 text-sm text-gray-500">{t('login.subtitulo')}</p>

                {error && (
                  <div
                    role="alert"
                    className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={credencialesForm.handleSubmit(handleCredenciales)} noValidate>
                  {/* Tipo y número de documento */}
                  <div className="mb-4">
                    <Label htmlFor="tipoDocumento">Tipo de documento</Label>
                    <div className="mt-1 flex gap-2">
                      <select
                        id="tipoDocumento"
                        {...credencialesForm.register('tipoDocumento')}
                        className="w-20 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        aria-label="Tipo de documento"
                      >
                        <option value="V">V</option>
                        <option value="E">E</option>
                        <option value="P">P</option>
                        <option value="J">J</option>
                      </select>
                      <div className="flex-1">
                        <Input
                          id="nroDocumento"
                          type="text"
                          inputMode="numeric"
                          placeholder="12.345.678"
                          {...credencialesForm.register('nroDocumento')}
                          aria-invalid={!!credencialesForm.formState.errors.nroDocumento}
                          aria-describedby="nroDocumento-error"
                        />
                        {credencialesForm.formState.errors.nroDocumento && (
                          <p id="nroDocumento-error" className="mt-1 text-xs text-red-600" role="alert">
                            {credencialesForm.formState.errors.nroDocumento.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contraseña */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="contrasena">Contraseña</Label>
                      <Link
                        to="/recuperar-acceso"
                        className="text-xs text-blue-600 hover:underline focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        ¿Olvidó su contraseña?
                      </Link>
                    </div>
                    <div className="mt-1">
                      <Input
                        id="contrasena"
                        type="password"
                        autoComplete="current-password"
                        {...credencialesForm.register('contrasena')}
                        aria-invalid={!!credencialesForm.formState.errors.contrasena}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" isLoading={isLoading}>
                    Iniciar Sesión
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                  ¿No tiene cuenta?{' '}
                  <Link to="/registro" className="font-medium text-blue-600 hover:underline">
                    Regístrese aquí
                  </Link>
                </p>
              </>
            ) : (
              <>
                <h2 className="mb-1 text-xl font-semibold text-gray-900">Verificación de dos pasos</h2>
                <p className="mb-6 text-sm text-gray-500">
                  Ingrese el código de 6 dígitos de su aplicación autenticadora para continuar.
                </p>

                {error && (
                  <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={mfaForm.handleSubmit(handleMfa)} noValidate>
                  <div className="mb-6">
                    <Label htmlFor="codigoMfa">Código de verificación</Label>
                    <div className="mt-1">
                      <Input
                        id="codigoMfa"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        autoFocus
                        autoComplete="one-time-code"
                        className="text-center text-2xl tracking-widest"
                        {...mfaForm.register('codigoMfa')}
                        aria-invalid={!!mfaForm.formState.errors.codigoMfa}
                        aria-describedby="codigoMfa-error"
                      />
                      {mfaForm.formState.errors.codigoMfa && (
                        <p id="codigoMfa-error" className="mt-1 text-xs text-red-600" role="alert">
                          {mfaForm.formState.errors.codigoMfa.message}
                        </p>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      El código cambia cada 30 segundos. Si no tiene configurada su aplicación autenticadora,
                      contacte al soporte del sistema.
                    </p>
                  </div>

                  <Button type="submit" className="w-full" isLoading={isLoading}>
                    Verificar
                  </Button>
                </form>

                <button
                  type="button"
                  onClick={() => { setPaso('credenciales'); setError(null); }}
                  className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  ← Volver
                </button>
              </>
            )}
          </div>
        </Card>

        <p className="mt-8 text-center text-xs text-gray-400">
          Ministerio del Poder Popular para la Salud · Venezuela
        </p>
      </main>
    </div>
  );
}
