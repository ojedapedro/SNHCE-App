import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, Badge, Button, Spinner } from '@snhce/ui';
import { ConnectionBanner } from '../components/ConnectionBanner';

interface ProximaCita {
  id: string;
  fechaHora: string;
  especialidad: string;
  establecimiento: string;
  estado: string;
}

interface DatosPaciente {
  nombres: string;
  nivelCuenta: 'BASICO' | 'COMPLETO';
  mfaActivo: boolean;
  proximaCita: ProximaCita | null;
}

// Componente: Banner de verificación de cuenta
function BannerVerificacion({ nivelCuenta }: { nivelCuenta: 'BASICO' | 'COMPLETO' }) {
  if (nivelCuenta === 'COMPLETO') return null;

  return (
    <div
      role="status"
      className="rounded-lg border border-amber-200 bg-amber-50 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="text-amber-600 text-xl mt-0.5" aria-hidden="true">⚠️</span>
        <div>
          <h3 className="font-semibold text-amber-800">Cuenta en nivel básico</h3>
          <p className="mt-1 text-sm text-amber-700">
            Con su cuenta actual puede solicitar y gestionar citas médicas. Para consultar
            su historia clínica completa, debe{' '}
            <strong>validar su identidad presencialmente</strong> en cualquier
            establecimiento de salud de la red pública.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs text-amber-700">
              <span className="text-green-600">✅</span> Solicitar citas en línea
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-700">
              <span className="text-green-600">✅</span> Ver mis citas
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span>🔒</span> Ver historia clínica (requiere validación presencial)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente: Tarjeta de próxima cita
function TarjetaProximaCita({ cita }: { cita: ProximaCita | null }) {
  if (!cita) {
    return (
      <Card>
        <div className="p-5 text-center">
          <p className="text-4xl mb-3">📅</p>
          <h3 className="font-medium text-gray-700">No tiene citas próximas</h3>
          <p className="mt-1 text-sm text-gray-500">Solicite una cita médica en línea</p>
          <Button asChild className="mt-4">
            <Link to="/citas/nueva">Solicitar cita</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const fecha = new Date(cita.fechaHora);
  const opciones: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-gray-800">Próxima cita</h3>
          <Badge variant={cita.estado === 'CONFIRMADA' ? 'success' : 'warning'}>
            {cita.estado === 'CONFIRMADA' ? 'Confirmada' : 'Pendiente'}
          </Badge>
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Especialidad:</span> {cita.especialidad}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Centro:</span> {cita.establecimiento}
          </p>
          <p className="mt-2 text-base font-medium text-blue-700">
            📅 {fecha.toLocaleDateString('es-VE', opciones)}
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/citas">Ver mis citas</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Componente: Accesos rápidos
function AccesosRapidos({ nivelCuenta }: { nivelCuenta: 'BASICO' | 'COMPLETO' }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Link
        to="/citas/nueva"
        className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="text-2xl mb-2" aria-hidden="true">🗓️</span>
        <span className="text-sm font-medium text-gray-700">Solicitar cita</span>
      </Link>

      <Link
        to="/citas"
        className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="text-2xl mb-2" aria-hidden="true">📋</span>
        <span className="text-sm font-medium text-gray-700">Mis citas</span>
      </Link>

      {nivelCuenta === 'COMPLETO' ? (
        <Link
          to="/historia"
          className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className="text-2xl mb-2" aria-hidden="true">📁</span>
          <span className="text-sm font-medium text-gray-700">Mi historia</span>
        </Link>
      ) : (
        <div
          className="flex flex-col items-center rounded-lg border border-gray-100 bg-gray-50 p-4 text-center opacity-60 cursor-not-allowed"
          aria-label="Mi historia — requiere validación presencial"
          title="Requiere validación presencial de identidad"
        >
          <span className="text-2xl mb-2" aria-hidden="true">🔒</span>
          <span className="text-sm font-medium text-gray-500">Mi historia</span>
        </div>
      )}

      <Link
        to="/accesos"
        className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="text-2xl mb-2" aria-hidden="true">👁️</span>
        <span className="text-sm font-medium text-gray-700">¿Quién vio mi historia?</span>
      </Link>

      <Link
        to="/perfil"
        className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="text-2xl mb-2" aria-hidden="true">⚙️</span>
        <span className="text-sm font-medium text-gray-700">Perfil y seguridad</span>
      </Link>

      <Link
        to="/ayuda"
        className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="text-2xl mb-2" aria-hidden="true">❓</span>
        <span className="text-sm font-medium text-gray-700">Ayuda</span>
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<DatosPaciente>({
    queryKey: ['paciente', 'me'],
    queryFn: async () => {
      // TODO: Conectar con /api/v1/pacientes/me
      // Datos simulados para desarrollo
      await new Promise((r) => setTimeout(r, 400));
      return {
        nombres: 'María Gabriela',
        nivelCuenta: 'BASICO',
        mfaActivo: true,
        proximaCita: {
          id: 'cita-001',
          fechaHora: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          especialidad: 'Medicina Interna',
          establecimiento: 'Hospital General Dr. José Ignacio Baldó',
          estado: 'CONFIRMADA',
        },
      };
    },
  });

  const horaActual = new Date().getHours();
  const saludo =
    horaActual < 12 ? 'Buenos días' : horaActual < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="min-h-screen bg-gray-50">
      <ConnectionBanner />

      {/* Header */}
      <header className="bg-blue-700 px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            {isLoading ? (
              <div className="h-6 w-32 animate-pulse rounded bg-blue-600" />
            ) : (
              <h1 className="text-lg font-semibold">
                {saludo}, {data?.nombres ?? 'Paciente'}
              </h1>
            )}
            <p className="text-xs text-blue-200 mt-0.5">Portal del Paciente — SNHCE</p>
          </div>
          <Link
            to="/perfil"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Ir a mi perfil"
          >
            👤
          </Link>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5" id="main-content">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Spinner aria-label="Cargando información..." />
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Ocurrió un error al cargar su información. Por favor recargue la página.
          </div>
        )}

        {data && (
          <>
            <BannerVerificacion nivelCuenta={data.nivelCuenta} />
            <TarjetaProximaCita cita={data.proximaCita} />

            <section aria-labelledby="accesos-rapidos-titulo">
              <h2 id="accesos-rapidos-titulo" className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
                Accesos rápidos
              </h2>
              <AccesosRapidos nivelCuenta={data.nivelCuenta} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
