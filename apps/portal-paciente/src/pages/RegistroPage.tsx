import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label, Card } from '@snhce/ui';
import { ConnectionBanner } from '../components/ConnectionBanner';

// Pasos del formulario de registro
type Paso = 1 | 2 | 3 | 4 | 5;

// ============================================================
// Paso 1: Tipo y número de documento
// ============================================================
const paso1Schema = z.object({
  tipoDocumento: z.enum(['V', 'E', 'P', 'J']),
  nroDocumento: z.string().min(5).max(15).regex(/^[\d.\-]+$/),
});

// ============================================================
// Paso 2: Datos personales
// ============================================================
const paso2Schema = z.object({
  nombres: z.string().min(2, 'Ingrese su(s) nombre(s)').max(100),
  apellidos: z.string().min(2, 'Ingrese su(s) apellido(s)').max(100),
  fechaNacimiento: z.string().refine((d) => {
    const fecha = new Date(d);
    const hoy = new Date();
    const edad = hoy.getFullYear() - fecha.getFullYear();
    return edad >= 0 && edad <= 130;
  }, 'Fecha de nacimiento inválida'),
  sexo: z.enum(['MASCULINO', 'FEMENINO', 'INTERSEX', 'PREFIERO_NO_DECIR']),
});

// ============================================================
// Paso 3: Datos de contacto y contraseña
// ============================================================
const paso3Schema = z
  .object({
    telefono: z
      .string()
      .min(10, 'Ingrese un número de teléfono válido')
      .regex(/^[0-9+\-\s()]+$/),
    correo: z.string().email('Ingrese un correo electrónico válido').optional().or(z.literal('')),
    contrasena: z
      .string()
      .min(12, 'La contraseña debe tener al menos 12 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[a-z]/, 'Debe contener al menos una minúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número')
      .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
    confirmarContrasena: z.string(),
  })
  .refine((d) => d.contrasena === d.confirmarContrasena, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmarContrasena'],
  });

// ============================================================
// Indicador de progreso
// ============================================================
function IndicadorPasos({ pasoActual, total }: { pasoActual: number; total: number }) {
  return (
    <div className="flex items-center justify-between mb-8" role="progressbar" aria-valuenow={pasoActual} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => {
        const num = i + 1;
        const activo = num === pasoActual;
        const completado = num < pasoActual;
        return (
          <React.Fragment key={num}>
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold
                  ${completado ? 'bg-green-500 text-white' : activo ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}
                aria-label={`Paso ${num}${completado ? ' completado' : activo ? ' actual' : ''}`}
              >
                {completado ? '✓' : num}
              </div>
            </div>
            {i < total - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${completado ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============================================================
// Página principal de registro
// ============================================================
export default function RegistroPage() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState<Paso>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Almacena datos acumulados entre pasos (en memoria, no localStorage)
  const [datosPaso1, setDatosPaso1] = useState<z.infer<typeof paso1Schema> | null>(null);
  const [datosPaso2, setDatosPaso2] = useState<z.infer<typeof paso2Schema> | null>(null);

  const formPaso1 = useForm({ resolver: zodResolver(paso1Schema), defaultValues: { tipoDocumento: 'V' as const, nroDocumento: '' } });
  const formPaso2 = useForm({ resolver: zodResolver(paso2Schema) });
  const formPaso3 = useForm({ resolver: zodResolver(paso3Schema) });

  const titulos: Record<Paso, string> = {
    1: 'Paso 1 de 5 — Documento de identidad',
    2: 'Paso 2 de 5 — Datos personales',
    3: 'Paso 3 de 5 — Datos de contacto',
    4: 'Paso 4 de 5 — Consentimiento informado',
    5: 'Paso 5 de 5 — Verificación en dos pasos',
  };

  const handlePaso1 = async (data: z.infer<typeof paso1Schema>) => {
    setIsLoading(true);
    setError(null);
    try {
      // Verificar si ya existe un registro con este documento
      // await api.post('/pacientes/verificar-duplicado', data);
      await new Promise((r) => setTimeout(r, 500));
      setDatosPaso1(data);
      setPaso(2);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError('Ya existe una cuenta con este documento. Si olvidó su contraseña, puede recuperarla.');
      } else {
        setError('Error al verificar el documento. Intente de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaso2 = (data: z.infer<typeof paso2Schema>) => {
    setDatosPaso2(data);
    setPaso(3);
  };

  const handlePaso3 = async (data: z.infer<typeof paso3Schema>) => {
    setIsLoading(true);
    setError(null);
    try {
      // Enviar al backend para crear la cuenta
      // await api.post('/auth/registrar', { ...datosPaso1, ...datosPaso2, ...data });
      await new Promise((r) => setTimeout(r, 800));
      setPaso(4);
    } catch (err: any) {
      setError('Error al crear la cuenta. Intente de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <ConnectionBanner />
      <main className="mx-auto max-w-lg px-4 py-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-700 text-white text-xl font-bold">⚕</div>
          <h1 className="text-xl font-bold text-gray-900">Crear cuenta en SNHCE</h1>
          <p className="mt-1 text-sm text-gray-500">Portal de salud pública de Venezuela</p>
        </div>

        <Card className="shadow-lg">
          <div className="p-6">
            <IndicadorPasos pasoActual={paso} total={5} />
            <h2 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wide">{titulos[paso]}</h2>

            {error && (
              <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* ===== PASO 1: Documento ===== */}
            {paso === 1 && (
              <form onSubmit={formPaso1.handleSubmit(handlePaso1)} noValidate>
                <div className="mb-4">
                  <Label htmlFor="tipo">Tipo de documento</Label>
                  <select id="tipo" {...formPaso1.register('tipoDocumento')} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="V">V — Venezolano/a</option>
                    <option value="E">E — Extranjero/a (RNE)</option>
                    <option value="P">P — Pasaporte</option>
                    <option value="J">J — Jurídico</option>
                  </select>
                </div>
                <div className="mb-6">
                  <Label htmlFor="nro">Número de documento</Label>
                  <Input id="nro" type="text" inputMode="numeric" placeholder="12.345.678" {...formPaso1.register('nroDocumento')} className="mt-1" />
                  {formPaso1.formState.errors.nroDocumento && <p className="mt-1 text-xs text-red-600" role="alert">{formPaso1.formState.errors.nroDocumento.message}</p>}
                </div>
                <Button type="submit" className="w-full" isLoading={isLoading}>Continuar →</Button>
              </form>
            )}

            {/* ===== PASO 2: Datos personales ===== */}
            {paso === 2 && (
              <form onSubmit={formPaso2.handleSubmit(handlePaso2)} noValidate>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <Label htmlFor="nombres">Nombres</Label>
                    <Input id="nombres" {...formPaso2.register('nombres')} className="mt-1" />
                    {formPaso2.formState.errors.nombres && <p className="mt-1 text-xs text-red-600">{formPaso2.formState.errors.nombres.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="apellidos">Apellidos</Label>
                    <Input id="apellidos" {...formPaso2.register('apellidos')} className="mt-1" />
                  </div>
                </div>
                <div className="mb-4">
                  <Label htmlFor="fechaNac">Fecha de nacimiento</Label>
                  <Input id="fechaNac" type="date" {...formPaso2.register('fechaNacimiento')} className="mt-1" />
                </div>
                <div className="mb-6">
                  <Label htmlFor="sexo">Sexo biológico</Label>
                  <select id="sexo" {...formPaso2.register('sexo')} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    <option value="">Seleccione...</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMENINO">Femenino</option>
                    <option value="INTERSEX">Intersex</option>
                    <option value="PREFIERO_NO_DECIR">Prefiero no decir</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setPaso(1)} className="flex-1">← Atrás</Button>
                  <Button type="submit" className="flex-1">Continuar →</Button>
                </div>
              </form>
            )}

            {/* ===== PASO 3: Contacto y contraseña ===== */}
            {paso === 3 && (
              <form onSubmit={formPaso3.handleSubmit(handlePaso3)} noValidate>
                <div className="mb-4">
                  <Label htmlFor="tel">Teléfono de contacto</Label>
                  <Input id="tel" type="tel" placeholder="0412-1234567" {...formPaso3.register('telefono')} className="mt-1" />
                  {formPaso3.formState.errors.telefono && <p className="mt-1 text-xs text-red-600">{formPaso3.formState.errors.telefono.message}</p>}
                </div>
                <div className="mb-4">
                  <Label htmlFor="correo">Correo electrónico (opcional)</Label>
                  <Input id="correo" type="email" placeholder="correo@ejemplo.com" {...formPaso3.register('correo')} className="mt-1" />
                </div>
                <div className="mb-3">
                  <Label htmlFor="pass">Contraseña</Label>
                  <Input id="pass" type="password" {...formPaso3.register('contrasena')} className="mt-1" />
                  <p className="mt-1 text-xs text-gray-500">Mínimo 12 caracteres con mayúsculas, minúsculas, números y símbolos</p>
                  {formPaso3.formState.errors.contrasena && <p className="mt-1 text-xs text-red-600">{formPaso3.formState.errors.contrasena.message}</p>}
                </div>
                <div className="mb-6">
                  <Label htmlFor="pass2">Confirmar contraseña</Label>
                  <Input id="pass2" type="password" {...formPaso3.register('confirmarContrasena')} className="mt-1" />
                  {formPaso3.formState.errors.confirmarContrasena && <p className="mt-1 text-xs text-red-600">{formPaso3.formState.errors.confirmarContrasena.message}</p>}
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setPaso(2)} className="flex-1">← Atrás</Button>
                  <Button type="submit" className="flex-1" isLoading={isLoading}>Continuar →</Button>
                </div>
              </form>
            )}

            {/* ===== PASO 4: Consentimiento ===== */}
            {paso === 4 && (
              <div>
                <div className="mb-4 max-h-52 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 leading-relaxed">
                  <strong>Consentimiento para el tratamiento de datos personales</strong>
                  <p className="mt-2">Al registrarse en el SNHCE, usted autoriza al Ministerio del Poder Popular para la Salud (MPPS) de Venezuela a recopilar, almacenar y procesar sus datos de salud con las siguientes finalidades:</p>
                  <ul className="mt-2 list-disc pl-4 space-y-1">
                    <li>Crear y mantener su historia clínica electrónica</li>
                    <li>Coordinar su atención en la red pública de salud</li>
                    <li>Generar estadísticas de salud pública (datos anonimizados)</li>
                    <li>Recordarle citas y enviarle información de salud relevante</li>
                  </ul>
                  <p className="mt-2">Sus datos están protegidos según la Ley Orgánica de Protección de Datos Personales de Venezuela. Puede solicitar corrección o acceso a sus datos en cualquier momento.</p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer mb-6">
                  <input type="checkbox" id="consentimiento" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" required />
                  <span className="text-sm text-gray-700">Acepto el tratamiento de mis datos personales de salud según las condiciones descritas anteriormente.</span>
                </label>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setPaso(3)} className="flex-1">← Atrás</Button>
                  <Button type="button" className="flex-1" onClick={() => setPaso(5)}>Aceptar y continuar →</Button>
                </div>
              </div>
            )}

            {/* ===== PASO 5: Configurar MFA ===== */}
            {paso === 5 && (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 text-3xl">🛡️</div>
                <h3 className="font-semibold text-gray-800 mb-2">Configure su autenticador</h3>
                <p className="text-sm text-gray-600 mb-4">Escanee el código QR con Google Authenticator, Authy u otra aplicación compatible. Luego ingrese el código de 6 dígitos para confirmar.</p>
                {/* Placeholder QR — en producción viene del backend */}
                <div className="mx-auto mb-4 h-40 w-40 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">QR de Keycloak</div>
                <Input type="text" inputMode="numeric" maxLength={6} placeholder="000000" className="text-center text-xl tracking-widest mb-4" />
                <Button className="w-full" onClick={() => { navigate('/'); }}>Completar registro</Button>
                <p className="mt-4 text-xs text-gray-500">Su cuenta ha sido creada en nivel <strong>Básico</strong>. Para acceder a su historia clínica, valide su identidad en un establecimiento de salud.</p>
              </div>
            )}
          </div>
        </Card>

        <p className="mt-6 text-center text-sm text-gray-600">
          ¿Ya tiene cuenta?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:underline">
            Inicie sesión aquí
          </Link>
        </p>
      </main>
    </div>
  );
}
